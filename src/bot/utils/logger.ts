import type { BotTurn, ConversationLog } from "../types.js";

/**
 * Log de cada resposta do bot (seção 33). Sem dados pessoais: não guarda telefone, nome nem id
 * do cliente, e esconde números longos e e-mails que o cliente digitar.
 */
export type LogSink = (entry: ConversationLog) => void;

export const consoleSink: LogSink = (entry) => console.log(`[bot] ${JSON.stringify(entry)}`);

export function sanitize(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[número]")
    .slice(0, 300);
}

export function buildLog(turn: BotTurn, userMessage: string, channel: string, answeringPersonalData: boolean, now = new Date()): ConversationLog {
  return {
    timestamp: now.toISOString(),
    channel,
    userMessage: answeringPersonalData ? "[dado pessoal do cliente]" : sanitize(userMessage),
    detectedIntent: turn.deferToAgent ? "AGENTE_IA" : turn.intent,
    confidence: turn.score,
    response: turn.reply ?? "(resposta do agente com IA)",
    fallbackUsed: turn.fallback,
    transferredToHuman: turn.needsHuman,
  };
}
