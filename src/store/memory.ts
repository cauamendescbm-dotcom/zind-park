import { randomUUID } from "node:crypto";
import {
  emptyPartyData,
  type Campaign,
  type CampaignMetrics,
  type DeliveryStatus,
  type ImportedContact,
  type Channel,
  type Contact,
  type Conversation,
  type Lead,
  type PartyData,
  type Store,
  type StoredMessage,
} from "./types.js";

/** Banco em memória: usado no simulador e nos testes. Some quando o processo para. */
export class MemoryStore implements Store {
  contacts = new Map<string, Contact>();
  conversations = new Map<string, Conversation>();
  messages: StoredMessage[] = [];
  leads = new Map<string, Lead>();
  humanRequests: { conversationId: string; reason: string }[] = [];
  campaigns = new Map<string, Campaign>();
  sends: {
    campaignId: string;
    contactId: string;
    externalId: string | null;
    error: string | null;
    sentAt: Date;
    deliveredAt: Date | null;
    readAt: Date | null;
    repliedAt: Date | null;
    leadId: string | null;
  }[] = [];

  async findOrCreateContact(channel: Channel, externalId: string, name?: string | null) {
    const key = channel === "whatsapp" ? "whatsappId" : "instagramId";
    for (const c of this.contacts.values()) {
      if (c[key] === externalId) {
        if (name && !c.name) c.name = name;
        return c;
      }
    }
    const contact: Contact = {
      id: randomUUID(),
      name: name ?? null,
      whatsappId: channel === "whatsapp" ? externalId : null,
      instagramId: channel === "instagram" ? externalId : null,
      waOptIn: false,
      optOutAt: null,
      tags: [],
    };
    this.contacts.set(contact.id, contact);
    return contact;
  }

  async getContact(id: string) {
    return this.contacts.get(id) ?? null;
  }

  async findOrCreateConversation(contactId: string, channel: Channel) {
    for (const c of this.conversations.values()) {
      if (c.contactId === contactId && c.channel === channel) return c;
    }
    const conv: Conversation = {
      id: randomUUID(),
      contactId,
      channel,
      state: "aberta",
      lastInboundAt: null,
      typoUsed: false,
      pausedUntil: null,
      botState: null,
    };
    this.conversations.set(conv.id, conv);
    return conv;
  }

  async getConversation(id: string) {
    return this.conversations.get(id) ?? null;
  }

  async updateConversation(id: string, patch: Partial<Conversation>) {
    const conv = this.conversations.get(id);
    if (conv) Object.assign(conv, patch);
  }

  async addMessage(msg: Omit<StoredMessage, "id" | "createdAt">) {
    const stored: StoredMessage = { ...msg, id: randomUUID(), createdAt: new Date() };
    this.messages.push(stored);
    return stored;
  }

  async hasExternalMessage(externalId: string) {
    return this.messages.some((m) => m.externalId === externalId);
  }

  async recentMessages(conversationId: string, limit: number) {
    return this.messages.filter((m) => m.conversationId === conversationId).slice(-limit);
  }

  async getOpenLead(conversationId: string) {
    for (const l of this.leads.values()) {
      if (l.conversationId === conversationId && l.status === "novo") return l;
    }
    return null;
  }

  async upsertOpenLead(conversationId: string, contactId: string, source: string, data: Partial<PartyData>) {
    let lead = await this.getOpenLead(conversationId);
    if (!lead) {
      lead = {
        ...emptyPartyData(),
        id: randomUUID(),
        contactId,
        conversationId,
        status: "novo",
        packagePrice: null,
        source,
        handedOffAt: null,
      };
      this.leads.set(lead.id, lead);
    }
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined && v !== null) (lead as any)[k] = v;
    }
    return lead;
  }

  async closeLead(leadId: string, packagePrice: number | null) {
    const lead = this.leads.get(leadId);
    if (lead) {
      lead.status = "fechado";
      lead.packagePrice = packagePrice;
      lead.handedOffAt = new Date();
    }
  }

  async addHumanRequest(conversationId: string, reason: string) {
    this.humanRequests.push({ conversationId, reason });
  }

  async setOptOut(contactId: string) {
    const c = this.contacts.get(contactId);
    if (c) c.optOutAt = new Date();
  }

  async importContact(i: ImportedContact) {
    const c = await this.findOrCreateContact("whatsapp", i.whatsappId, i.name);
    c.tags = [...new Set([...c.tags, ...i.tags])];
    if (i.optIn) c.waOptIn = true;
    return c;
  }

  async listAudience(channel: Channel, tagsAny: string[], now: Date) {
    const dayAgo = now.getTime() - 24 * 3600 * 1000;
    return [...this.contacts.values()].filter((c) => {
      if (c.optOutAt) return false;
      if (tagsAny.length && !c.tags.some((t) => tagsAny.includes(t))) return false;
      if (channel === "whatsapp") return !!c.whatsappId && c.waOptIn;
      if (!c.instagramId) return false;
      const conv = [...this.conversations.values()].find((v) => v.contactId === c.id && v.channel === "instagram");
      return !!conv?.lastInboundAt && conv.lastInboundAt.getTime() >= dayAgo;
    });
  }

  async createCampaign(c: Omit<Campaign, "id" | "createdAt">) {
    const campaign: Campaign = { ...c, id: randomUUID(), createdAt: new Date() };
    this.campaigns.set(campaign.id, campaign);
    return campaign;
  }

  async recordCampaignSend(s: { campaignId: string; contactId: string; externalId: string | null; error: string | null }) {
    this.sends.push({ ...s, sentAt: new Date(), deliveredAt: null, readAt: null, repliedAt: null, leadId: null });
  }

  async updateDeliveryStatus(externalId: string, status: DeliveryStatus, at: Date) {
    const s = this.sends.find((x) => x.externalId === externalId);
    if (!s) return;
    if (status === "delivered") s.deliveredAt ??= at;
    if (status === "read") (s.readAt ??= at), (s.deliveredAt ??= at);
    if (status === "failed") s.error ??= "falhou na entrega";
  }

  private latestSend(contactId: string, at: Date) {
    const weekAgo = at.getTime() - 7 * 24 * 3600 * 1000;
    return this.sends
      .filter((s) => s.contactId === contactId && !s.error && s.sentAt.getTime() >= weekAgo)
      .at(-1);
  }

  async markCampaignReply(contactId: string, at: Date) {
    const s = this.latestSend(contactId, at);
    if (s) s.repliedAt ??= at;
  }

  async markCampaignLead(contactId: string, leadId: string) {
    const s = this.latestSend(contactId, new Date());
    if (s) s.leadId ??= leadId;
  }

  async campaignMetrics(campaignId: string): Promise<CampaignMetrics> {
    const s = this.sends.filter((x) => x.campaignId === campaignId);
    return {
      alvo: s.length,
      enviados: s.filter((x) => x.externalId).length,
      entregues: s.filter((x) => x.deliveredAt).length,
      lidos: s.filter((x) => x.readAt).length,
      responderam: s.filter((x) => x.repliedAt).length,
      leads: s.filter((x) => x.leadId).length,
      falhas: s.filter((x) => x.error).length,
    };
  }
}
