import { describe, expect, it } from "vitest";
import {
  mapResultToStatus,
  parseBillTable,
  parseJapaneseDate,
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

  it("不採択 → rejected", () => {
    expect(mapResultToStatus("不採択")).toBe("rejected");
  });

  it("棄却を適当と認める → approved", () => {
    expect(
      mapResultToStatus(
        "本件審査請求を棄却することを適当と認める"
      )
    ).toBe("approved");
  });

  it("empty → submitted", () => {
    expect(mapResultToStatus("")).toBe("submitted");
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

  it("skips 報告 and 陳情 rows", () => {
    const bills = parseBillTable(FIXTURE_UNRESOLVED);
    const types = bills.map((b) => b.billType);
    expect(types).not.toContain("report");
    expect(types).not.toContain("petition");
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
});
