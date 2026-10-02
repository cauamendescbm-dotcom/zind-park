import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";
import type { InstagramClient, InstagramComment } from "../channels/instagram.js";
import type { Store } from "../store/types.js";

/**
 * "Comente PROMO que eu te mando no direct": a forma permitida pela Meta de chegar no Direct
 * de quem ainda não conversou com o Zind. Configurado em campanhas/comentarios-instagram.json.
 */
const triggerSchema = z.object({
  palavra: z.string().min(1),
  resposta_publica: z.string().min(1),
  mensagem_privada: z.string().min(1),
  /** Opcional: só vale para este post (id da mídia). */
  post_id: z.string().optional(),
});
export type CommentTrigger = z.infer<typeof triggerSchema>;

export function loadCommentTriggers(file: string): CommentTrigger[] {
  if (!existsSync(file)) return [];
  return z.array(triggerSchema).parse(JSON.parse(readFileSync(file, "utf8")));
}

const normalize = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase();

export function matchTrigger(comment: InstagramComment, triggers: CommentTrigger[]): CommentTrigger | null {
  const text = ` ${normalize(comment.text).replace(/[^\p{L}\p{N}]+/gu, " ")} `;
  for (const t of triggers) {
    if (t.post_id && t.post_id !== comment.mediaId) continue;
    if (text.includes(` ${normalize(t.palavra)} `)) return t;
  }
  return null;
}

const handledComments = new Set<string>();

const firstName = (username: string | null) => (username ? `@${username}` : "");

/** Responde o comentário (público + Direct) e registra no histórico da conversa. */
export async function handleComment(
  comment: InstagramComment,
  triggers: CommentTrigger[],
  deps: { store: Store; instagram: InstagramClient },
): Promise<boolean> {
  const trigger = matchTrigger(comment, triggers);
  if (!trigger) return false;
  if (handledComments.has(comment.commentId)) return false; // webhook repetido
  handledComments.add(comment.commentId);

  const dm = trigger.mensagem_privada.replaceAll("{{usuario}}", firstName(comment.username));
  const contact = await deps.store.findOrCreateContact("instagram", comment.fromId, comment.username);
  const conv = await deps.store.findOrCreateConversation(contact.id, "instagram");
  const messageId = await deps.instagram.sendPrivateReply(comment.commentId, dm);
  // Guarda com o id da Meta: assim o eco desta mensagem não é confundido com alguém da equipe.
  await deps.store.addMessage({
    conversationId: conv.id,
    direction: "out",
    author: "sistema",
    body: dm,
    intendedBody: null,
    isTypoFix: false,
    externalId: messageId ?? `comment:${comment.commentId}`,
  });
  await deps.instagram
    .replyToComment(comment.commentId, trigger.resposta_publica.replaceAll("{{usuario}}", firstName(comment.username)))
    .catch((err) => console.error("[comentarios] falha na resposta pública:", err));
  return true;
}
