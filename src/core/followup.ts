import type { Config } from "../config.js";
import type { Contact, Conversation, Followup, Store } from "../store/types.js";

/**
 * Retorno para quem deu uma desculpa ("vou pensar", "depois te falo", "vou ver com meu marido").
 *
 * Retorno em 24h ou mais: depois de 24h o WhatsApp só aceita modelo aprovado e só para quem aceitou
 * receber. Então o bot pergunta "posso te chamar daqui a 3 dias?" e só quem diz sim recebe.
 * Retorno em menos de 24h: ainda é conversa aberta; não precisa perguntar nem de modelo.
 */

const norm = (t: string) =>
  t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

const EXCUSES = [
  /\bvou pensar\b/,
  /\b(vou|preciso|tenho que|deixa eu|vou ter que) (ver|conversar|falar|combinar|decidir) com (a |o |minha |meu )*(esposa|marido|mulher|namorad[oa]|noiv[oa]|socio|socia|familia|mae|pai)\b/,
  /\bdepois eu (te )?(falo|aviso|respondo|chamo|retorno)\b/,
  /\bdepois (te )?(falo|aviso|respondo|chamo|retorno)\b/,
  /\bte (aviso|falo|retorno|chamo)\b/,
  /\b(falo|vejo|respondo|chamo|retorno|aviso)( com voce| contigo| isso)? mais tarde\b/,
  /\b(falo|vejo|decido|resolvo|retorno|aviso)( isso)? (na )?semana que vem\b/,
  /\bagora nao (posso|da)\b/,
  /\b(estou|to|tou) ocupad[oa]\b/,
];

/** "Vou pensar" e parecidos. Mensagem com pergunta não conta: primeiro o bot responde a pergunta. */
export const isExcuse = (text: string) => !text.includes("?") && EXCUSES.some((r) => r.test(norm(text)));

const YES = /^(sim|s|pode|pode sim|pode ser|pode chamar|pode me chamar|claro|claro que sim|ok|okay|beleza|blz|com certeza|quero|isso|combinado|ta bom|ta|por favor|chama|me chama|uhum|aham|bora|👍)(\b|$)/;
const NO = /^(nao|n|nao precisa|nao obrigad|melhor nao|nao quero|deixa que eu|eu te chamo|eu chamo|eu falo|eu aviso|pode deixar)(\b|$)/;

export const isYes = (text: string) => !isNo(text) && YES.test(norm(text).replace(/[!.,]+/g, ""));
export const isNo = (text: string) => NO.test(norm(text).replace(/[!.,]+/g, ""));

/** "3 dias", "amanhã", "20 horas". */
export function delayLabel(hours: number): string {
  if (hours === 24) return "amanhã";
  if (hours % 24 === 0) return `daqui a ${hours / 24} dias`;
  return `daqui a ${hours} horas`;
}

export const followupTexts = {
  ask: (hours: number) => `Claro, sem pressa nenhuma! 😊\nPosso te chamar ${delayLabel(hours)} pra saber o que você decidiu?`,
  accepted: (hours: number) => `Combinado! Eu te chamo ${delayLabel(hours)} 💛\nSe quiser antes, é só mandar mensagem.`,
  declined: "Tudo bem! 💛 Quando quiser, é só chamar por aqui.",
  /** Retorno em menos de 24h: o bot não pergunta, só responde e retoma depois. */
  noted: "Claro, sem pressa nenhuma! 😊\nQualquer dúvida, é só me chamar.",
  /** Mensagem livre do retorno (dentro das 24h). Fora delas vai o modelo aprovado na Meta. */
  message: (name: string | null) =>
    `Oi${name ? `, ${name}` : ""}! Tudo bem? 😊\nPassando pra saber se você conseguiu pensar sobre o que conversamos.\nPosso te ajudar com alguma dúvida?`,
};

export const firstName = (c: Pick<Contact, "name">) => c.name?.trim().split(/\s+/)[0] || null;

/**
 * O que fazer com a mensagem nova do cliente.
 * `reply` não nulo: o bot responde só isso (sem chatbot nem IA). `save`: grava o retorno.
 */
export function followupStep(
  prev: Followup | null,
  text: string,
  ctx: { conv: Conversation; contact: Contact; hours: number; now: Date; collectingParty?: boolean },
): { reply: string | null; save: Followup | null } {
  const { conv, contact, hours, now } = ctx;
  if (prev?.status === "perguntado") {
    if (isNo(text)) return { reply: followupTexts.declined, save: { ...prev, status: "recusado" } };
    if (isYes(text)) return { reply: followupTexts.accepted(hours), save: { ...prev, status: "aguardando", acceptedAt: now } };
    // Mudou de assunto sem responder: sem permissão, não manda o retorno.
    return { reply: null, save: { ...prev, status: "respondeu" } };
  }
  if (prev?.status === "aguardando") {
    // Voltou a conversar antes do retorno: não precisa mais.
    return { reply: null, save: { ...prev, status: "respondeu" } };
  }
  const blocked = prev?.status === "recusado" || contact.optOutAt !== null;
  // Durante a coleta da festa, "semana que vem" é resposta, não desculpa.
  const collecting = ctx.collectingParty || conv.state === "coletando_festa";
  if (blocked || conv.channel !== "whatsapp" || collecting || !isExcuse(text)) {
    return { reply: null, save: null };
  }
  const base = { contactId: contact.id, conversationId: conv.id, excuse: text.slice(0, 500), askedAt: now, sentAt: null };
  if (hours < 24) return { reply: followupTexts.noted, save: { ...base, status: "aguardando", acceptedAt: now } };
  return { reply: followupTexts.ask(hours), save: { ...base, status: "perguntado", acceptedAt: null } };
}

export interface FollowupSender {
  sendText(to: string, text: string): Promise<string | null>;
  sendTemplate(to: string, name: string, lang: string, bodyParams: string[]): Promise<string | null>;
}

export interface FollowupRunOptions {
  store: Store;
  whatsapp: FollowupSender;
  hours: number;
  /** Modelo aprovado na Meta (categoria Marketing), com {{1}} = nome. Obrigatório para retorno depois de 24h. */
  template?: string;
  templateLang: string;
  /** Só manda entre estas horas (horário de Brasília). */
  startHour: number;
  endHour: number;
  now?: Date;
  log?: (msg: string) => void;
}

export interface FollowupRunResult {
  enviados: number;
  responderam: number;
  cancelados: number;
  esperandoModelo: number;
  foraDoHorario: boolean;
}

const SERVICE_WINDOW_MS = 24 * 3600e3;
/** O servidor confere a cada 15 min; com folga, para não perder a janela entre uma rodada e outra. */
const RUN_MARGIN_MS = 20 * 60e3;
/** Antecipado por causa da janela, o retorno só sai depois deste tempo da desculpa. */
const MIN_EARLY_MS = 2 * 3600e3;

/** Horário de Brasília (UTC-3, sem horário de verão desde 2019). */
const BRT_OFFSET_MS = 3 * 3600e3;
const brasiliaHour = (d: Date) => new Date(d.getTime() - BRT_OFFSET_MS).getUTCHours();
/** Hoje às `hour` horas, no horário de Brasília. */
function brasiliaToday(now: Date, hour: number): number {
  const local = new Date(now.getTime() - BRT_OFFSET_MS);
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hour) + BRT_OFFSET_MS;
}

/**
 * Hora de mandar? Quando passou o tempo combinado, ou antes disso se for a última chance de mandar
 * texto livre: a janela de 24h fecha antes da próxima rodada dentro do horário permitido.
 */
export function isFollowupDue(
  f: Pick<Followup, "acceptedAt">,
  lastInboundAt: Date | null,
  o: { hours: number; startHour: number; endHour: number; hasTemplate: boolean },
  now: Date,
): boolean {
  if (!f.acceptedAt) return false;
  const t = now.getTime();
  if (t - f.acceptedAt.getTime() >= o.hours * 3600e3) return true;
  if (o.hasTemplate || !lastInboundAt || t - f.acceptedAt.getTime() < MIN_EARLY_MS) return false;
  const windowEnd = lastInboundAt.getTime() + SERVICE_WINDOW_MS;
  const todayEnd = brasiliaToday(now, o.endHour);
  const tomorrowStart = brasiliaToday(now, o.startHour) + 24 * 3600e3;
  // A janela ainda vai estar aberta amanhã no horário permitido: espera o tempo combinado.
  if (windowEnd > tomorrowStart + RUN_MARGIN_MS && windowEnd > todayEnd + RUN_MARGIN_MS) return false;
  return Math.min(windowEnd, todayEnd) - t <= RUN_MARGIN_MS;
}

/** Manda os retornos vencidos. Roda pelo comando `npm run retorno` e sozinho no servidor (a cada 15 min). */
export async function runFollowups(o: FollowupRunOptions): Promise<FollowupRunResult> {
  const now = o.now ?? new Date();
  const log = o.log ?? ((m: string) => console.log(`[retorno] ${m}`));
  const result: FollowupRunResult = { enviados: 0, responderam: 0, cancelados: 0, esperandoModelo: 0, foraDoHorario: false };
  const hour = brasiliaHour(now);
  if (hour < o.startHour || hour >= o.endHour) {
    result.foraDoHorario = true;
    return result;
  }

  const pending = await o.store.dueFollowups(now);
  for (const f of pending) {
    const contact = await o.store.getContact(f.contactId);
    const conv = await o.store.getConversation(f.conversationId);
    if (!contact?.whatsappId || !conv || contact.optOutAt) {
      await o.store.saveFollowup({ ...f, status: "cancelado" });
      result.cancelados++;
      continue;
    }
    if (conv.lastInboundAt && f.acceptedAt && conv.lastInboundAt > f.acceptedAt) {
      await o.store.saveFollowup({ ...f, status: "respondeu" });
      result.responderam++;
      continue;
    }
    const timing = { hours: o.hours, startHour: o.startHour, endHour: o.endHour, hasTemplate: !!o.template };
    if (!isFollowupDue(f, conv.lastInboundAt, timing, now)) continue;
    // Alguém da equipe assumiu a conversa: não atropela.
    if (conv.state === "humano" || (conv.pausedUntil && conv.pausedUntil > now)) continue;

    const name = firstName(contact);
    const insideWindow = !!conv.lastInboundAt && now.getTime() - conv.lastInboundAt.getTime() < SERVICE_WINDOW_MS;
    let externalId: string | null;
    let body: string;
    try {
      if (insideWindow) {
        body = followupTexts.message(name);
        externalId = await o.whatsapp.sendText(contact.whatsappId, body);
      } else if (o.template) {
        body = `[retorno: modelo ${o.template}] ${followupTexts.message(name)}`;
        externalId = await o.whatsapp.sendTemplate(contact.whatsappId, o.template, o.templateLang, [name ?? "tudo bem"]);
      } else {
        result.esperandoModelo++;
        continue;
      }
    } catch (err) {
      log(`falha ao mandar para ${contact.whatsappId}: ${err instanceof Error ? err.message : err}`);
      continue;
    }
    // Toda mensagem enviada fica guardada com o id da Meta (senão o eco dela pausa o agente).
    await o.store.addMessage({
      conversationId: conv.id,
      direction: "out",
      author: "sistema",
      body,
      intendedBody: null,
      isTypoFix: false,
      externalId,
    });
    await o.store.saveFollowup({ ...f, status: "enviado", sentAt: now });
    result.enviados++;
  }
  if (result.esperandoModelo) {
    log(`${result.esperandoModelo} retorno(s) esperando o modelo aprovado: configure FOLLOWUP_TEMPLATE (docs/templates-meta.md)`);
  }
  if (result.enviados || result.responderam || result.cancelados) {
    log(`${result.enviados} enviado(s), ${result.responderam} já tinham voltado a conversar, ${result.cancelados} cancelado(s)`);
  }
  return result;
}

/** Opções a partir do .env (servidor e `npm run retorno`). */
export const followupOptions = (config: Config, store: Store, whatsapp: FollowupSender): FollowupRunOptions => ({
  store,
  whatsapp,
  hours: config.FOLLOWUP_HORAS,
  template: config.FOLLOWUP_TEMPLATE,
  templateLang: config.ORGANIZADORA_TEMPLATE_LANG,
  startHour: config.FOLLOWUP_HORA_INICIO,
  endHour: config.FOLLOWUP_HORA_FIM,
});
