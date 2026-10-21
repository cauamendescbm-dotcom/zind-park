import { createHmac, timingSafeEqual } from "node:crypto";
import type { DeliveryStatus } from "../store/types.js";
import { describeMetaError, fetchWithRetry, type RetryOptions } from "./metaApi.js";
import type { ChannelAdapter, InboundMessage, StaffAlertKind, StaffNotifier } from "./types.js";

export interface WhatsAppOptions {
  token: string;
  phoneNumberId: string;
  apiVersion: string;
  /** Padrão: https://graph.facebook.com (troque só em testes locais). */
  apiBase?: string;
  fetchFn?: typeof fetch;
  /** Novas tentativas quando a Meta oscila (src/channels/metaApi.ts). */
  retry?: RetryOptions;
}

/** Cliente da WhatsApp Business Cloud API (oficial da Meta). */
export class WhatsAppClient implements ChannelAdapter {
  readonly channel = "whatsapp" as const;
  private fetchFn: typeof fetch;

  constructor(private opts: WhatsAppOptions) {
    this.fetchFn = opts.fetchFn ?? fetch;
  }

  private async post(body: Record<string, unknown>): Promise<any> {
    const url = `${this.opts.apiBase ?? "https://graph.facebook.com"}/${this.opts.apiVersion}/${this.opts.phoneNumberId}/messages`;
    const res = await fetchWithRetry(
      this.fetchFn,
      url,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${this.opts.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
      },
      this.opts.retry,
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const hint = describeMetaError(json?.error);
      throw new Error(`WhatsApp API ${res.status}${hint ? ` (${hint})` : ""}: ${JSON.stringify(json)}`);
    }
    return json;
  }

  async showTyping(_to: string, lastInboundId: string | null) {
    // A Meta liga o "digitando" junto com a confirmação de leitura de uma mensagem recebida.
    // Some sozinho ao enviar a resposta ou depois de ~25s.
    if (!lastInboundId) return;
    await this.post({
      status: "read",
      message_id: lastInboundId,
      typing_indicator: { type: "text" },
    });
  }

  async sendText(to: string, text: string) {
    const json = await this.post({
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: text, preview_url: false },
    });
    return (json?.messages?.[0]?.id as string | undefined) ?? null;
  }

  /** Template aprovado na Meta: único jeito de falar com quem não escreveu nas últimas 24h. */
  async sendTemplate(to: string, name: string, lang: string, bodyParams: string[], headerImageUrl?: string | null) {
    const components: Record<string, unknown>[] = [];
    if (headerImageUrl) {
      components.push({ type: "header", parameters: [{ type: "image", image: { link: headerImageUrl } }] });
    }
    if (bodyParams.length) {
      components.push({ type: "body", parameters: bodyParams.map((t) => ({ type: "text", text: t })) });
    }
    const json = await this.post({
      to,
      type: "template",
      template: { name, language: { code: lang }, components },
    });
    return (json?.messages?.[0]?.id as string | undefined) ?? null;
  }
}

/** Avisa a organizadora pelo WhatsApp: com template (se configurado) ou texto livre. */
export class WhatsAppStaffNotifier implements StaffNotifier {
  constructor(
    private wa: WhatsAppClient,
    private organizerNumber: string,
    private templates: Partial<Record<StaffAlertKind, string>>,
    private templateLang: string,
  ) {}

  async notifyOrganizer(kind: StaffAlertKind, message: string, templateParams: string[]) {
    const template = this.templates[kind];
    if (template) {
      await this.wa.sendTemplate(this.organizerNumber, template, this.templateLang, templateParams);
    } else {
      await this.wa.sendText(this.organizerNumber, message);
    }
  }
}

/** Confere a assinatura X-Hub-Signature-256 que a Meta manda em todo webhook. */
export function verifyMetaSignature(rawBody: string, header: string | undefined, appSecret: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(header.slice("sha256=".length), "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

const MEDIA_LABELS: Record<string, string> = {
  audio: "[o cliente enviou um áudio]",
  image: "[o cliente enviou uma imagem]",
  video: "[o cliente enviou um vídeo]",
  document: "[o cliente enviou um documento]",
  sticker: "[o cliente enviou uma figurinha]",
  location: "[o cliente enviou uma localização]",
  contacts: "[o cliente enviou um contato]",
};

/** Reação (👍 numa mensagem), aviso de troca de número etc.: não pedem resposta. */
const SILENT_TYPES = new Set(["reaction", "system", "request_welcome"]);

/** Extrai as mensagens recebidas do payload do webhook do WhatsApp. */
export function parseWhatsAppWebhook(body: any): InboundMessage[] {
  const out: InboundMessage[] = [];
  for (const entry of body?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value;
      if (!value?.messages) continue;
      const names = new Map<string, string>();
      for (const c of value.contacts ?? []) names.set(c.wa_id, c.profile?.name);
      for (const m of value.messages) {
        if (SILENT_TYPES.has(m.type)) continue;
        let text: string | undefined;
        // Foto com legenda ("quanto custa esse?"): a legenda é a pergunta.
        const caption: string | undefined = m[m.type]?.caption?.trim();
        if (m.type === "text") text = m.text?.body;
        else if (m.type === "button") text = m.button?.text;
        else if (m.type === "interactive")
          text = m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title;
        else if (caption) text = caption;
        else text = MEDIA_LABELS[m.type] ?? `[o cliente enviou: ${m.type}]`;
        if (!text) continue;
        out.push({
          channel: "whatsapp",
          from: m.from,
          name: names.get(m.from) ?? null,
          text,
          externalId: m.id,
          timestamp: new Date(Number(m.timestamp) * 1000),
        });
      }
    }
  }
  return out;
}

/**
 * Status de entrega (enviada, entregue, lida, falhou) que a Meta manda por webhook.
 * Quando falha, `error` explica o motivo (ex.: passou das 24h, template não aprovado).
 */
export function parseWhatsAppStatuses(body: any): { externalId: string; status: DeliveryStatus; at: Date; to?: string; error?: string }[] {
  const out: { externalId: string; status: DeliveryStatus; at: Date; to?: string; error?: string }[] = [];
  for (const entry of body?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      for (const st of change?.value?.statuses ?? []) {
        if (st.status !== "delivered" && st.status !== "read" && st.status !== "failed") continue;
        const item: (typeof out)[number] = { externalId: st.id, status: st.status, at: new Date(Number(st.timestamp) * 1000) };
        if (st.status === "failed") {
          item.to = st.recipient_id;
          item.error = describeMetaError(st.errors?.[0]) ?? "motivo não informado pela Meta";
        }
        out.push(item);
      }
    }
  }
  return out;
}

/**
 * Mensagens que a equipe mandou pelo app do WhatsApp Business (modo coexistência: o mesmo número
 * no app e na API). Usado para o agente ficar quieto quando uma pessoa assume a conversa.
 */
export function parseWhatsAppEchoes(body: any): { customerId: string; externalId: string }[] {
  const out: { customerId: string; externalId: string }[] = [];
  for (const entry of body?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      for (const echo of change?.value?.message_echoes ?? []) {
        if (echo?.to && echo?.id) out.push({ customerId: echo.to, externalId: echo.id });
      }
    }
  }
  return out;
}
