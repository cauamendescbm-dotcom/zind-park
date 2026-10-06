import { replies } from "./data/faq.js";
import type { BotState } from "./types.js";

/** Tentativas sem entender antes de chamar a equipe (seção 24). */
export const MAX_FALLBACKS = 2;

export interface FallbackResult {
  reply: string;
  needsHuman: boolean;
}

/**
 * Cliente não foi entendido. 1ª vez: pergunta o assunto com carinho.
 * 2ª vez seguida: encaminha para a equipe (e zera a contagem).
 */
export function handleFallback(state: BotState): FallbackResult {
  state.fallbackCount += 1;
  if (state.fallbackCount >= MAX_FALLBACKS) {
    state.fallbackCount = 0;
    state.pending = null;
    return { reply: replies.fallbackHuman, needsHuman: true };
  }
  return { reply: replies.fallbackFirst, needsHuman: false };
}
