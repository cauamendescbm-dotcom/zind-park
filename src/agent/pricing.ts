import type { AiUsage } from "./agent.js";

/** Preço em US$ por milhão de tokens (tabela da Anthropic, out/2026). Confira em anthropic.com/pricing. */
const PRICES: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  "claude-haiku-4-5": { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
};

/** Custo estimado em US$ (null se o modelo não estiver na tabela). */
export function estimateCostUsd(u: AiUsage): number | null {
  const key = Object.keys(PRICES).find((k) => u.model.startsWith(k));
  if (!key) return null;
  const p = PRICES[key];
  const usd =
    (u.inputTokens * p.input + u.outputTokens * p.output + u.cacheReadTokens * p.cacheRead + u.cacheWriteTokens * p.cacheWrite) / 1e6;
  return Math.round(usd * 1e6) / 1e6;
}
