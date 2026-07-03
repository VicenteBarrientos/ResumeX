import type { TokenUsage } from "@/lib/types";
import { debugLog } from "@/lib/debug-log";

export type { TokenUsage };

const GPT_4O_MINI_INPUT_PER_MILLION = 0.15;
const GPT_4O_MINI_OUTPUT_PER_MILLION = 0.6;

export function buildTokenUsage(
  model: string,
  promptTokens: number,
  completionTokens: number,
): TokenUsage {
  const totalTokens = promptTokens + completionTokens;
  const estimatedCostUsd = estimateCost(model, promptTokens, completionTokens);

  return {
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedCostUsd,
  };
}

function estimateCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  if (model === "gpt-4o-mini") {
    return (
      (promptTokens / 1_000_000) * GPT_4O_MINI_INPUT_PER_MILLION +
      (completionTokens / 1_000_000) * GPT_4O_MINI_OUTPUT_PER_MILLION
    );
  }

  return 0;
}

export function logTokenUsage(model: string, usage: TokenUsage): void {
  debugLog("[ResumeX] Token usage:", {
    model,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    estimatedCostUsd: usage.estimatedCostUsd,
  });
}

export function formatEstimatedCost(usd: number): string {
  if (usd === 0) {
    return "$0.00";
  }

  if (usd < 0.01) {
    return `$${usd.toFixed(4)}`;
  }

  return `$${usd.toFixed(4)}`;
}
