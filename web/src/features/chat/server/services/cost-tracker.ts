import "server-only";

import type { LanguageModelUsage } from "ai";

import { sanitizeUsage } from "@/lib/ai/calculate-ai-cost";
import {
  type CostGuardResult,
  evaluateCostGuard,
  getJstDayRange,
} from "@/lib/ai/cost-guard";
import { env } from "@/lib/env";
import { parseCost, resolveCostUsd } from "../../shared/utils/cost-utils";

import {
  type ChatUsageInsert,
  insertChatUsageEvent,
  sumAiUsageCostUsd,
} from "../repositories/chat-usage-repository";

type RecordChatUsageParams = {
  userId: string;
  sessionId?: string;
  promptName?: string;
  model: string;
  usage: LanguageModelUsage;
  occurredAt?: string;
  metadata?: ChatUsageInsert["metadata"];
  costUsd?: number | null;
};

export async function recordChatUsage({
  userId,
  sessionId,
  promptName,
  model,
  usage,
  occurredAt,
  metadata,
  costUsd,
}: RecordChatUsageParams) {
  const sanitizedUsage = sanitizeUsage(usage ?? undefined);
  const costUsdNumber = resolveCostUsd(model, sanitizedUsage, costUsd);
  const payload: ChatUsageInsert = {
    user_id: userId,
    session_id: sessionId ?? null,
    prompt_name: promptName ?? null,
    model,
    input_tokens: sanitizedUsage.inputTokens,
    output_tokens: sanitizedUsage.outputTokens,
    total_tokens: sanitizedUsage.totalTokens,
    cost_usd: costUsdNumber,
    occurred_at: occurredAt,
    metadata: metadata ?? null,
  };

  await insertChatUsageEvent(payload);
}

/**
 * 指定ユーザーが期間内に使用したAIコスト(USD)を取得する
 */
export async function getUsageCostUsd(
  userId: string,
  fromIso: string,
  toIso: string
): Promise<number> {
  const total = await sumAiUsageCostUsd(fromIso, toIso, userId);
  return parseCost({ cost_usd: total });
}

/**
 * サイト全体が期間内に使用したAIコスト(USD)を取得する
 *
 * 匿名ユーザーは作り直せるため、実際の請求額を守るのはこちらの集計。
 */
export async function getGlobalUsageCostUsd(
  fromIso: string,
  toIso: string
): Promise<number> {
  const total = await sumAiUsageCostUsd(fromIso, toIso);
  return parseCost({ cost_usd: total });
}

/**
 * 当日のAI利用コストが上限内かどうかを判定する
 *
 * チャットとインタビューで共通。ユーザー単位と全体の両方を見る。
 *
 * @param perUserLimitUsd 機能ごとに異なるユーザー単位の上限
 */
export async function checkDailyCostGuard({
  userId,
  perUserLimitUsd,
}: {
  userId: string;
  perUserLimitUsd: number;
}): Promise<CostGuardResult> {
  const { from, to } = getJstDayRange();

  const [perUserUsedUsd, globalUsedUsd] = await Promise.all([
    getUsageCostUsd(userId, from, to),
    getGlobalUsageCostUsd(from, to),
  ]);

  return evaluateCostGuard({
    perUserUsedUsd,
    perUserLimitUsd,
    globalUsedUsd,
    globalLimitUsd: env.aiCost.globalDailyLimitUsd,
  });
}
