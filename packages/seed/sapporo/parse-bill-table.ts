import type { BillStatusEnum, ScrapedBill } from "./types";

const BASE_URL = "https://www.city.sapporo.jp";

// 日本語日付パーサー
export function parseJapaneseDate(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/\s+/g, "").trim();
  if (!cleaned) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;

  const m = cleaned.match(/令和(\d+)年(\d+)月(\d+)日/);
  if (m) {
    const year = 2018 + Number(m[1]);
    const month = m[2].padStart(2, "0");
    const day = m[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return null;
}

// 議決結果マッピング
export function mapResultToStatus(result: string): BillStatusEnum {
  const r = result.trim();
  if (r.includes("可決")) return "approved";
  if (r.includes("同意")) return "approved";
  if (r.includes("承認")) return "approved";
  if (r.includes("採択") && !r.includes("不採択")) return "adopted";
  if (r.includes("適当と認める")) return "approved"; // 諮問：「棄却することを適当と認める」等
  if (r.includes("否決")) return "rejected";
  if (r.includes("不採択")) return "rejected";
  if (r.includes("棄却")) return "rejected"; // 請願の棄却（却下）
  return "submitted";
}

// 議案種別判定
function detectBillType(
  numberText: string
): "bill" | "consultation" | "opinion" | "petition" | "appeal" | "report" | null {
  if (numberText.startsWith("議案")) return "bill";
  if (numberText.startsWith("諮問")) return "consultation";
  if (numberText.startsWith("意見書案")) return "opinion";
  if (numberText.startsWith("請願")) return "petition";
  if (numberText.startsWith("陳情")) return "appeal";
  if (numberText.startsWith("報告")) return "report";
  return null;
}

// HTMLタグ除去
function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

// HTMLテキスト抽出
function extractText(html: string): string {
  return stripTags(html).replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

// PDFリンク抽出
function extractPdfHref(html: string): string | null {
  const m = html.match(/href="([^"]*\.pdf[^"]*)"/);
  if (!m) return null;
  const href = m[1];
  if (href.startsWith("http")) return href;
  return `${BASE_URL}${href}`;
}

// 議案名抽出
function extractBillName(html: string): string {
  const linkMatch = html.match(/<a[^>]*>([^<]*)</);
  if (linkMatch) {
    return linkMatch[1].replace(/（PDF[^）]*）/, "").trim();
  }
  return extractText(html);
}

// 議案一覧パーサー
export function parseBillTable(html: string): ScrapedBill[] {
  const bills: ScrapedBill[] = [];

  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRe.exec(html)) !== null) {
    const rowHtml = rowMatch[1];

    const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRe.exec(rowHtml)) !== null) {
      cells.push(cellMatch[1]);
    }

    if (cells.length < 5) continue;

    const numberText = extractText(cells[0]);
    const type = detectBillType(numberText);

    if (!type || type === "report") continue;

    const name = extractBillName(cells[1]);
    if (!name) continue;

    const submittedDate = parseJapaneseDate(extractText(cells[2]));
    const resolvedDate = parseJapaneseDate(extractText(cells[3]));
    const result = extractText(cells[4]);
    const pdfUrl = extractPdfHref(cells[1]);

    bills.push({
      billNumber: numberText,
      billType: type,
      name,
      submittedDate,
      resolvedDate,
      result,
      pdfUrl,
    });
  }

  return bills;
}
