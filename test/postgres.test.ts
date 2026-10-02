/**
 * Testa o PostgresStore contra um Postgres de verdade, com o schema de db/schema.sql já aplicado.
 * Só roda se TEST_DATABASE_URL estiver definido (use um banco vazio, de teste).
 */
import { afterAll, describe, expect, it } from "vitest";
import { ConversationEngine } from "../src/core/engine.js";
import { PostgresStore } from "../src/store/postgres.js";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("PostgresStore", () => {
  const store = new PostgresStore(url!);
  afterAll(() => store.close());
  const suffix = String(Date.now()).slice(-6);

  it("conversa, mensagens, lead e repasse", async () => {
    const c = await store.findOrCreateContact("whatsapp", `5541900${suffix}`, "Maria");
    expect((await store.findOrCreateContact("whatsapp", `5541900${suffix}`, "Outro")).id).toBe(c.id);
    const conv = await store.findOrCreateConversation(c.id, "whatsapp");
    const until = new Date(Date.now() + 3600e3);
    await store.updateConversation(conv.id, { state: "coletando_festa", typoUsed: true, lastInboundAt: new Date(), pausedUntil: until });
    expect(await store.getConversation(conv.id)).toMatchObject({ state: "coletando_festa", typoUsed: true, pausedUntil: until });
    await store.updateConversation(conv.id, { pausedUntil: null });

    await store.addMessage({ conversationId: conv.id, direction: "in", author: "cliente", body: "oi", intendedBody: null, isTypoFix: false, externalId: `in-${suffix}` });
    await store.addMessage({ conversationId: conv.id, direction: "out", author: "agente", body: "Oi!", intendedBody: "Oi!", isTypoFix: false, externalId: null });
    expect(await store.hasExternalMessage(`in-${suffix}`)).toBe(true);
    expect((await store.recentMessages(conv.id, 10)).map((m) => m.body)).toEqual(["oi", "Oi!"]);

    await store.upsertOpenLead(conv.id, c.id, "whatsapp", { customerName: "Maria", guests: 30 });
    const lead = await store.upsertOpenLead(conv.id, c.id, "whatsapp", { theme: "Frozen" });
    expect(lead).toMatchObject({ customerName: "Maria", guests: 30, theme: "Frozen", status: "novo" });
    await store.closeLead(lead.id, 5200);
    expect(await store.getOpenLead(conv.id)).toBeNull();

    await store.addHumanRequest(conv.id, "pergunta");
  });

  it("contatos, audiência, campanha e métricas", async () => {
    const a = await store.importContact({ whatsappId: `5541911${suffix}`, name: "Ana", tags: ["clientes"], optIn: true, optInSource: "teste" });
    await store.importContact({ whatsappId: `5541911${suffix}`, name: null, tags: ["festa"], optIn: false, optInSource: "x" });
    const b = await store.importContact({ whatsappId: `5541922${suffix}`, name: "Bia", tags: [], optIn: false, optInSource: "teste" });

    const audience = await store.listAudience("whatsapp", ["festa"], new Date());
    const merged = audience.find((x) => x.id === a.id);
    expect(merged).toMatchObject({ waOptIn: true });
    expect(merged!.tags.sort()).toEqual(["clientes", "festa"]);
    expect(audience.some((x) => x.id === b.id)).toBe(false);

    const ig = await store.findOrCreateContact("instagram", `ig${suffix}`, "Igor");
    const igConv = await store.findOrCreateConversation(ig.id, "instagram");
    await store.updateConversation(igConv.id, { lastInboundAt: new Date() });
    expect((await store.listAudience("instagram", [], new Date())).some((x) => x.id === ig.id)).toBe(true);

    const camp = await store.createCampaign({
      name: "teste", channel: "whatsapp", templateName: "promo", templateLang: "pt_BR",
      templateParams: ["{{nome}}"], imageUrl: "https://x/y.jpg", text: "resumo", tags: [],
    });
    await store.recordCampaignSend({ campaignId: camp.id, contactId: a.id, externalId: `wamid-${suffix}`, error: null });
    await store.recordCampaignSend({ campaignId: camp.id, contactId: b.id, externalId: null, error: "falhou" });
    await store.updateDeliveryStatus(`wamid-${suffix}`, "read", new Date());
    await store.markCampaignReply(a.id, new Date());
    const conv = await store.findOrCreateConversation(a.id, "whatsapp");
    const lead = await store.upsertOpenLead(conv.id, a.id, "whatsapp", { customerName: "Ana" });
    await store.markCampaignLead(a.id, lead.id);
    expect(await store.campaignMetrics(camp.id)).toEqual({
      alvo: 2, enviados: 1, entregues: 1, lidos: 1, responderam: 1, leads: 1, falhas: 1,
    });

    await store.setOptOut(a.id);
    expect((await store.listAudience("whatsapp", [], new Date())).some((x) => x.id === a.id)).toBe(false);
  });

  it("motor da conversa de ponta a ponta com o banco", async () => {
    const sent: string[] = [];
    const alerts: string[] = [];
    const engine = new ConversationEngine({
      store,
      channels: { whatsapp: { channel: "whatsapp", showTyping: async () => {}, sendText: async (_t, x) => (sent.push(x), `out-${suffix}-${sent.length}`) } },
      notifier: { notifyOrganizer: async (_k, m) => void alerts.push(m) },
      agents: {
        whatsapp: async ({ actions }) => {
          await actions.saveParty({ customerName: "Rui", desiredDate: "20/12", guests: 25, theme: "Dino", packageId: "p1" });
          await actions.completeParty();
          return "Prontinho! 💛";
        },
      },
      knowledge: { text: "", missingCount: 0, warnings: [], packages: [{ id: "p1", nome: "Básico", valor: 2500, resumo: "" }] },
      typoRate: 0,
      debounceMs: 1,
      humanDelays: false,
    });
    await engine.receive({ channel: "whatsapp", from: `5541933${suffix}`, name: "Rui", text: "quero festa", externalId: `e2e-${suffix}`, timestamp: new Date() });
    await engine.idle();
    expect(sent).toEqual(["Prontinho! 💛"]);
    expect(alerts[0]).toContain(`+5541933${suffix}`);
    expect(alerts[0]).toContain("R$");
  });
});
