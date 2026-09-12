import { describe, expect, it } from "vitest";
import {
  evaluateCostGuard,
  getJstDayRange,
  parseCostLimitUsd,
} from "./cost-guard";

describe("evaluateCostGuard", () => {
  const base = {
    perUserUsedUsd: 0,
    perUserLimitUsd: 0.5,
    globalUsedUsd: 0,
    globalLimitUsd: 5,
  };

  it("どちらも上限未満なら許可する", () => {
    expect(evaluateCostGuard(base)).toEqual({ allowed: true });
  });

  it("ユーザー単位の上限に達したら per_user で拒否する", () => {
    expect(evaluateCostGuard({ ...base, perUserUsedUsd: 0.5 })).toEqual({
      allowed: false,
      reason: "per_user",
    });
  });

  it("全体の上限に達したら global で拒否する", () => {
    expect(evaluateCostGuard({ ...base, globalUsedUsd: 5 })).toEqual({
      allowed: false,
      reason: "global",
    });
  });

  it("両方超過している場合は global を優先する", () => {
    expect(
      evaluateCostGuard({
        ...base,
        perUserUsedUsd: 10,
        globalUsedUsd: 10,
      })
    ).toEqual({ allowed: false, reason: "global" });
  });

  it("上限ちょうど手前では許可する", () => {
    expect(
      evaluateCostGuard({
        ...base,
        perUserUsedUsd: 0.499999,
        globalUsedUsd: 4.999999,
      })
    ).toEqual({ allowed: true });
  });
});

describe("getJstDayRange", () => {
  it("JSTの午前中はその日の00:00(JST)を開始とする", () => {
    // 2026-09-12T03:00:00Z = 2026-09-12 12:00 JST
    const range = getJstDayRange(new Date("2026-09-12T03:00:00.000Z"));

    expect(range.from).toBe("2026-09-11T15:00:00.000Z");
    expect(range.to).toBe("2026-09-12T15:00:00.000Z");
  });

  it("UTCで日付が変わってもJSTの同じ日に属する", () => {
    // 2026-09-12T16:00:00Z = 2026-09-13 01:00 JST
    const range = getJstDayRange(new Date("2026-09-12T16:00:00.000Z"));

    expect(range.from).toBe("2026-09-12T15:00:00.000Z");
    expect(range.to).toBe("2026-09-13T15:00:00.000Z");
  });

  it("JSTの日付境界ちょうどでは新しい日の範囲になる", () => {
    // 2026-09-12T15:00:00Z = 2026-09-13 00:00 JST
    const range = getJstDayRange(new Date("2026-09-12T15:00:00.000Z"));

    expect(range.from).toBe("2026-09-12T15:00:00.000Z");
  });

  it("範囲は常に24時間である", () => {
    const range = getJstDayRange(new Date("2026-02-28T22:30:00.000Z"));
    const durationMs =
      new Date(range.to).getTime() - new Date(range.from).getTime();

    expect(durationMs).toBe(24 * 60 * 60 * 1000);
  });
});

describe("parseCostLimitUsd", () => {
  it("正の数値文字列をパースする", () => {
    expect(parseCostLimitUsd("1.5", 0.5)).toBe(1.5);
  });

  it("未設定ならフォールバック値を使う", () => {
    expect(parseCostLimitUsd(undefined, 0.5)).toBe(0.5);
  });

  it("空文字・空白のみならフォールバック値を使う", () => {
    expect(parseCostLimitUsd("", 0.5)).toBe(0.5);
    expect(parseCostLimitUsd("   ", 0.5)).toBe(0.5);
  });

  it("数値でない場合は null を返す", () => {
    expect(parseCostLimitUsd("abc", 0.5)).toBeNull();
  });

  it("0以下の場合は null を返す", () => {
    expect(parseCostLimitUsd("0", 0.5)).toBeNull();
    expect(parseCostLimitUsd("-1", 0.5)).toBeNull();
  });
});
