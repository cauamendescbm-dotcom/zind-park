import type { Channel } from "../store/types.js";

/** O que o motor de conversa precisa de cada canal. */
export interface ChannelAdapter {
  readonly channel: Channel;
  /** Mostra "digitando" (e marca como lida a última mensagem do cliente, no WhatsApp). */
  showTyping(to: string, lastInboundId: string | null): Promise<void>;
  /** Envia um balão de texto. Devolve o id da mensagem na Meta, se houver. */
  sendText(to: string, text: string): Promise<string | null>;
}

/** Mensagem recebida, já normalizada, de qualquer canal. */
export interface InboundMessage {
  channel: Channel;
  /** wa_id no WhatsApp, IGSID no Instagram. */
  from: string;
  name: string | null;
  text: string;
  externalId: string;
  timestamp: Date;
}

/** Para onde vão os avisos internos (lead novo, dúvida sem resposta). */
export type StaffAlertKind = "lead" | "duvida";

export interface StaffNotifier {
  /**
   * `message` é o texto livre; `templateParams` são usados quando há template aprovado
   * configurado para esse tipo de aviso.
   */
  notifyOrganizer(kind: StaffAlertKind, message: string, templateParams: string[]): Promise<void>;
}
