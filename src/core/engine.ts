import { upcomingHolidays } from "../bot/data/holidays.js";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { FALLBACK_REPLY, type AgentActions, type AgentRunner } from "../agent/agent.js";
import { maybeAddTypo, splitIntoBubbles, typingDelayMs, type Rng } from "../agent/humanize.js";
import type { Knowledge } from "../agent/knowledge.js";
import { buildLog, consoleSink, handleMessage, type BotState, type LogSink, type PartyLeadData } from "../bot/index.js";
import type { ChannelAdapter, InboundMessage, StaffNotifier } from "../channels/types.js";
import {
  formatHumanRequest,
  formatLeadForOrganizer,
  humanRequestTemplateParams,
  leadTemplateParams,
  missingFields,
  notifySafely,
} from "../handoff/handoff.js";
import type { Channel, Contact, Conversation, Lead, PartyData, Store, StoredMessage } from "../store/types.js";

export interface BotSettings {
  /** "intents": só o chatbot de intenções. "hibrido": o que ele não entende vai para o agente com IA. */
  mode: "intents" | "hibrido";
  /** Link do WhatsApp do Zind (o Instagram manda as festas para lá). */
  whatsappLink: string;
  /** Para onde vão os logs das respostas do bot (padrão: console). */
  log?: LogSink;
}

/** Cliente que volta depois deste tempo começa uma conversa nova (o bot esquece o contexto). */
const NEW_SESSION_HOURS = 12;

export interface EngineOptions {
  store: Store;
  channels: Partial<Record<Channel, ChannelAdapter>>;
  notifier: StaffNotifier;
  /** Um agente com IA por canal (o do Instagram não tem as ferramentas de festa). Vazio no modo "intents". */
  agents: Partial<Record<Channel, AgentRunner>>;
  /** Chatbot de intenções (src/bot). Sem ele, tudo vai para o agente com IA. */
  bot?: BotSettings;
  knowledge: Knowledge;
  typoRate: number;
  debounceMs: number;
  humanDelays: boolean;
  historyLimit?: number;
  /** Números/ids que nunca recebem resposta do agente (ex.: a própria organizadora). */
  ignoreFrom?: string[];
  /** Por quantas horas o agente fica em silêncio quando alguém da equipe responde. */
  humanPauseHours?: number;
  sleep?: (ms: number) => Promise<void>;
  rng?: Rng;
  now?: () => Date;
}

const CHANNEL_LABEL: Record<Channel, string> = { whatsapp: "WhatsApp", instagram: "Instagram" };

/** Palavras que tiram o contato das campanhas na hora, sem passar pelo modelo. */
const OPT_OUT_KEYWORDS = new Set(["sair", "parar", "pare", "stop", "cancelar", "descadastrar"]);
export const OPT_OUT_REPLY =
  "Prontinho, você não vai mais receber nossas promoções por aqui 💛\nSe precisar de algo, é só chamar!";

export const isOptOutKeyword = (text: string) =>
  OPT_OUT_KEYWORDS.has(text.trim().toLowerCase().replace(/[.!]+$/, ""));

/**
 * Motor da conversa: recebe mensagens, espera o cliente terminar de digitar (debounce),
 * chama o agente e envia a resposta em balões, com "digitando" e delays.
 */
export class ConversationEngine {
  private timers = new Map<string, NodeJS.Timeout>();
  private running = new Map<string, Promise<void>>();
  private rerun = new Set<string>();
  private lastInbound = new Map<string, { to: string; externalId: string }>();
  /** Última mensagem do cliente que já entrou numa resposta do agente. */
  private handledInbound = new Map<string, string>();
  private sleep: (ms: number) => Promise<void>;
  private rng: Rng;
  private now: () => Date;

  constructor(private o: EngineOptions) {
    this.sleep = o.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.rng = o.rng ?? Math.random;
    this.now = o.now ?? (() => new Date());
  }

  /** Chamado pelo webhook (ou pelo simulador) a cada mensagem do cliente. */
  async receive(msg: InboundMessage): Promise<void> {
    const { store } = this.o;
    if (this.o.ignoreFrom?.includes(msg.from)) return;
    if (await store.hasExternalMessage(msg.externalId)) return; // a Meta reenvia webhooks

    const contact = await store.findOrCreateContact(msg.channel, msg.from, msg.name);
    const conv = await store.findOrCreateConversation(contact.id, msg.channel);
    await store.addMessage({
      conversationId: conv.id,
      direction: "in",
      author: "cliente",
      body: msg.text,
      intendedBody: null,
      isTypoFix: false,
      externalId: msg.externalId,
    });
    await store.updateConversation(conv.id, { lastInboundAt: msg.timestamp });
    await store.markCampaignReply(contact.id, msg.timestamp);
    this.lastInbound.set(conv.id, { to: msg.from, externalId: msg.externalId });

    if (isOptOutKeyword(msg.text)) {
      await store.setOptOut(contact.id);
      await this.sendDirect(conv, msg.from, OPT_OUT_REPLY);
      return;
    }
    this.schedule(conv.id);
  }

  /**
   * Alguém da equipe respondeu o cliente direto (app do WhatsApp Business ou caixa do Instagram):
   * o agente fica em silêncio nessa conversa por algumas horas para não atropelar a pessoa.
   */
  async pauseForHuman(channel: Channel, customerId: string): Promise<void> {
    const { store } = this.o;
    const contact = await store.findOrCreateContact(channel, customerId);
    const conv = await store.findOrCreateConversation(contact.id, channel);
    const hours = this.o.humanPauseHours ?? 12;
    await store.updateConversation(conv.id, { pausedUntil: new Date(this.now().getTime() + hours * 3600e3) });
    clearTimeout(this.timers.get(conv.id));
    this.timers.delete(conv.id);
  }

  /** Espera todo o processamento pendente terminar (útil em testes e no desligamento). */
  async idle(): Promise<void> {
    while (this.timers.size > 0 || this.running.size > 0) {
      await Promise.all([...this.running.values()]);
      if (this.timers.size > 0) await new Promise((r) => setTimeout(r, Math.max(5, this.o.debounceMs)));
    }
  }

  private schedule(conversationId: string) {
    clearTimeout(this.timers.get(conversationId));
    const timer = setTimeout(() => {
      this.timers.delete(conversationId);
      if (this.running.has(conversationId)) {
        this.rerun.add(conversationId);
        return;
      }
      const p = this.process(conversationId)
        .catch((err) => console.error(`[engine] erro na conversa ${conversationId}:`, err))
        .finally(() => {
          this.running.delete(conversationId);
          if (this.rerun.delete(conversationId)) this.schedule(conversationId);
        });
      this.running.set(conversationId, p);
    }, this.o.debounceMs);
    this.timers.set(conversationId, timer);
  }

  private async process(conversationId: string) {
    const { store } = this.o;
    const conv = await store.getConversation(conversationId);
    if (!conv || conv.state === "humano") return;
    if (conv.pausedUntil && conv.pausedUntil > this.now()) return;
    const contact = await store.getContact(conv.contactId);
    if (!contact) return;

    const messages = await store.recentMessages(conv.id, this.o.historyLimit ?? 40);
    const history = buildHistory(messages, this.handledInbound.get(conv.id));
    if (history.length === 0 || history[history.length - 1].role !== "user") return;
    const lastInboundMsg = messages.filter((m) => m.direction === "in").at(-1);

    const agent = this.o.agents[conv.channel];
    const actions = this.buildActions(conv, contact);
    let reply: string | null = null;
    if (this.o.bot) reply = await this.runBot(conv, contact, messages, actions, !!agent);
    if (reply === null) {
      try {
        if (!agent) throw new Error(`Sem agente com IA configurado para ${conv.channel}`);
        const lead = await store.getOpenLead(conv.id);
        reply = await agent({ history, stateText: this.buildState(conv, contact, lead), actions });
      } catch (err) {
        // API fora do ar, chave errada etc.: o cliente não fica sem resposta e a equipe é avisada.
        console.error(`[engine] agente falhou na conversa ${conv.id}:`, err);
        await actions.callHuman("O atendimento automático falhou ao responder; responda o cliente, por favor.").catch(() => {});
        reply = FALLBACK_REPLY;
      }
    }
    if (lastInboundMsg) this.handledInbound.set(conv.id, lastInboundMsg.id);

    const fresh = (await store.getConversation(conv.id)) ?? conv;
    const protectedWords = [
      ...this.o.knowledge.packages.flatMap((p) => p.name.split(/\s+/)),
      ...(contact.name?.split(/\s+/) ?? []),
    ];
    const { bubbles, typo } = maybeAddTypo(splitIntoBubbles(reply), {
      enabled: !fresh.typoUsed,
      rate: this.o.typoRate,
      rng: this.rng,
      protectedWords,
    });
    if (typo) await store.updateConversation(conv.id, { typoUsed: true });

    const adapter = this.o.channels[conv.channel];
    if (!adapter) throw new Error(`Canal ${conv.channel} não configurado`);
    const target = this.lastInbound.get(conv.id)?.to ?? recipientOf(contact, conv.channel);

    for (const bubble of bubbles) {
      if (this.o.humanDelays) {
        await adapter.showTyping(target, this.lastInbound.get(conv.id)?.externalId ?? null).catch(() => {});
        const wait = bubble.isTypoFix ? 700 + Math.round(this.rng() * 900) : typingDelayMs(bubble.text, this.rng);
        await this.sleep(wait);
      }
      const externalId = await adapter.sendText(target, bubble.text);
      await store.addMessage({
        conversationId: conv.id,
        direction: "out",
        author: "agente",
        body: bubble.text,
        intendedBody: bubble.intended,
        isTypoFix: bubble.isTypoFix,
        externalId,
      });
    }
  }

  /**
   * Chatbot de intenções. Devolve o texto a enviar, ou null quando a resposta deve vir do agente com IA
   * (modo híbrido: mensagem que o bot não entendeu).
   */
  private async runBot(
    conv: Conversation,
    contact: Contact,
    messages: StoredMessage[],
    actions: AgentActions,
    hasAgent: boolean,
  ): Promise<string | null> {
    const bot = this.o.bot!;
    const hybrid = bot.mode === "hibrido" && hasAgent;
    const previous = (conv.botState as BotState | null) ?? null;

    // O agente com IA está no meio da coleta de uma festa: deixa ele terminar.
    if (hybrid && conv.state === "coletando_festa" && previous?.leadStatus !== "collecting") return null;

    const inbound = newInboundMessages(messages, this.handledInbound.get(conv.id));
    if (!inbound.length) return null;
    const text = inbound.map((m) => m.body).join("\n");
    const before = messages.filter((m) => m.direction === "in" && m.createdAt < inbound[0].createdAt).at(-1);
    const newSession = !!before && inbound[0].createdAt.getTime() - before.createdAt.getTime() > NEW_SESSION_HOURS * 3600e3;

    const state = previous && conv.state === "repassada" && previous.leadStatus !== "done" ? { ...previous, leadStatus: "done" as const } : previous;
    let turn;
    try {
      turn = handleMessage(text, state, {
        partyFlow: conv.channel === "whatsapp",
        phoneKnown: conv.channel === "whatsapp" && !!contact.whatsappId,
        whatsappLink: bot.whatsappLink,
        deferUnknownToAgent: hybrid,
        packages: this.o.knowledge.packages,
        holidays: upcomingHolidays(this.o.knowledge.holidays ?? [], new Date()),
        newSession,
      });
    } catch (err) {
      console.error(`[engine] chatbot falhou na conversa ${conv.id}:`, err);
      return null;
    }
    await this.o.store.updateConversation(conv.id, { botState: turn.state });

    const pendingField = previous?.pending?.type === "lead" ? previous.pending.field : null;
    const personal = pendingField === "name" || pendingField === "phone";
    (bot.log ?? consoleSink)(buildLog(turn, text, conv.channel, personal, this.now()));

    if (turn.deferToAgent) return null;
    if (turn.leadComplete) await this.handOffBotLead(conv, contact, turn.leadComplete);
    if (turn.needsHuman) await actions.callHuman(turn.humanReason ?? "Cliente precisa de atendimento.").catch(() => {});
    return turn.reply;
  }

  /** O bot terminou de coletar a festa: registra o lead, fecha e avisa a organizadora. */
  private async handOffBotLead(conv: Conversation, contact: Contact, d: PartyLeadData) {
    const { store } = this.o;
    const existing = await store.getOpenLead(conv.id);
    const contactInfo = d.phone ?? (contact.whatsappId ? `+${contact.whatsappId}` : null);
    const data: Partial<PartyData> = {
      customerName: d.name ?? contact.name,
      customerContact: contactInfo,
      desiredDate: d.date ?? null,
      desiredTime: d.time ?? null,
      birthdayAge: d.birthdayAge ?? null,
      guests: d.guests ?? null,
      space: d.space ?? null,
      theme: d.theme ?? null,
    };
    const lead = await store.upsertOpenLead(conv.id, contact.id, conv.channel, data);
    if (!existing) await store.markCampaignLead(contact.id, lead.id);
    await this.closeAndNotify(conv, lead);
  }

  /** Fecha o lead (o valor do pacote vem do pacotes.json, nunca do modelo) e avisa a organizadora. */
  private async closeAndNotify(conv: Conversation, lead: Lead) {
    const { store, notifier, knowledge } = this.o;
    const pkg = knowledge.packages.find((p) => p.id === lead.packageId);
    await store.closeLead(lead.id, pkg?.price ?? null);
    await store.updateConversation(conv.id, { state: "repassada" });
    const sent = await notifySafely(
      notifier,
      "lead",
      formatLeadForOrganizer(lead, pkg, CHANNEL_LABEL[conv.channel]),
      leadTemplateParams(lead, pkg),
    );
    if (!sent) await store.addHumanRequest(conv.id, `Falha ao avisar a organizadora sobre o lead ${lead.id}`);
  }

  /** Resposta fixa (sem modelo), ainda com "digitando". */
  private async sendDirect(conv: Conversation, to: string, text: string) {
    const adapter = this.o.channels[conv.channel];
    if (!adapter) return;
    if (this.o.humanDelays) {
      await adapter.showTyping(to, this.lastInbound.get(conv.id)?.externalId ?? null).catch(() => {});
      await this.sleep(typingDelayMs(text, this.rng));
    }
    const externalId = await adapter.sendText(to, text);
    await this.o.store.addMessage({
      conversationId: conv.id,
      direction: "out",
      author: "agente",
      body: text,
      intendedBody: text,
      isTypoFix: false,
      externalId,
    });
  }

  private buildState(conv: Conversation, contact: Contact, lead: Lead | null): string {
    const today = this.now().toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const situacao = {
      aberta: "atendimento geral",
      coletando_festa: "coletando os dados de uma festa",
      repassada: "festa JÁ REPASSADA para a organizadora; não conduza mais a venda",
      humano: "uma pessoa da equipe assumiu",
    }[conv.state];

    const lines = [
      `Hoje: ${today}`,
      `Canal: ${CHANNEL_LABEL[conv.channel]}`,
      `Nome no perfil: ${contact.name ?? "desconhecido"}`,
    ];
    if (conv.channel === "whatsapp" && contact.whatsappId) {
      lines.push(`Contato do cliente já conhecido: +${contact.whatsappId}`);
    }
    lines.push(`Situação: ${situacao}`);
    if (lead) {
      const d = [
        `nome=${lead.customerName ?? "?"}`,
        `contato=${lead.customerContact ?? "?"}`,
        `data=${lead.desiredDate ?? "?"}`,
        `convidados=${lead.guests ?? "?"}`,
        `tema=${lead.theme ?? "?"}`,
        `pacote=${lead.packageId ?? "?"}`,
      ];
      lines.push(`Dados de festa já coletados: ${d.join(", ")}`);
      const missing = missingFields(lead);
      lines.push(missing.length ? `Faltam: ${missing.join(", ")}` : "Todos os dados coletados.");
    }
    return `<estado>\n${lines.join("\n")}\n</estado>`;
  }

  private buildActions(conv: Conversation, contact: Contact): AgentActions {
    const { store, notifier, knowledge } = this.o;
    const contactLabel = describeContact(contact, conv.channel);

    return {
      saveParty: async (data) => {
        const current = await store.getConversation(conv.id);
        if (current?.state === "repassada") {
          return "Esta festa já foi repassada para a organizadora. Não colete mais dados; diga que ela vai entrar em contato.";
        }
        if (data.packageId && !knowledge.packages.some((p) => p.id === data.packageId)) {
          throw new Error(`Pacote inválido: ${data.packageId}`);
        }
        const existing = await store.getOpenLead(conv.id);
        const defaults =
          !existing && conv.channel === "whatsapp" && contact.whatsappId && !data.customerContact
            ? { customerContact: `+${contact.whatsappId}` }
            : {};
        const lead = await store.upsertOpenLead(conv.id, contact.id, conv.channel, { ...defaults, ...data });
        if (!existing) await store.markCampaignLead(contact.id, lead.id);
        await store.updateConversation(conv.id, { state: "coletando_festa" });
        const missing = missingFields(lead);
        return missing.length
          ? `Salvo. Ainda faltam: ${missing.join(", ")}.`
          : "Salvo. Todos os dados coletados: confirme o resumo com o cliente e, se ele confirmar, use concluir_coleta_e_repassar.";
      },

      completeParty: async () => {
        const lead = await store.getOpenLead(conv.id);
        const missing = missingFields(lead);
        if (!lead || missing.length) {
          throw new Error(`Ainda faltam dados: ${missing.join(", ")}`);
        }
        await this.closeAndNotify(conv, lead);
        return "Repassado para a organizadora. Avise o cliente com carinho que ela vai entrar em contato.";
      },

      callHuman: async (reason) => {
        await store.addHumanRequest(conv.id, reason);
        await notifySafely(
          notifier,
          "duvida",
          formatHumanRequest(reason, contact.name, contactLabel),
          humanRequestTemplateParams(reason, contact.name, contactLabel),
        );
        return "Equipe avisada. Diga ao cliente que vai confirmar e retornar, sem inventar a resposta.";
      },

      optOut: async () => {
        await store.setOptOut(contact.id);
        return "Opt-out registrado. Ele não vai mais receber campanhas.";
      },
    };
  }
}

/**
 * Reconstrói o histórico para o modelo: só texto, sem os balões de correção "*palavra".
 *
 * `handledInboundId` é a última mensagem do cliente já respondida. Mensagens do cliente que
 * chegaram DEPOIS dela, enquanto o agente ainda mandava os balões, ficam intercaladas com a
 * resposta no banco; aqui elas vão para o fim, para o agente respondê-las em seguida.
 */
export function buildHistory(messages: StoredMessage[], handledInboundId?: string): BetaMessageParam[] {
  const handledIdx = handledInboundId ? messages.findIndex((m) => m.id === handledInboundId) : -1;
  const late =
    handledIdx >= 0 ? messages.filter((m, i) => i > handledIdx && m.direction === "in") : [];
  const ordered = [...messages.filter((m) => !late.includes(m)), ...late];

  const turns: { role: "user" | "assistant"; text: string }[] = [];
  for (const m of ordered) {
    if (m.isTypoFix) continue;
    const role = m.direction === "in" ? "user" : "assistant";
    let text = m.direction === "in" ? m.body : (m.intendedBody ?? m.body);
    if (m.author === "sistema" && text) text = `[Campanha enviada pelo Zind: ${text}]`;
    if (!text) continue;
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.text += role === "assistant" ? `\n---\n${text}` : `\n${text}`;
    else turns.push({ role, text });
  }
  // O histórico precisa começar pelo cliente. Se o Zind falou primeiro (ex.: uma campanha),
  // isso vira contexto no começo da primeira mensagem do cliente.
  if (turns.length && turns[0].role === "assistant") {
    const opening = turns.shift()!;
    if (turns.length) {
      turns[0].text = `[Antes, o Zind tinha enviado: ${opening.text}]\n\n${turns[0].text}`;
    }
  }
  return turns.map((t) => ({ role: t.role, content: t.text }));
}

/**
 * Mensagens do cliente ainda sem resposta: as que vieram depois da última já respondida
 * (ou, se o servidor reiniciou, depois da última mensagem enviada pelo Zind).
 */
export function newInboundMessages(messages: StoredMessage[], handledInboundId?: string): StoredMessage[] {
  let from = handledInboundId ? messages.findIndex((m) => m.id === handledInboundId) : -1;
  if (from < 0) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].direction === "out") {
        from = i;
        break;
      }
    }
  }
  return messages.slice(from + 1).filter((m) => m.direction === "in" && !m.isTypoFix);
}

function recipientOf(contact: Contact, channel: Channel): string {
  const id = channel === "whatsapp" ? contact.whatsappId : contact.instagramId;
  if (!id) throw new Error(`Contato ${contact.id} sem id em ${channel}`);
  return id;
}

function describeContact(contact: Contact, channel: Channel): string {
  if (channel === "whatsapp" && contact.whatsappId) return `+${contact.whatsappId} (WhatsApp)`;
  return `Direct do Instagram (id ${contact.instagramId ?? "?"}); responda pela caixa de mensagens do Instagram`;
}
