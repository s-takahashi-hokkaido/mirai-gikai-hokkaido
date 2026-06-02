import { createAdminClient } from "../shared/helper";
import { SESSIONS, DEFAULT_SESSION_SLUG } from "./config";
import { fetchHtml } from "./fetcher";
import { mapResultToStatus, parseBillTable } from "./parse-bill-table";

// 議案一覧スクレイパー
async function main() {
  // 会期slug
  const slug = process.argv[2] || DEFAULT_SESSION_SLUG;
  // ドライランフラグ
  const isDryRun = process.argv.includes("--dry-run");
  // 会期データ
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
      ? `🔍 DRY RUN: ${session.name}`
      : `🚀 scrape-bills: ${session.name}`
  );

  // 議案一覧HTML取得
  const html = await fetchHtml(session.billListUrl);
  const scraped = parseBillTable(html);
  console.log(`📄 パース結果: ${scraped.length} 件`);

  // 議案が0件の場合はエラー
  if (scraped.length === 0) {
    console.warn("⚠️  議案が0件です。HTMLの構造が変わった可能性があります。");
    process.exit(1);
  }

  // 議案一覧をパース
  for (const bill of scraped) {
    const status = mapResultToStatus(bill.result);
    console.log(
      `  ${bill.billNumber} | ${bill.name.slice(0, 40)}… | ${status} | ${bill.result || "(未議決)"}`
    );
  }

  // ドライランフラグがtrueの場合はドライランモード
  if (isDryRun) {
    console.log("\n✅ DRY RUN 完了（DB更新なし）");
    return;
  }

  // Supabaseクライアント
  const supabase = createAdminClient();

  // 会期データを取得
  const { data: sessionRow, error: sessionError } = await supabase
    .from("council_sessions")
    .select("id")
    .eq("slug", slug)
    .single();

  // 会期データが存在しない場合はエラー
  if (sessionError || !sessionRow) {
    console.error(
      `❌ council_sessions に slug="${slug}" が見つかりません。先に pnpm seed を実行してください。`
    );
    process.exit(1);
  }

  // 会期ID
  const councilSessionId = sessionRow.id;
  // 議案数
  let upsertCount = 0;
  let errorCount = 0;

  // 議案一覧をループ
  for (const bill of scraped) {
    const status = mapResultToStatus(bill.result);
    const record = {
      council_session_id: councilSessionId,
      bill_number: bill.billNumber,
      bill_type: bill.billType,
      name: bill.name,
      status,
      status_note: bill.result || null,
      published_at: bill.submittedDate
        ? `${bill.submittedDate}T00:00:00+09:00`
        : null,
      source_url: bill.pdfUrl,
      publish_status: "published" as const,
    };

    const { data: existing } = await supabase
      .from("bills")
      .select("id")
      .eq("council_session_id", councilSessionId)
      .eq("bill_number", bill.billNumber)
      .eq("bill_type", bill.billType)
      .maybeSingle();

    const { error } = existing
      ? await supabase
          .from("bills")
          .update(record)
          .eq("id", existing.id)
      : await supabase.from("bills").insert(record);

    // エラーが発生した場合はエラー
    if (error) {
      console.error(
        `  ❌ ${bill.billNumber}: ${error.message}`
      );
      errorCount++;
    } else {
      // 成功した場合は成功数を増やす
      upsertCount++;
    }
  }

  // 完了
  console.log(`\n🎉 完了: ${upsertCount} 件 upsert, ${errorCount} 件エラー`);
}

// メイン処理
main().catch((err) => {
  // エラーが発生した場合はエラー
  console.error("❌ Error:", err);
  process.exit(1);
});
