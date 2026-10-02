export type Channel = "whatsapp" | "instagram";
export type ConversationState = "aberta" | "coletando_festa" | "repassada" | "humano";
export type LeadStatus = "novo" | "fechado";
export type MessageAuthor = "cliente" | "agente" | "humano" | "sistema";

export interface Contact {
  id: string;
  name: string | null;
  whatsappId: string | null;
  instagramId: string | null;
  /** Deu permissão para receber campanhas no WhatsApp. */
  waOptIn: boolean;
  /** Pediu para não receber mais campanhas (vale para os dois canais). */
  optOutAt: Date | null;
  tags: string[];
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

export interface Campaign {
  id: string;
  name: string;
  channel: Channel;
  /** WhatsApp: template aprovado na Meta. */
  templateName: string | null;
  templateLang: string | null;
  templateParams: string[];
  /** Foto da promoção (URL pública). */
  imageUrl: string | null;
  /** Instagram: texto enviado. WhatsApp: resumo do template, para o agente saber o que foi enviado. */
  text: string | null;
  tags: string[];
  createdAt: Date;
}

export interface CampaignMetrics {
  alvo: number;
  enviados: number;
  entregues: number;
  lidos: number;
  responderam: number;
  leads: number;
  falhas: number;
}

export interface ImportedContact {
  whatsappId: string;
  name: string | null;
  tags: string[];
  optIn: boolean;
  optInSource: string;
}

export type DeliveryStatus = "delivered" | "read" | "failed";

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

  // Campanhas
  importContact(c: ImportedContact): Promise<Contact>;
  /** WhatsApp: opt-in e sem opt-out. Instagram: falou com o Zind nas últimas 24h e sem opt-out. */
  listAudience(channel: Channel, tagsAny: string[], now: Date): Promise<Contact[]>;
  createCampaign(c: Omit<Campaign, "id" | "createdAt">): Promise<Campaign>;
  recordCampaignSend(s: { campaignId: string; contactId: string; externalId: string | null; error: string | null }): Promise<void>;
  updateDeliveryStatus(externalId: string, status: DeliveryStatus, at: Date): Promise<void>;
  /** Cliente respondeu: marca a campanha mais recente (até 7 dias) que ele recebeu. */
  markCampaignReply(contactId: string, at: Date): Promise<void>;
  markCampaignLead(contactId: string, leadId: string): Promise<void>;
  campaignMetrics(campaignId: string): Promise<CampaignMetrics>;
}

export const emptyPartyData = (): PartyData => ({
  customerName: null,
  customerContact: null,
  desiredDate: null,
  guests: null,
  theme: null,
  packageId: null,
});
