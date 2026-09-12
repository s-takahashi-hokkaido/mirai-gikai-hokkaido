/**
 * AI利用コストのガードに関する純粋関数
 *
 * DBアクセスや環境変数の読み取りを含まないため、単体テストが容易。
 */

/** コスト上限に到達した理由 */
export type CostLimitReason = "per_user" | "global";

/** コスト上限の判定結果 */
export type CostGuardResult =
  | { allowed: true }
  | { allowed: false; reason: CostLimitReason };

export type EvaluateCostGuardParams = {
  /** 対象ユーザーが当日使用した金額(USD) */
  perUserUsedUsd: number;
  /** 対象ユーザーの1日あたり上限(USD) */
  perUserLimitUsd: number;
  /** サイト全体で当日使用した金額(USD) */
  globalUsedUsd: number;
  /** サイト全体の1日あたり上限(USD) */
  globalLimitUsd: number;
};

/**
 * 当日のコスト実績が上限内かどうかを判定する
 *
 * 全体上限を先に評価する。匿名認証ではユーザーを無限に作り直せるため、
 * ユーザー単位の上限だけでは総額を抑えられない。
 */
export function evaluateCostGuard({
  perUserUsedUsd,
  perUserLimitUsd,
  globalUsedUsd,
  globalLimitUsd,
}: EvaluateCostGuardParams): CostGuardResult {
  if (globalUsedUsd >= globalLimitUsd) {
    return { allowed: false, reason: "global" };
  }

  if (perUserUsedUsd >= perUserLimitUsd) {
    return { allowed: false, reason: "per_user" };
  }

  return { allowed: true };
}

/**
 * JST基準の1日の時間範囲を取得（UTCのISO文字列で返す）
 *
 * @param now 基準時刻。省略時は現在時刻
 */
export function getJstDayRange(now: Date = new Date()): {
  from: string;
  to: string;
} {
  const jstOffsetMs = 9 * 60 * 60 * 1000;
  const jstNow = new Date(now.getTime() + jstOffsetMs);

  const startOfJstDay = new Date(
    Date.UTC(
      jstNow.getUTCFullYear(),
      jstNow.getUTCMonth(),
      jstNow.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );

  const startUtc = new Date(startOfJstDay.getTime() - jstOffsetMs);
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);

  return { from: startUtc.toISOString(), to: endUtc.toISOString() };
}

/**
 * 環境変数の値をコスト上限(USD)としてパースする
 *
 * 未設定・空文字の場合はフォールバック値を使う。
 * 数値として不正、または0以下の場合は null を返す（呼び出し側でエラーにする）。
 */
export function parseCostLimitUsd(
  raw: string | undefined,
  fallbackUsd: number
): number | null {
  const source = raw !== undefined && raw.trim() !== "" ? raw : null;
  const value = source === null ? fallbackUsd : Number(source);

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}
