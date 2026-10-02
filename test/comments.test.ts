import { describe, expect, it, vi } from "vitest";
import { handleComment, loadCommentTriggers, matchTrigger } from "../src/campaigns/comment-triggers.js";
import { parseInstagramComments, parseInstagramEchoes } from "../src/channels/instagram.js";
import { parseWhatsAppEchoes } from "../src/channels/whatsapp.js";
import { buildHistory } from "../src/core/engine.js";
import { MemoryStore } from "../src/store/memory.js";

const triggers = [
  { palavra: "PROMO", resposta_publica: "Te chamei no direct, {{usuario}}! 💛", mensagem_privada: "Oi {{usuario}}! Aqui está a promoção 💛" },
  { palavra: "Férias", resposta_publica: "Chamei!", mensagem_privada: "Férias no Zind!", post_id: "post1" },
];
const comment = (text: string, extra: object = {}) => ({ commentId: "c1", text, fromId: "u1", username: "ana", mediaId: "post9", ...extra });

describe("matchTrigger", () => {
  it("acha a palavra sem ligar para maiúsculas, acento e pontuação", () => {
    expect(matchTrigger(comment("quero a promo!!"), triggers)?.palavra).toBe("PROMO");
    expect(matchTrigger(comment("ferias", { mediaId: "post1" }), triggers)?.palavra).toBe("Férias");
  });

  it("não confunde com pedaço de palavra e respeita o post", () => {
    expect(matchTrigger(comment("promoção boa"), triggers)).toBeNull();
    expect(matchTrigger(comment("férias"), triggers)).toBeNull(); // outro post
  });

  it("o arquivo de exemplo do repositório é válido", () => {
    expect(loadCommentTriggers("campanhas/comentarios-instagram.json").length).toBeGreaterThan(0);
    expect(loadCommentTriggers("nao-existe.json")).toEqual([]);
  });
});

describe("handleComment", () => {
  it("manda no Direct, responde em público e guarda no histórico", async () => {
    const store = new MemoryStore();
    const instagram = {
      sendPrivateReply: vi.fn(async () => "mid.dm"),
      replyToComment: vi.fn(async () => {}),
    };
    const c = comment("PROMO", { commentId: "c-unico" });
    expect(await handleComment(c, triggers, { store, instagram: instagram as any })).toBe(true);
    expect(await handleComment(c, triggers, { store, instagram: instagram as any })).toBe(false); // repetido
    expect(instagram.sendPrivateReply).toHaveBeenCalledTimes(1);
    expect(instagram.sendPrivateReply).toHaveBeenCalledWith("c-unico", "Oi @ana! Aqui está a promoção 💛");
    expect(instagram.replyToComment).toHaveBeenCalledWith("c-unico", "Te chamei no direct, @ana! 💛");
    expect(await store.hasExternalMessage("mid.dm")).toBe(true);

    // Quando a pessoa responder no Direct, o agente sabe o que foi mandado.
    const conv = [...store.conversations.values()][0];
    await store.addMessage({ conversationId: conv.id, direction: "in", author: "cliente", body: "quero!", intendedBody: null, isTypoFix: false, externalId: "in1" });
    expect(buildHistory(store.messages)[0].content).toContain("Aqui está a promoção");
  });
});

describe("parsers de comentários e ecos", () => {
  it("lê comentários e ignora os da própria conta", () => {
    const body = {
      object: "instagram",
      entry: [{ changes: [
        { field: "comments", value: { id: "c1", text: "PROMO", from: { id: "u1", username: "ana" }, media: { id: "p1" } } },
        { field: "comments", value: { id: "c2", text: "obrigado", from: { id: "ME" }, media: { id: "p1" } } },
        { field: "mentions", value: {} },
      ] }],
    };
    expect(parseInstagramComments(body, "ME")).toEqual([
      { commentId: "c1", text: "PROMO", fromId: "u1", username: "ana", mediaId: "p1" },
    ]);
  });

  it("lê ecos do Instagram e do app do WhatsApp Business", () => {
    expect(parseInstagramEchoes({
      object: "instagram",
      entry: [{ messaging: [{ sender: { id: "ME" }, recipient: { id: "u1" }, message: { mid: "m1", is_echo: true, text: "oi" } }] }],
    })).toEqual([{ customerId: "u1", externalId: "m1" }]);
    expect(parseWhatsAppEchoes({
      entry: [{ changes: [{ field: "smb_message_echoes", value: { message_echoes: [{ from: "ZIND", to: "5541", id: "wamid.e" }] } }] }],
    })).toEqual([{ customerId: "5541", externalId: "wamid.e" }]);
  });
});
