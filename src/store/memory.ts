import { randomUUID } from "node:crypto";
import {
  emptyPartyData,
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
      waOptOutAt: null,
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
    if (c) c.waOptOutAt = new Date();
  }
}
