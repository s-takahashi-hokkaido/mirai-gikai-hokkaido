import { describe, expect, it } from "vitest";
import {
  buildEvalPrompt,
  extractEvalResults,
  type BillForEval,
} from "./auto-feature-evaluator";

const sampleBill: BillForEval = {
  id: "bill-1",
  bill_number: "第1号",
  name: "札幌市保育所条例の一部を改正する条例",
  title: "保育料の無償化拡大",
  summary: "第2子以降の保育料を無償化する。",
  content:
    "第1条 保育料を改定する。市内在住の第2子以降の児童に係る保育料を無償とする。",
};

describe("buildEvalPrompt", () => {
  it("議案番号・タイトル・本文を含むプロンプトを生成する", () => {
    const prompt = buildEvalPrompt([sampleBill]);
    expect(prompt).toContain("第1号");
    expect(prompt).toContain("保育料の無償化拡大");
    expect(prompt).toContain("第2子以降の保育料を無償化");
  });

  it("contentが800文字を超える場合は切り詰める", () => {
    const longBill: BillForEval = { ...sampleBill, content: "a".repeat(1000) };
    const prompt = buildEvalPrompt([longBill]);
    // 切り詰めた後の文字列が含まれる（"a" * 800）
    expect(prompt).toContain("a".repeat(800));
    expect(prompt).not.toContain("a".repeat(801));
  });

  it("複数議案をセパレータで区切る", () => {
    const bill2: BillForEval = {
      ...sampleBill,
      bill_number: "第2号",
      id: "bill-2",
    };
    const prompt = buildEvalPrompt([sampleBill, bill2]);
    expect(prompt).toContain("---");
    expect(prompt).toContain("第1号");
    expect(prompt).toContain("第2号");
  });
});

describe("extractEvalResults", () => {
  it("コードブロック付きのJSONを解析できる", () => {
    const input = `\`\`\`json
[
  {
    "bill_number": "第1号",
    "breakdown": { "influence_range": 30, "life_impact": 35, "interest": 20 },
    "score": 85,
    "excluded": false,
    "reason": "保育料無償化で子育て世帯の家計に直接影響"
  }
]
\`\`\``;
    const results = extractEvalResults(input);
    expect(results).toHaveLength(1);
    expect(results[0].bill_number).toBe("第1号");
    expect(results[0].score).toBe(85);
    expect(results[0].excluded).toBe(false);
  });

  it("コードブロックなしのJSON配列も解析できる", () => {
    const input = `[{"bill_number":"第2号","breakdown":{"influence_range":0,"life_impact":0,"interest":0},"score":0,"excluded":true,"reason":"予算案のため除外"}]`;
    const results = extractEvalResults(input);
    expect(results).toHaveLength(1);
    expect(results[0].excluded).toBe(true);
  });

  it("JSONが見つからない場合はエラーを投げる", () => {
    expect(() => extractEvalResults("エラーが発生しました")).toThrow(
      "JSON が見つかりませんでした"
    );
  });
});
