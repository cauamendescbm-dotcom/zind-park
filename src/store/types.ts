export type Channel = "whatsapp" | "instagram";
export type ConversationState = "aberta" | "coletando_festa" | "repassada" | "humano";
export type LeadStatus = "novo" | "fechado";
export type MessageAuthor = "cliente" | "agente" | "humano" | "sistema";

export interface Contact {
  id: string;
  name: string | null;
  whatsappId: string | null;
  instagramId: string | null;
  waOptOutAt: Date | null;
}

export interface Conversation {
  id: string;
  contactId: string;
  channel: Channel;
  state: ConversationState;
  lastInboundAt: Date | null;
  typoUsed: boolean;
}

export interface StoredMessage {
  id: string;
  conversationId: string;
  direction: "in" | "out";
  author: MessageAuthor;
  /** O que foi realmente enviado/recebido (pode conter o errinho). */
  body: string;
  /** O que o agente quis dizer; usado no histórico do modelo. */
  intendedBody: string | null;
  isTypoFix: boolean;
  externalId: string | null;
  createdAt: Date;
}

export interface PartyData {
  customerName: string | null;
  customerContact: string | null;
  desiredDate: string | null;
  guests: number | null;
  theme: string | null;
  packageId: string | null;
}

export interface Lead extends PartyData {
  id: string;
  contactId: string;
  conversationId: string;
  status: LeadStatus;
  packagePrice: number | null;
  source: string;
  handedOffAt: Date | null;
}

export interface Store {
  findOrCreateContact(channel: Channel, externalId: string, name?: string | null): Promise<Contact>;
  getContact(id: string): Promise<Contact | null>;
  findOrCreateConversation(contactId: string, channel: Channel): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | null>;
  updateConversation(id: string, patch: Partial<Pick<Conversation, "state" | "lastInboundAt" | "typoUsed">>): Promise<void>;
  addMessage(msg: Omit<StoredMessage, "id" | "createdAt">): Promise<StoredMessage>;
  /** Mensagem já processada? (idempotência dos webhooks da Meta) */
  hasExternalMessage(externalId: string): Promise<boolean>;
  recentMessages(conversationId: string, limit: number): Promise<StoredMessage[]>;
  /** Lead aberto (status novo) da conversa, se houver. */
  getOpenLead(conversationId: string): Promise<Lead | null>;
  upsertOpenLead(conversationId: string, contactId: string, source: string, data: Partial<PartyData>): Promise<Lead>;
  closeLead(leadId: string, packagePrice: number | null): Promise<void>;
  addHumanRequest(conversationId: string, reason: string): Promise<void>;
  setOptOut(contactId: string): Promise<void>;
}

export const emptyPartyData = (): PartyData => ({
  customerName: null,
  customerContact: null,
  desiredDate: null,
  guests: null,
  theme: null,
  packageId: null,
});
