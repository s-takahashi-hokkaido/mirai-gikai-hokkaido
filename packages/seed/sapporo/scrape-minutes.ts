import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createAdminClient } from "../shared/helper";
import { SESSIONS, DEFAULT_SESSION_SLUG } from "./config";
import { fetchHtml } from "./fetcher";
import {
  countExchanges,
  extractParty,
  groupIntoDiscussions,
  htmlToText,
  parseMeetingList,
  parseMinutes,
} from "./parse-minutes";

// 議会録サイトのURL
const GIJIROKU_BASE =
  "https://sapporo.gijiroku.com/voices/CGI/voiweb.exe";
// Claude CLIのパス
const CLAUDE_PATH = process.env.CLAUDE_CLI_PATH || "claude";

// Claude CLIを呼び出す関数
function callClaude(prompt: string): string {
  // 一時ファイルを作成
  const tmpFile = path.join(
    os.tmpdir(),
    `seed-minutes-${Date.now()}.txt`
  );
  // 一時ファイルにプロンプトを書き込む
  fs.writeFileSync(tmpFile, prompt, "utf-8");

  try {
    // 環境変数を削除
    const env = { ...process.env };
    delete env.CLAUDECODE;
    delete env.CLAUDE_CODE;

    // Claude CLIを呼び出す
    const result = execSync(
      `"${CLAUDE_PATH}" --dangerously-skip-permissions -p "$(cat ${tmpFile})"`,
      {
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
        env,
        shell: "/bin/bash",
      }
    );
    // 結果を返す
    return result.trim();
  } catch (error) {
    console.error("❌ Claude CLIエラー:", error);
    throw error;
  } finally {
    fs.unlinkSync(tmpFile);
  }
}

// 要約プロンプトを作成する関数
function buildSummaryPrompt(
  questionText: string,
  answerText: string
): string {
  // プロンプトを返す
  return `あなたは札幌市議会の会議録を要約するアシスタントです。

以下は議案に関する市議会での質疑応答です。
市民が読みやすいように、それぞれ2〜3文で要約してください。

## 質問者の発言
${questionText}

## 答弁者の発言
${answerText}

以下のJSON形式のみで出力してください（他のテキストは一切含めないこと）:
{
  "question_summary": "...",
  "answer_summary": "..."
}`;
}

// メイン関数
async function main() {
  // 会期slugを取得
  const slug = process.argv[2] || DEFAULT_SESSION_SLUG;
  // ドライランフラグを取得
  const isDryRun = process.argv.includes("--dry-run");
  // 会期データを取得
  const session = SESSIONS[slug];

  // 会期データが存在しない場合はエラー
  if (!session) {
    console.error(
      `❌ 不明な会期slug: ${slug}\n利用可能: ${Object.keys(SESSIONS).join(", ")}`
    );
    process.exit(1);
  }

  // ドライランフラグがtrueの場合はドライランモード
  console.log(
    isDryRun
      ? `🔍 DRY RUN: ${session.name} 会議録`
      : `🚀 scrape-minutes: ${session.name}`
  );

  // 会期年を取得
  const year = session.gijirokuYear;
  // 会議一覧URLを取得
  const listUrl = `${GIJIROKU_BASE}?ACT=100&KGTP=1&FYY=${year}&TYY=${year}`;
  console.log(`📋 会議一覧取得: ${listUrl}`);

  // 会議一覧HTMLを取得
  const listHtml = await fetchHtml(listUrl, "shift_jis");
  // 会議一覧をパース
  const meetings = parseMeetingList(listHtml);
  console.log(`📅 会議数: ${meetings.length}`);

  // 02号以降の会議をフィルタ
  const targetMeetings = meetings.filter(
    (m) => m.dayNumber !== "00" && Number(m.dayNumber) >= 2
  );
  // 代表質問対象の会議数を出力
  console.log(
    `🎯 代表質問対象（02号以降）: ${targetMeetings.length} 件`
  );

  // 代表質問対象の会議数が0の場合はエラー
  if (targetMeetings.length === 0) {
    console.warn("⚠️  代表質問の会議録が見つかりません。");
    process.exit(0);
  }

  // Supabaseクライアントを作成
  const supabase = isDryRun ? null : createAdminClient();

  // 議案番号 → bill_id マッピングを取得
  let billMap: Map<string, string> | null = null;
  // 全議案IDを取得
  let allBillIds: string[] = [];
  if (supabase) {
    // 会期データを取得
    const { data: sessionRow } = await supabase
      .from("council_sessions")
      .select("id")
      .eq("slug", slug)
      .single();

    // 会期データが存在しない場合はエラー
    if (!sessionRow) {
      console.error(
        `❌ council_sessions に slug="${slug}" が見つかりません。`
      );
      process.exit(1);
    }

    // 議案データを取得
    const { data: bills, error } = await supabase
      .from("bills")
      .select("id, bill_number")
      .eq("council_session_id", sessionRow.id)
      .eq("publish_status", "published")
      .not("bill_number", "is", null);

    // エラーが発生した場合はエラー
    if (error) {
      console.error("❌ bills取得エラー:", error.message);
      process.exit(1);
    }

    // 議案番号 → bill_id マッピングを作成
    billMap = new Map(
      (bills ?? []).map((b) => {
        const num =
          b.bill_number?.match(/議案第(\d+)号/)?.[1] ?? "";
        return [num, b.id];
      })
    );
    // 全議案IDを取得
    allBillIds = (bills ?? []).map((b) => b.id);
    console.log(`📋 公開議案数: ${billMap.size}`);
  }

  // 挿入数をカウント
  let totalInserts = 0;
  // スキップ数をカウント
  let totalSkips = 0;

  // 会議をループ
  for (const meeting of targetMeetings) {
    // 会議情報を出力
    console.log(
      `\n📄 ${meeting.date}-${meeting.dayNumber}号 (FINO=${meeting.fino})`
    );

    // 会議HTMLを取得
    const bodyUrl = `${GIJIROKU_BASE}?ACT=203&KENSAKU=0&KGTP=1&FYY=${year}&TYY=${year}&FINO=${meeting.fino}&HESSION=1&HUID=0&KESSION=${year}02&HMODE=0`;
    const bodyHtml = await fetchHtml(bodyUrl, "shift_jis");
    // 会議HTMLをテキストに変換
    const bodyText = htmlToText(bodyHtml);
    // 会議テキストをパース

    const speeches = parseMinutes(bodyText);
    // 質疑グループを作成
    const groups = groupIntoDiscussions(speeches);
    // 質疑グループ数を出力
    console.log(`  👥 質疑グループ数: ${groups.length}`);

    // 質疑グループをループ
    for (const group of groups) {
      // 質疑グループ情報を出力
      console.log(
        `  処理: ${group.questionerName} → 議案番号: [${group.billNumbers.join(", ")}]`
      );

      // 代表質問かどうかを判定
      const isRepresentativeQuestion =
        group.billNumbers.length === 0;

      // 質問者の発言を取得
      const questionSpeeches = group.speeches.filter(
        (s) => s.speakerType === "questioner"
      );
      // 答弁者の発言を取得
      const answerSpeeches = group.speeches.filter(
        (s) => s.speakerType === "answerer"
      );

      // 質問者の発言を結合
      const questionText = questionSpeeches
        .map((s) => s.text)
        .join("\n\n");
      // 答弁者の発言を結合
      const answerText = answerSpeeches
        .map((s) => s.text)
        .join("\n\n");

      // 質問者の発言または答弁者の発言がない場合はスキップ
      if (!questionText.trim() || !answerText.trim()) {
        console.log(
          "    ⚠️  質問または答弁テキストなし → スキップ"
        );
        totalSkips++;
        continue;
      }

      // 会派名を抽出
      const party =
        extractParty(questionText) ??
        extractParty(questionSpeeches[0]?.text ?? "") ??
        null;
      // 往復回数をカウント
      const exchanges = countExchanges(group.speeches);
      const primaryAnswerer = answerSpeeches[0];

      // 答弁者の役職を取得
      const answererRoles = [
        ...new Set(
          answerSpeeches.map((s) =>
            s.speakerRole && s.speakerName
              ? `${s.speakerRole}（${s.speakerName}）`
              : s.speakerRole ?? s.speakerName
          )
        ),
      ].join("・");

      // 質問者の要約を生成
      let questionSummary = "";
      let answerSummary = "";

      // ドライランフラグがfalseの場合はAI要約を生成
      if (!isDryRun) {
        try {
          // AI要約を生成
          console.log("    🤖 AI要約生成中...");
          const raw = callClaude(
            buildSummaryPrompt(
              questionText.slice(0, 2000),
              answerText.slice(0, 2000)
            )
          );
          // JSON形式の要約を抽出
          const jsonMatch = raw.match(/\{[\sS]*\}/);
          if (jsonMatch) {
            // JSONをパース
            const parsed = JSON.parse(jsonMatch[0]);
            questionSummary = parsed.question_summary ?? "";
            answerSummary = parsed.answer_summary ?? "";
          } else {
            // JSONパース失敗
            console.log(
              "    ⚠️  JSONパース失敗:",
              raw.slice(0, 100)
            );
          }
        } catch (e) {
          // AI要約エラー
          console.error("    ❌ AI要約エラー:", e);
        }
      } else {
        // ドライランフラグがtrueの場合はドライランモード
        questionSummary = "[DRY RUN] 質問要約";
        answerSummary = "[DRY RUN] 答弁要約";
      }

      // 会議日を取得
      const sessionDay = Number(meeting.dayNumber);

      // 議案IDを取得
      const targetBillIds: { num: string; id: string }[] = [];
      // 代表質問の場合は全議案に紐付け
      if (isRepresentativeQuestion) {
        if (isDryRun) {
          // ドライランフラグがtrueの場合はドライランモード
          console.log(
            `    [DRY RUN] 代表質問 → 全議案に紐付け (${group.questionerName}, ${party ?? "会派不明"}, 往復${exchanges}回)`
          );
          totalInserts++;
          continue;
        }
        // 全議案に紐付け
        for (const id of allBillIds) {
          targetBillIds.push({ num: "(全議案)", id });
        }
      } else {
        // 議案番号に紐付け
        for (const billNum of group.billNumbers) {
          // 議案番号に紐付け
          if (isDryRun) {
            // ドライランフラグがtrueの場合はドライランモード
            console.log(
              `    [DRY RUN] 議案第${billNum}号 → ${group.questionerName} (${party ?? "会派不明"}) 往復${exchanges}回`
            );
            totalInserts++;
            continue;
          }
          // 議案IDを取得
          const billId = billMap?.get(billNum);
          // 議案IDが存在しない場合はスキップ
          if (!billId) {
            console.log(
              `    ⚠️  議案第${billNum}号 → DB未登録 → スキップ`
            );
            totalSkips++;
            continue;
          }
          // 議案IDを追加
          targetBillIds.push({ num: billNum, id: billId });
        }
        if (isDryRun) continue;
      }

      for (const { num, id: billId } of targetBillIds) {
        const record = {
          bill_id: billId,
          session_day: sessionDay,
          questioner_name: group.questionerName,
          questioner_number: null,
          questioner_party: party,
          question_summary: questionSummary,
          question_raw: questionText,
          answerer_role: answererRoles || null,
          answerer_name: primaryAnswerer?.speakerName ?? null,
          answer_summary: answerSummary,
          answer_raw: answerText,
          exchange_count: exchanges,
        };

        // Supabaseにレコードを挿入
        const { error } = await supabase!
          .from("bill_discussions")
          .upsert(record, {
            onConflict: "bill_id,questioner_name",
            ignoreDuplicates: false,
          });

        // エラーが発生した場合はエラー
        if (error) {
          console.error(
            `    ❌ 議案第${num}号 upsertエラー:`,
            error.message
          );
        } else {
          // 挿入成功
          totalInserts++;
        }
      }
    }
  }

  // 完了メッセージを出力
  console.log("\n🎉 完了");
  // 挿入数を出力
  console.log(`  挿入/更新: ${totalInserts} 件`);
  // スキップ数を出力
  console.log(`  スキップ: ${totalSkips} 件`);
}

// メイン関数を実行
main().catch((err) => {
  // エラーを出力
  console.error("❌ Error:", err);
  // 終了コードを1で終了
  process.exit(1);
});
