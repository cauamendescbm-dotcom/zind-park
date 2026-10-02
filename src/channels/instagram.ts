import type { ChannelAdapter, InboundMessage } from "./types.js";

export interface InstagramOptions {
  /** Id da Página do Facebook ligada à conta profissional do Instagram. */
  pageId: string;
  pageToken: string;
  apiVersion: string;
  apiBase: string;
  fetchFn?: typeof fetch;
}

/** Cliente da Messenger API para Instagram (DMs da conta profissional). */
export class InstagramClient implements ChannelAdapter {
  readonly channel = "instagram" as const;
  private fetchFn: typeof fetch;

  constructor(private opts: InstagramOptions) {
    this.fetchFn = opts.fetchFn ?? fetch;
  }

  private async post(path: string, body: Record<string, unknown>): Promise<any> {
    const url = `${this.opts.apiBase}/${this.opts.apiVersion}/${path}`;
    const res = await this.fetchFn(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.opts.pageToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Instagram API ${res.status}: ${JSON.stringify(json)}`);
    return json;
  }

  async showTyping(to: string) {
    await this.post(`${this.opts.pageId}/messages`, { recipient: { id: to }, sender_action: "mark_seen" });
    await this.post(`${this.opts.pageId}/messages`, { recipient: { id: to }, sender_action: "typing_on" });
  }

  async sendText(to: string, text: string) {
    const json = await this.post(`${this.opts.pageId}/messages`, { recipient: { id: to }, message: { text } });
    return (json?.message_id as string | undefined) ?? null;
  }

  /** Nome e @ do cliente (só funciona para quem já mandou mensagem para o Zind). */
  async getProfile(igsid: string): Promise<{ name: string | null; username: string | null }> {
    const url = `${this.opts.apiBase}/${this.opts.apiVersion}/${igsid}?fields=name,username`;
    const res = await this.fetchFn(url, { headers: { Authorization: `Bearer ${this.opts.pageToken}` } });
    if (!res.ok) return { name: null, username: null };
    const json: any = await res.json().catch(() => ({}));
    return { name: json.name ?? null, username: json.username ?? null };
  }

  /** Responde publicamente embaixo do comentário. */
  async replyToComment(commentId: string, text: string) {
    await this.post(`${commentId}/replies`, { message: text });
  }

  /** Mensagem privada para quem comentou (1 por comentário, até 7 dias depois do comentário). */
  async sendPrivateReply(commentId: string, text: string) {
    const json = await this.post(`${this.opts.pageId}/messages`, {
      recipient: { comment_id: commentId },
      message: { text },
    });
    return (json?.message_id as string | undefined) ?? null;
  }

  async sendImage(to: string, imageUrl: string) {
    const json = await this.post(`${this.opts.pageId}/messages`, {
      recipient: { id: to },
      message: { attachment: { type: "image", payload: { url: imageUrl } } },
    });
    return (json?.message_id as string | undefined) ?? null;
  }
}

const ATTACHMENT_LABELS: Record<string, string> = {
  audio: "[o cliente enviou um áudio]",
  image: "[o cliente enviou uma imagem]",
  video: "[o cliente enviou um vídeo]",
  share: "[o cliente compartilhou uma publicação]",
  story_mention: "[o cliente mencionou o Zind num story]",
  ig_reel: "[o cliente compartilhou um reels]",
};

/**
 * Extrai as DMs recebidas do webhook do Instagram (campo `messages`).
 * Ignora as mensagens que o próprio Zind enviou (echo) e as de outros eventos.
 */
export function parseInstagramWebhook(body: any, ownAccountId?: string): InboundMessage[] {
  const out: InboundMessage[] = [];
  if (body?.object !== "instagram") return out;
  for (const entry of body.entry ?? []) {
    for (const ev of entry.messaging ?? []) {
      const m = ev.message;
      if (!m || m.is_echo || m.is_deleted) continue;
      const from: string | undefined = ev.sender?.id;
      if (!from || from === ownAccountId) continue;

      let text: string | undefined = m.text;
      if (!text && m.attachments?.length) {
        const type = m.attachments[0].type;
        text = ATTACHMENT_LABELS[type] ?? `[o cliente enviou: ${type}]`;
      }
      if (m.reply_to?.story) {
        text = `[respondendo a um story do Zind] ${text ?? ""}`.trim();
      }
      if (!text) continue;
      out.push({
        channel: "instagram",
        from,
        name: null,
        text,
        externalId: m.mid,
        timestamp: new Date(Number(ev.timestamp ?? Date.now())),
      });
    }
  }
  return out;
}

/** Mensagens que a conta do Zind enviou (echo). Usado para saber quando alguém da equipe respondeu pela caixa do Instagram. */
export function parseInstagramEchoes(body: any): { customerId: string; externalId: string }[] {
  const out: { customerId: string; externalId: string }[] = [];
  if (body?.object !== "instagram") return out;
  for (const entry of body.entry ?? []) {
    for (const ev of entry.messaging ?? []) {
      if (ev.message?.is_echo && ev.recipient?.id && ev.message.mid) {
        out.push({ customerId: ev.recipient.id, externalId: ev.message.mid });
      }
    }
  }
  return out;
}

export interface InstagramComment {
  commentId: string;
  text: string;
  fromId: string;
  username: string | null;
  mediaId: string | null;
}

/** Comentários novos nos posts (webhook do campo `comments`). */
export function parseInstagramComments(body: any, ownAccountId?: string): InstagramComment[] {
  const out: InstagramComment[] = [];
  if (body?.object !== "instagram") return out;
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "comments") continue;
      const v = change.value ?? {};
      if (!v.id || !v.text || !v.from?.id || v.from.id === ownAccountId) continue;
      out.push({
        commentId: v.id,
        text: v.text,
        fromId: v.from.id,
        username: v.from.username ?? null,
        mediaId: v.media?.id ?? null,
      });
    }
  }
  return out;
}
