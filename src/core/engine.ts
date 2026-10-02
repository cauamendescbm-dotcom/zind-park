import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { AgentActions, AgentRunner } from "../agent/agent.js";
import { maybeAddTypo, splitIntoBubbles, typingDelayMs, type Rng } from "../agent/humanize.js";
import type { Knowledge } from "../agent/knowledge.js";
import type { ChannelAdapter, InboundMessage, StaffNotifier } from "../channels/types.js";
import {
  formatHumanRequest,
  formatLeadForOrganizer,
  humanRequestTemplateParams,
  leadTemplateParams,
  missingFields,
  notifySafely,
} from "../handoff/handoff.js";
import type { Channel, Contact, Conversation, Lead, Store, StoredMessage } from "../store/types.js";

export interface EngineOptions {
  store: Store;
  channels: Partial<Record<Channel, ChannelAdapter>>;
  notifier: StaffNotifier;
  agent: AgentRunner;
  knowledge: Knowledge;
  typoRate: number;
  debounceMs: number;
  humanDelays: boolean;
  historyLimit?: number;
  sleep?: (ms: number) => Promise<void>;
  rng?: Rng;
  now?: () => Date;
}

const CHANNEL_LABEL: Record<Channel, string> = { whatsapp: "WhatsApp", instagram: "Instagram" };

/**
 * Motor da conversa: recebe mensagens, espera o cliente terminar de digitar (debounce),
 * chama o agente e envia a resposta em balões, com "digitando" e delays.
 */
export class ConversationEngine {
  private timers = new Map<string, NodeJS.Timeout>();
  private running = new Map<string, Promise<void>>();
  private rerun = new Set<string>();
  private lastInbound = new Map<string, { to: string; externalId: string }>();
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
    this.lastInbound.set(conv.id, { to: msg.from, externalId: msg.externalId });
    this.schedule(conv.id);
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
    const contact = await store.getContact(conv.contactId);
    if (!contact) return;

    const messages = await store.recentMessages(conv.id, this.o.historyLimit ?? 40);
    const history = buildHistory(messages);
    if (history.length === 0 || history[history.length - 1].role !== "user") return;

    const lead = await store.getOpenLead(conv.id);
    const reply = await this.o.agent({
      history,
      stateText: this.buildState(conv, contact, lead),
      actions: this.buildActions(conv, contact),
    });

    const fresh = (await store.getConversation(conv.id)) ?? conv;
    const protectedWords = [
      ...this.o.knowledge.packages.flatMap((p) => p.nome.split(/\s+/)),
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
        const pkg = knowledge.packages.find((p) => p.id === lead.packageId);
        await store.closeLead(lead.id, pkg?.valor ?? null);
        await store.updateConversation(conv.id, { state: "repassada" });
        const sent = await notifySafely(
          notifier,
          "lead",
          formatLeadForOrganizer(lead, pkg, CHANNEL_LABEL[conv.channel]),
          leadTemplateParams(lead, pkg),
        );
        if (!sent) await store.addHumanRequest(conv.id, `Falha ao avisar a organizadora sobre o lead ${lead.id}`);
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

/** Reconstrói o histórico para o modelo: só texto, sem os balões de correção "*palavra". */
export function buildHistory(messages: StoredMessage[]): BetaMessageParam[] {
  const turns: { role: "user" | "assistant"; text: string }[] = [];
  for (const m of messages) {
    if (m.isTypoFix) continue;
    const role = m.direction === "in" ? "user" : "assistant";
    const text = m.direction === "in" ? m.body : (m.intendedBody ?? m.body);
    if (!text) continue;
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.text += role === "assistant" ? `\n---\n${text}` : `\n${text}`;
    else turns.push({ role, text });
  }
  while (turns.length && turns[0].role === "assistant") turns.shift();
  return turns.map((t) => ({ role: t.role, content: t.text }));
}

function recipientOf(contact: Contact, channel: Channel): string {
  const id = channel === "whatsapp" ? contact.whatsappId : contact.instagramId;
  if (!id) throw new Error(`Contato ${contact.id} sem id em ${channel}`);
  return id;
}

function describeContact(contact: Contact, channel: Channel): string {
  if (channel === "whatsapp" && contact.whatsappId) return `+${contact.whatsappId} (WhatsApp)`;
  return `Instagram ${contact.instagramId ?? ""}`.trim();
}
