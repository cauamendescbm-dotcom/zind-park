/** Tipos do chatbot de intenções (independente de canal: WhatsApp, Instagram, site...). */
import type { PartyPackage } from "./data/partyPackages.js";

export type IntentId =
  | "SAUDACAO"
  | "COMO_FUNCIONA"
  | "HORARIO_FUNCIONAMENTO"
  | "LOCALIZACAO"
  | "RESERVA_PARQUE"
  | "PRECO_PARQUE"
  | "IDADE_PAGAMENTO"
  | "ADULTO_BRINCAR"
  | "ADULTO_PAGA"
  | "PAGAMENTO"
  | "MEIA_ANTIDERRAPANTE"
  | "DESCONTO_PCD_AUTISMO"
  | "ANIVERSARIANTE"
  | "ALIMENTACAO"
  | "COMIDA_FORA"
  | "FESTAS_EVENTOS"
  | "PACOTES_FESTA"
  | "POLITICAS_FESTA"
  | "AGRADECIMENTO"
  | "FALAR_COM_HUMANO"
  | "PERGUNTA_ROBO"
  | "INFO_INDISPONIVEL";

/** "parque" = uso normal do parque; "festa" = festas e eventos. Nunca misturar as regras. */
export type IntentScope = "parque" | "festa" | "geral";

export interface Intent {
  id: IntentId;
  /** Nome curto, usado quando o bot precisa perguntar "você quer saber sobre X ou Y?". */
  name: string;
  description: string;
  /** Frases que indicam a intenção. Casamento exato da frase: +5. */
  keywords: string[];
  /** Grupos do synonyms.ts. Qualquer variação do grupo na mensagem: +3. */
  synonyms: string[];
  /** Perguntas de exemplo. Mensagem parecida com um exemplo: +2. */
  examples: string[];
  /** Se a mensagem tiver uma destas palavras, a intenção perde 5 pontos (ex.: "festa" tira do preço do parque). */
  negativeKeywords?: string[];
  /** Desempate quando dois scores são iguais (maior ganha). */
  priority: number;
  scope: IntentScope;
  /** Resposta oficial completa. Aceita {{variaveis}} do parkConfig. */
  response: string;
  /** Resposta no canal sem festas (Instagram): encaminha para o WhatsApp. Aceita {{linkWhatsapp}}. */
  responseWithoutPartyFlow?: string;
  /** Versão curta: pergunta simples ou assunto já explicado na conversa. */
  shortResponse?: string;
  /** Outras intenções cuja informação esta resposta já entrega (evita repetir). */
  covers?: IntentId[];
  /** Intenções relacionadas (sugestão de próximo passo). */
  related?: IntentId[];
  /** Pergunta de próxima ação, usada de vez em quando (não em toda resposta). */
  followUp?: { question: string; intent: IntentId };
  /** Precisa coletar dados do cliente depois de responder (ex.: festa). */
  requiresData?: boolean;
  /** Intenção de apoio (saudação, agradecimento): só vale se nenhuma outra for encontrada. */
  helper?: boolean;
  /** Nunca entra na pergunta "você quer saber sobre X ou Y?" (em empate, perde para a outra). */
  noClarify?: boolean;
  /** Avisa a equipe depois de responder (motivo do aviso). */
  handoff?: string;
}

export interface IntentScore {
  intent: IntentId;
  score: number;
}

export interface Classification {
  best: IntentScore | null;
  /** Segunda colocada (usada para perguntar quando há empate). */
  second: IntentScore | null;
  scores: IntentScore[];
  /** Duas intenções com scores muito próximos: o bot deve perguntar. */
  ambiguous: boolean;
}

/** Dados da festa coletados aos poucos na conversa. */
export interface PartyLeadData {
  date?: string;
  guests?: number;
  time?: string;
  birthdayAge?: string;
  space?: string;
  theme?: string;
  name?: string;
  phone?: string;
  /** Campos que o cliente não soube ou não quis responder. */
  skipped?: PartyLeadField[];
}
export type PartyLeadField = Exclude<keyof PartyLeadData, "skipped">;

export type PendingQuestion =
  | { type: "clarify"; options: IntentId[] }
  | { type: "partyMenu" }
  | { type: "suggestion"; intent: IntentId }
  | { type: "leadOffer" }
  | { type: "lead"; field: PartyLeadField; retries: number };

/** Estado da conversa guardado entre as mensagens (vai para o banco como JSON). */
export interface BotState {
  lastIntent: IntentId | null;
  /** Intenções já respondidas (e as que essas respostas cobriram). */
  answered: IntentId[];
  fallbackCount: number;
  pending: PendingQuestion | null;
  topic: IntentScope | null;
  lead: PartyLeadData;
  leadStatus: "none" | "collecting" | "done" | "cancelled";
  suggestionsMade: IntentId[];
}

export const emptyBotState = (): BotState => ({
  lastIntent: null,
  answered: [],
  fallbackCount: 0,
  pending: null,
  topic: null,
  lead: {},
  leadStatus: "none",
  suggestionsMade: [],
});

export interface BotOptions {
  /** Festas são atendidas neste canal? (no Instagram, não: encaminha para o WhatsApp) */
  partyFlow: boolean;
  /** O telefone do cliente já é conhecido (WhatsApp): não pergunta. */
  phoneKnown: boolean;
  /** Link do WhatsApp do Zind, usado no Instagram. */
  whatsappLink: string;
  /** Com IA ligada, mensagens que o bot não entende vão para o agente com IA em vez do fallback. */
  deferUnknownToAgent: boolean;
  /** Pacotes do PDF oficial (vazio enquanto não chegar). */
  packages: PartyPackage[];
  /** Cliente voltou depois de muito tempo: zera o contexto da conversa anterior. */
  newSession?: boolean;
}

export interface BotTurn {
  /** Texto a enviar (null quando a resposta deve vir do agente com IA). */
  reply: string | null;
  intent: IntentId | null;
  score: number;
  fallback: boolean;
  needsHuman: boolean;
  humanReason?: string;
  deferToAgent: boolean;
  /** Coleta da festa terminou nesta mensagem: repassar para a organizadora. */
  leadComplete: PartyLeadData | null;
  state: BotState;
}

/** Registro de cada resposta do bot. Sem telefone, nome ou ids do cliente. */
export interface ConversationLog {
  timestamp: string;
  channel: string;
  userMessage: string;
  detectedIntent: string | null;
  confidence: number;
  response: string;
  fallbackUsed: boolean;
  transferredToHuman: boolean;
}
