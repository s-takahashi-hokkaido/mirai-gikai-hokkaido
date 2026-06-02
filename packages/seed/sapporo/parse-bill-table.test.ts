import { describe, expect, it } from "vitest";
import {
  mapResultToStatus,
  parseBillTable,
  parseJapaneseDate,
  refineBillType,
} from "./parse-bill-table";

describe("parseJapaneseDate", () => {
  it("令和8年5月21日 → 2026-05-21", () => {
    expect(parseJapaneseDate("令和8年5月21日")).toBe("2026-05-21");
  });

  it("handles whitespace between year and date", () => {
    expect(parseJapaneseDate("令和8年 5月21日")).toBe("2026-05-21");
  });

  it("handles newlines from <br/> extraction", () => {
    expect(parseJapaneseDate("令和8年\n5月21日")).toBe("2026-05-21");
  });

  it("passes through ISO dates", () => {
    expect(parseJapaneseDate("2026-05-21")).toBe("2026-05-21");
  });

  it("returns null for empty string", () => {
    expect(parseJapaneseDate("")).toBeNull();
  });

  it("returns null for whitespace only", () => {
    expect(parseJapaneseDate("   ")).toBeNull();
  });

  it("returns null for dash", () => {
    expect(parseJapaneseDate("-")).toBeNull();
  });
});

describe("mapResultToStatus", () => {
  it("可決 → approved", () => {
    expect(mapResultToStatus("可決")).toBe("approved");
  });

  it("原案可決 → approved", () => {
    expect(mapResultToStatus("原案可決")).toBe("approved");
  });

  it("同意 → approved", () => {
    expect(mapResultToStatus("同意")).toBe("approved");
  });

  it("承認 → approved", () => {
    expect(mapResultToStatus("承認")).toBe("approved");
  });

  it("否決 → rejected", () => {
    expect(mapResultToStatus("否決")).toBe("rejected");
  });

  it("採択 → adopted", () => {
    expect(mapResultToStatus("採択")).toBe("adopted");
  });

  it("認定 → approved（決算認定）", () => {
    expect(mapResultToStatus("認定")).toBe("approved");
  });

  it("不認定 → rejected", () => {
    expect(mapResultToStatus("不認定")).toBe("rejected");
  });

  it("不同意 → rejected（不同意が同意にマッチしないこと）", () => {
    expect(mapResultToStatus("不同意")).toBe("rejected");
  });

  it("不採択 → rejected", () => {
    expect(mapResultToStatus("不採択")).toBe("rejected");
  });

  it("棄却することを適当と認める → approved（諮問の文脈）", () => {
    expect(
      mapResultToStatus("本件審査請求を棄却することを適当と認める")
    ).toBe("approved");
  });

  it("棄却 → rejected（請願の却下）", () => {
    expect(mapResultToStatus("棄却")).toBe("rejected");
  });

  it("empty → submitted", () => {
    expect(mapResultToStatus("")).toBe("submitted");
  });
});

describe("refineBillType", () => {
  it("bill 以外はそのまま返す", () => {
    expect(refineBillType("consultation", "審査請求に関する件")).toBe("consultation");
    expect(refineBillType("opinion", "意見書")).toBe("opinion");
    expect(refineBillType("petition", "○○に関する請願")).toBe("petition");
  });

  it("件名に「専決処分」を含む → bill_ratification", () => {
    expect(refineBillType("bill", "専決処分承認に関する件")).toBe("bill_ratification");
  });

  it("件名に「決算」を含む → bill_settlement", () => {
    expect(refineBillType("bill", "令和7年度札幌市一般会計歳入歳出決算認定")).toBe("bill_settlement");
  });

  it("件名に「選任」を含む → bill_personnel", () => {
    expect(refineBillType("bill", "固定資産評価審査委員会委員選任に関する件")).toBe("bill_personnel");
  });

  it("件名に「委嘱」を含む → bill_personnel", () => {
    expect(refineBillType("bill", "人権擁護委員候補者委嘱に関する件")).toBe("bill_personnel");
  });

  it("件名に「任命」を含む → bill_personnel", () => {
    expect(refineBillType("bill", "教育委員会委員任命に関する件")).toBe("bill_personnel");
  });

  it("通常の議案はそのまま bill", () => {
    expect(refineBillType("bill", "令和8年度札幌市一般会計予算")).toBe("bill");
  });

  it("専決処分は決算より優先される", () => {
    expect(refineBillType("bill", "決算に係る専決処分承認")).toBe("bill_ratification");
  });
});

describe("parseBillTable", () => {
  const FIXTURE_UNRESOLVED = `
<table width="100%">
<tr>
<th width="17%">番号</th>
<th width="50%">件名</th>
<th width="11%">本会議<br/>提出日</th>
<th width="11%">議決日</th>
<th width="11%">結果</th>
</tr>
<tr>
<td align="left" height="21" valign="middle">議案第1号</td>
<td align="left" valign="middle"><a href="/gikai/html/documents/08_2t_g01.pdf" class="icon_pdf">令和８年度札幌市一般会計補正予算（第１号）（PDF：88KB）</a></td>
<td style="text-align: center;" valign="middle">令和8年<br/>5月21日</td>
<td style="text-align: center;" valign="middle">&nbsp;</td>
<td style="text-align: center;" valign="middle">&nbsp;</td>
</tr>
<tr>
<td align="left" height="21" valign="middle">諮問第1号</td>
<td align="left" valign="middle"><a href="/gikai/html/documents/08_2t_s01.pdf" class="icon_pdf">審査請求に対する裁決に関する件（PDF：54KB）</a></td>
<td style="text-align: center;" valign="middle">令和8年<br/>5月21日</td>
<td style="text-align: center;" valign="middle">&nbsp;</td>
<td style="text-align: center;" valign="middle">&nbsp;</td>
</tr>
<tr>
<td align="left" height="21" valign="middle">報告第1号</td>
<td align="left" valign="middle"><a href="/gikai/html/documents/08_2t_h01.pdf" class="icon_pdf">繰越計算書（PDF：100KB）</a></td>
<td style="text-align: center;" valign="middle">令和8年<br/>5月21日</td>
<td style="text-align: center;" valign="middle">-</td>
<td style="text-align: center;" valign="middle">-</td>
</tr>
</table>`;

  it("parses unresolved bills (議案 + 諮問)", () => {
    const bills = parseBillTable(FIXTURE_UNRESOLVED);
    expect(bills).toHaveLength(2);

    expect(bills[0]).toEqual({
      billNumber: "議案第1号",
      billType: "bill",
      name: "令和８年度札幌市一般会計補正予算（第１号）",
      submittedDate: "2026-05-21",
      resolvedDate: null,
      result: "",
      pdfUrl:
        "https://www.city.sapporo.jp/gikai/html/documents/08_2t_g01.pdf",
    });

    expect(bills[1]).toEqual({
      billNumber: "諮問第1号",
      billType: "consultation",
      name: "審査請求に対する裁決に関する件",
      submittedDate: "2026-05-21",
      resolvedDate: null,
      result: "",
      pdfUrl:
        "https://www.city.sapporo.jp/gikai/html/documents/08_2t_s01.pdf",
    });
  });

  it("skips 報告 rows", () => {
    const bills = parseBillTable(FIXTURE_UNRESOLVED);
    const types = bills.map((b) => b.billType);
    expect(types).not.toContain("report");
  });

  const FIXTURE_RESOLVED = `
<table width="100%">
<tr>
<th>番号</th><th>件名</th><th>本会議提出日</th><th>議決日</th><th>結果</th>
</tr>
<tr>
<td align="left" height="25" valign="middle">議案第1号</td>
<td align="left" valign="middle"><a href="/gikai/html/documents/08_1t_g01.pdf" class="icon_pdf">令和８年度札幌市一般会計予算（PDF：500KB）</a></td>
<td align="left" valign="middle"><p style="text-align: center;">令和8年</p><p style="text-align: center;">2月12日</p></td>
<td align="left" valign="middle"><p style="text-align: center;">令和8年</p><p style="text-align: center;">3月26日</p></td>
<td style="text-align: center;" valign="middle">可決</td>
</tr>
<tr>
<td align="left" height="25" valign="middle">議案第47号</td>
<td align="left" valign="middle">固定資産評価審査委員会委員選任に関する件</td>
<td align="left" valign="middle">令和8年2月27日</td>
<td align="left" valign="middle">令和8年2月27日</td>
<td style="text-align: center;" valign="middle">同意</td>
</tr>
</table>`;

  it("parses resolved bills with dates in <p> tags", () => {
    const bills = parseBillTable(FIXTURE_RESOLVED);
    expect(bills).toHaveLength(2);

    expect(bills[0]).toMatchObject({
      billNumber: "議案第1号",
      name: "令和８年度札幌市一般会計予算",
      submittedDate: "2026-02-12",
      resolvedDate: "2026-03-26",
      result: "可決",
    });
  });

  it("handles rows without PDF links", () => {
    const bills = parseBillTable(FIXTURE_RESOLVED);
    expect(bills[1]).toMatchObject({
      billNumber: "議案第47号",
      name: "固定資産評価審査委員会委員選任に関する件",
      pdfUrl: null,
      result: "同意",
    });
  });

  const FIXTURE_PETITION_APPEAL = `
<table width="100%">
<tr>
<th>番号</th><th>件名</th><th>本会議提出日</th><th>議決日</th><th>結果</th>
</tr>
<tr>
<td align="left" height="21" valign="middle">請願第1号</td>
<td align="left" valign="middle">○○に関する請願</td>
<td style="text-align: center;" valign="middle">令和8年<br/>5月21日</td>
<td style="text-align: center;" valign="middle">令和8年<br/>6月26日</td>
<td style="text-align: center;" valign="middle">採択</td>
</tr>
<tr>
<td align="left" height="21" valign="middle">陳情第1号</td>
<td align="left" valign="middle">○○に関する陳情</td>
<td style="text-align: center;" valign="middle">令和8年<br/>5月21日</td>
<td style="text-align: center;" valign="middle">令和8年<br/>6月26日</td>
<td style="text-align: center;" valign="middle">不採択</td>
</tr>
<tr>
<td align="left" height="21" valign="middle">報告第1号</td>
<td align="left" valign="middle">繰越計算書</td>
<td style="text-align: center;" valign="middle">令和8年<br/>5月21日</td>
<td style="text-align: center;" valign="middle">-</td>
<td style="text-align: center;" valign="middle">-</td>
</tr>
</table>`;

  it("parses 請願 and 陳情 rows", () => {
    const bills = parseBillTable(FIXTURE_PETITION_APPEAL);
    expect(bills).toHaveLength(2);

    expect(bills[0]).toMatchObject({
      billNumber: "請願第1号",
      billType: "petition",
      name: "○○に関する請願",
      submittedDate: "2026-05-21",
      resolvedDate: "2026-06-26",
      result: "採択",
    });

    expect(bills[1]).toMatchObject({
      billNumber: "陳情第1号",
      billType: "appeal",
      name: "○○に関する陳情",
      result: "不採択",
    });
  });

  it("still skips 報告 rows even when 請願・陳情 are present", () => {
    const bills = parseBillTable(FIXTURE_PETITION_APPEAL);
    const types = bills.map((b) => b.billType);
    expect(types).not.toContain("report");
  });

  const FIXTURE_SUBTYPES = `
<table width="100%">
<tr>
<th>番号</th><th>件名</th><th>本会議提出日</th><th>議決日</th><th>結果</th>
</tr>
<tr>
<td align="left" valign="middle">議案第1号</td>
<td align="left" valign="middle">令和7年度札幌市一般会計歳入歳出決算認定</td>
<td align="left" valign="middle">令和8年9月10日</td>
<td align="left" valign="middle">令和8年10月16日</td>
<td style="text-align: center;" valign="middle">認定</td>
</tr>
<tr>
<td align="left" valign="middle">議案第2号</td>
<td align="left" valign="middle">固定資産評価審査委員会委員選任に関する件</td>
<td align="left" valign="middle">令和8年9月10日</td>
<td align="left" valign="middle">令和8年9月10日</td>
<td style="text-align: center;" valign="middle">同意</td>
</tr>
<tr>
<td align="left" valign="middle">議案第3号</td>
<td align="left" valign="middle">専決処分承認に関する件</td>
<td align="left" valign="middle">令和8年9月10日</td>
<td align="left" valign="middle">令和8年9月10日</td>
<td style="text-align: center;" valign="middle">承認</td>
</tr>
<tr>
<td align="left" valign="middle">議案第4号</td>
<td align="left" valign="middle">令和8年度札幌市一般会計補正予算（第3号）</td>
<td align="left" valign="middle">令和8年9月10日</td>
<td align="left" valign="middle">令和8年10月16日</td>
<td style="text-align: center;" valign="middle">可決</td>
</tr>
</table>`;

  it("bill サブ種別を件名テキストで正しく分類する", () => {
    const bills = parseBillTable(FIXTURE_SUBTYPES);
    expect(bills).toHaveLength(4);
    expect(bills[0]).toMatchObject({ billType: "bill_settlement", result: "認定" });
    expect(bills[1]).toMatchObject({ billType: "bill_personnel", result: "同意" });
    expect(bills[2]).toMatchObject({ billType: "bill_ratification", result: "承認" });
    expect(bills[3]).toMatchObject({ billType: "bill", result: "可決" });
  });
});
