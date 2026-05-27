import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createAdminClient } from "../shared/helper";
import { SESSIONS, DEFAULT_SESSION_SLUG } from "./config";

const CLAUDE_PATH = process.env.CLAUDE_CLI_PATH || "claude";

type DifficultyLevel = "normal" | "hard";

type GeneratedContent = {
  title: string;
  summary: string;
  content: string;
};

function callClaude(prompt: string): string {
  const tmpFile = path.join(
    os.tmpdir(),
    `gen-contents-${Date.now()}.txt`
  );
  fs.writeFileSync(tmpFile, prompt, "utf-8");

  try {
    const env = { ...process.env };
    delete env.CLAUDECODE;
    delete env.CLAUDE_CODE;

    const result = execSync(
      `"${CLAUDE_PATH}" --dangerously-skip-permissions -p "$(cat ${tmpFile})"`,
      {
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
        env,
        shell: "/bin/bash",
      }
    );
    return result.trim();
  } finally {
    fs.unlinkSync(tmpFile);
  }
}

function buildPrompt(
  billName: string,
  level: DifficultyLevel
): string {
  if (level === "normal") {
    return `あなたは札幌市議会の議案を市民にわかりやすく解説するアシスタントです。

以下の議案について、市民向けの解説コンテンツを作成してください。

議案名: ${billName}

## 要件
- title: 議案の内容を端的に表すタイトル（30文字以内）
- summary: 議案の概要を2〜3文で要約
- content: Markdown形式の解説文（500〜1000文字程度）
  - 背景・目的、具体的な変更内容、市民への影響を含める
  - 専門用語は避け、平易な日本語で記述
  - 見出し（##）を使って構造化

以下のJSON形式のみで出力してください（他のテキストは一切含めないこと）:
{
  "title": "...",
  "summary": "...",
  "content": "..."
}`;
  }

  return `あなたは札幌市議会の議案を詳しく解説するアシスタントです。

以下の議案について、詳細な解説コンテンツを作成してください。

議案名: ${billName}

## 要件
- title: 議案の正式名称または内容を表すタイトル（50文字以内）
- summary: 議案の要点を3〜4文で要約（法的根拠や数値を含む）
- content: Markdown形式の詳細解説（800〜1500文字程度）
  - 法的根拠・条例の該当条項
  - 財政的影響（歳出・歳入への影響）
  - 関連する国の法改正や他都市の動向
  - 見出し（##）を使って構造化

以下のJSON形式のみで出力してください（他のテキストは一切含めないこと）:
{
  "title": "...",
  "summary": "...",
  "content": "..."
}`;
}

function validateContent(content: GeneratedContent): string[] {
  const issues: string[] = [];

  if (!content.title || content.title.length === 0) {
    issues.push("titleが空");
  }
  if (!content.summary || content.summary.length === 0) {
    issues.push("summaryが空");
  }
  if (!content.content || content.content.length < 100) {
    issues.push("contentが短すぎる");
  }

  const simplifiedChineseRe = /[一-鿿]/;
  const suspiciousChars = ["议", "务", "该", "与", "为", "对"];
  for (const char of suspiciousChars) {
    if (content.content.includes(char)) {
      issues.push(`中国語簡体字の疑い: "${char}"`);
    }
  }

  return issues;
}

async function main() {
  const slug = process.argv[2] || DEFAULT_SESSION_SLUG;
  const isConfirm = process.argv.includes("--confirm");
  const session = SESSIONS[slug];

  if (!session) {
    console.error(
      `❌ 不明な会期slug: ${slug}\n利用可能: ${Object.keys(SESSIONS).join(", ")}`
    );
    process.exit(1);
  }

  console.log(
    isConfirm
      ? `🚀 generate-bill-contents: ${session.name}`
      : `🔍 DRY RUN: ${session.name}（--confirm で実投入）`
  );

  const supabase = createAdminClient();

  const { data: sessionRow } = await supabase
    .from("council_sessions")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!sessionRow) {
    console.error(
      `❌ council_sessions に slug="${slug}" が見つかりません。`
    );
    process.exit(1);
  }

  const { data: bills, error: billsError } = await supabase
    .from("bills")
    .select("id, name, bill_number")
    .eq("council_session_id", sessionRow.id)
    .eq("publish_status", "published")
    .order("bill_number");

  if (billsError || !bills) {
    console.error("❌ bills取得エラー:", billsError?.message);
    process.exit(1);
  }

  const { data: existingContents } = await supabase
    .from("bill_contents")
    .select("bill_id, difficulty_level");

  const existingSet = new Set(
    (existingContents ?? []).map(
      (c) => `${c.bill_id}_${c.difficulty_level}`
    )
  );

  const levels: DifficultyLevel[] = ["normal", "hard"];
  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (const bill of bills) {
    console.log(`\n📄 ${bill.bill_number}: ${bill.name}`);

    for (const level of levels) {
      const key = `${bill.id}_${level}`;
      if (existingSet.has(key)) {
        console.log(`  [${level}] 既存 → スキップ`);
        skipped++;
        continue;
      }

      console.log(`  [${level}] 生成中...`);

      try {
        const raw = callClaude(buildPrompt(bill.name, level));
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error(
            `  ❌ [${level}] JSONパース失敗:`,
            raw.slice(0, 100)
          );
          errors++;
          continue;
        }

        const parsed: GeneratedContent = JSON.parse(jsonMatch[0]);
        const issues = validateContent(parsed);
        if (issues.length > 0) {
          console.warn(
            `  ⚠️  [${level}] 品質問題: ${issues.join(", ")}`
          );
        }

        console.log(`  [${level}] title: ${parsed.title}`);
        console.log(
          `  [${level}] summary: ${parsed.summary.slice(0, 60)}...`
        );
        console.log(
          `  [${level}] content: ${parsed.content.length}文字`
        );

        if (!isConfirm) {
          generated++;
          continue;
        }

        const { error } = await supabase
          .from("bill_contents")
          .insert({
            bill_id: bill.id,
            difficulty_level: level,
            title: parsed.title,
            summary: parsed.summary,
            content: parsed.content,
          });

        if (error) {
          console.error(
            `  ❌ [${level}] DB投入エラー:`,
            error.message
          );
          errors++;
        } else {
          console.log(`  ✅ [${level}] DB投入完了`);
          generated++;
        }
      } catch (e) {
        console.error(`  ❌ [${level}] エラー:`, e);
        errors++;
      }
    }
  }

  console.log("\n🎉 完了");
  console.log(`  生成: ${generated} 件`);
  console.log(`  既存スキップ: ${skipped} 件`);
  console.log(`  エラー: ${errors} 件`);

  if (!isConfirm && generated > 0) {
    console.log(
      "\n💡 実際にDBに投入するには --confirm を付けて再実行してください"
    );
  }
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
