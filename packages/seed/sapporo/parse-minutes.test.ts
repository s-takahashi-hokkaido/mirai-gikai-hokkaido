import { describe, expect, it } from "vitest";
import {
  countExchanges,
  extractBillNumbers,
  extractParty,
  groupIntoDiscussions,
  htmlToText,
  parseMeetingList,
  parseMinutes,
} from "./parse-minutes";
import type { SpeechBlock } from "./types";

describe("htmlToText", () => {
  it("converts BR tags to newlines", () => {
    expect(htmlToText("line1<BR>line2<BR/>line3")).toBe(
      "line1\nline2\nline3"
    );
  });

  it("strips HTML tags", () => {
    expect(htmlToText("<A NAME='x'>text</A>")).toBe("text");
  });

  it("decodes HTML entities", () => {
    expect(htmlToText("A&amp;B&nbsp;C")).toBe("A&B C");
  });
});

describe("extractBillNumbers", () => {
  it("extracts multiple bill numbers", () => {
    expect(
      extractBillNumbers(
        "議案第1号、議案第44号、議案第49号、議案第62号"
      )
    ).toEqual(["1", "44", "49", "62"]);
  });

  it("deduplicates", () => {
    expect(
      extractBillNumbers("議案第1号について、議案第1号は")
    ).toEqual(["1"]);
  });

  it("returns empty for no matches", () => {
    expect(extractBillNumbers("質問です")).toEqual([]);
  });
});

describe("extractParty", () => {
  it("extracts 自由民主党議員会", () => {
    expect(
      extractParty(
        "自由民主党議員会を代表し、質問を行います"
      )
    ).toBe("自由民主党議員会");
  });

  it("extracts 公明党議員会", () => {
    expect(
      extractParty("公明党議員会を代表して質問いたします")
    ).toBe("公明党議員会");
  });

  it("extracts 日本共産党", () => {
    expect(
      extractParty("日本共産党を代表し質問いたします")
    ).toBe("日本共産党");
  });

  it("extracts 民主市民連合", () => {
    expect(
      extractParty("民主市民連合を代表し質問します")
    ).toBe("民主市民連合");
  });

  it("returns null when no party found", () => {
    expect(extractParty("質問します")).toBeNull();
  });
});

describe("countExchanges", () => {
  it("counts question-answer pairs", () => {
    const speeches: SpeechBlock[] = [
      { speakerType: "questioner", speakerName: "A", text: "q1" },
      { speakerType: "answerer", speakerName: "B", text: "a1" },
      { speakerType: "questioner", speakerName: "A", text: "q2" },
      { speakerType: "answerer", speakerName: "B", text: "a2" },
    ];
    expect(countExchanges(speeches)).toBe(2);
  });

  it("returns 1 for minimum", () => {
    expect(countExchanges([])).toBe(1);
  });
});

describe("parseMinutes", () => {
  const SAMPLE = [
    "○議長（飯島弘之）　答弁を求めます。",
    "◆小竹ともこ議員　私は、自由民主党議員会を代表し、質問を行います。議案第1号について質問します。",
    "○議長（飯島弘之）　答弁を求めます。",
    "◎市長（秋元克広）　ご質問をいただきました。お答えします。",
    "◎副市長（天野周治）　私からは補足します。",
    "○議長（飯島弘之）　小竹ともこ議員。",
    "◆小竹ともこ議員　再質問です。",
    "○議長（飯島弘之）　答弁を求めます。",
    "◎市長（秋元克広）　再質問にお答えします。",
  ].join("\n");

  it("parses all speaker blocks", () => {
    const blocks = parseMinutes(SAMPLE);
    const questioners = blocks.filter(
      (b) => b.speakerType === "questioner"
    );
    const answerers = blocks.filter(
      (b) => b.speakerType === "answerer"
    );
    expect(questioners).toHaveLength(2);
    expect(answerers).toHaveLength(3);
  });

  it("extracts questioner name without 議員 suffix", () => {
    const blocks = parseMinutes(SAMPLE);
    const questioners = blocks.filter(
      (b) => b.speakerType === "questioner"
    );
    expect(questioners[0].speakerName).toBe("小竹ともこ");
  });

  it("extracts answerer role and name", () => {
    const blocks = parseMinutes(SAMPLE);
    const answerers = blocks.filter(
      (b) => b.speakerType === "answerer"
    );
    expect(answerers[0].speakerRole).toBe("市長");
    expect(answerers[0].speakerName).toBe("秋元克広");
    expect(answerers[1].speakerRole).toBe("副市長");
    expect(answerers[1].speakerName).toBe("天野周治");
  });

  it("captures speech text", () => {
    const blocks = parseMinutes(SAMPLE);
    const questioners = blocks.filter(
      (b) => b.speakerType === "questioner"
    );
    expect(questioners[0].text).toContain("自由民主党議員会を代表");
  });
});

describe("groupIntoDiscussions", () => {
  const SAMPLE = [
    "○議長（飯島弘之）　答弁を求めます。",
    "◆小竹ともこ議員　自由民主党議員会を代表し質問します。議案第1号について。",
    "◎市長（秋元克広）　お答えします。",
    "◆小竹ともこ議員　再質問です。",
    "◎市長（秋元克広）　再答弁です。",
    "◆福田浩太郎議員　公明党議員会を代表して質問します。議案第2号について。",
    "◎副市長（天野周治）　お答えします。",
  ].join("\n");

  it("groups by questioner", () => {
    const blocks = parseMinutes(SAMPLE);
    const groups = groupIntoDiscussions(blocks);
    expect(groups).toHaveLength(2);
    expect(groups[0].questionerName).toBe("小竹ともこ");
    expect(groups[1].questionerName).toBe("福田浩太郎");
  });

  it("extracts bill numbers from question text", () => {
    const blocks = parseMinutes(SAMPLE);
    const groups = groupIntoDiscussions(blocks);
    expect(groups[0].billNumbers).toEqual(["1"]);
    expect(groups[1].billNumbers).toEqual(["2"]);
  });

  it("includes questioner and answerer speeches in group", () => {
    const blocks = parseMinutes(SAMPLE);
    const groups = groupIntoDiscussions(blocks);
    const g0Types = groups[0].speeches.map((s) => s.speakerType);
    expect(g0Types).toContain("questioner");
    expect(g0Types).toContain("answerer");
    const g1Types = groups[1].speeches.map((s) => s.speakerType);
    expect(g1Types).toContain("questioner");
    expect(g1Types).toContain("answerer");
  });
});

describe("parseMeetingList", () => {
  const SAMPLE_HTML = `
<TD><A HREF="javascript:;" onClick="winopen('voiweb.exe?ACT=200&KENSAKU=0&KGTP=1&FYY=2025&TYY=2025&FINO=4507&UNID=k_R07021300011');">02月13日-01号</A></TD>
<TD><A HREF="javascript:;" onClick="winopen('voiweb.exe?ACT=200&KENSAKU=0&KGTP=1&FYY=2025&TYY=2025&FINO=4512&UNID=k_R07021900021');">02月19日-02号</A></TD>
<TD><A HREF="javascript:;" onClick="winopen('voiweb.exe?ACT=200&KENSAKU=0&KGTP=1&FYY=2025&TYY=2025&FINO=4514&UNID=k_R07022000031');">02月20日-03号</A></TD>
`;

  it("parses meeting entries", () => {
    const entries = parseMeetingList(SAMPLE_HTML);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toMatchObject({
      dayNumber: "01",
      fino: "4507",
    });
    expect(entries[1]).toMatchObject({
      dayNumber: "02",
      fino: "4512",
    });
  });

  it("extracts date correctly", () => {
    const entries = parseMeetingList(SAMPLE_HTML);
    expect(entries[0].date).toBe("02月13日");
  });
});
