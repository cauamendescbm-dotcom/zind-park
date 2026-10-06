import { describe, expect, it, vi } from "vitest";
import { runBroadcast, validateBroadcast, type BroadcastInput } from "../src/campaigns/broadcast.js";
import { holidayMessage, holidaySchema, holidayTemplateParams, upcomingHolidays } from "../src/bot/data/holidays.js";
import { normalizePhone, parseContactsCsv } from "../src/campaigns/contacts.js";
import { parseWhatsAppStatuses } from "../src/channels/whatsapp.js";
import { MemoryStore } from "../src/store/memory.js";

const base: BroadcastInput = {
  name: "Promo outubro",
  channel: "whatsapp",
  tags: [],
  imageUrl: "https://cdn.zind/promo.jpg",
  text: "Promoção de outubro: 20% no ingresso",
  templateName: "promo_outubro",
  templateLang: "pt_BR",
  templateParams: ["{{nome}}"],
  dryRun: false,
};

async function seedWhatsApp(store: MemoryStore, n: number) {
  for (let i = 0; i < n; i++) {
    await store.importContact({
      whatsappId: `55419900000${String(i).padStart(2, "0")}`,
      name: `Pessoa${i} Silva`,
      tags: i % 2 ? ["clientes"] : [],
      optIn: i !== 0, // o primeiro não deu opt-in
      optInSource: "teste",
    });
  }
}

describe("contatos", () => {
  it("normaliza telefone", () => {
    expect(normalizePhone("(41) 99999-0000")).toBe("5541999990000");
    expect(normalizePhone("+55 41 99999-0000")).toBe("5541999990000");
    expect(normalizePhone("123")).toBeNull();
  });

  it("lê CSV do Excel com ponto e vírgula", () => {
    const { contacts, invalid } = parseContactsCsv(
      "telefone;nome;tags;opt_in\n(41) 99999-0000;Maria;clientes|festa;sim\n41 3333;João;;sim\n41988887777;Ana;;não",
      "site",
    );
    expect(invalid).toEqual(["41 3333"]);
    expect(contacts).toEqual([
      { whatsappId: "5541999990000", name: "Maria", tags: ["clientes", "festa"], optIn: true, optInSource: "site" },
      { whatsappId: "5541988887777", name: "Ana", tags: [], optIn: false, optInSource: "site" },
    ]);
  });
});

describe("validateBroadcast", () => {
  it("exige template no WhatsApp e conteúdo no Instagram", () => {
    expect(validateBroadcast({ ...base, templateName: null })[0]).toContain("template");
    expect(validateBroadcast({ ...base, channel: "instagram", imageUrl: null, text: null })[0]).toContain("Instagram");
    expect(validateBroadcast({ ...base, imageUrl: "http://inseguro" })[0]).toContain("https");
  });
});

describe("runBroadcast", () => {
  it("WhatsApp: manda template com foto só para quem deu opt-in e não saiu", async () => {
    const store = new MemoryStore();
    await seedWhatsApp(store, 6);
    await store.setOptOut([...store.contacts.values()][1].id);

    let n = 0;
    const sendTemplate = vi.fn(async () => `wamid.${++n}`);
    const result = await runBroadcast(base, {
      store,
      whatsapp: { sendTemplate } as any,
      ratePerSecond: 2,
      sleep: async () => {},
    });

    expect(result).toMatchObject({ audience: 4, sent: 4, failed: 0 });
    expect(sendTemplate).toHaveBeenCalledWith(
      "5541990000002",
      "promo_outubro",
      "pt_BR",
      ["Pessoa2"],
      "https://cdn.zind/promo.jpg",
    );
    // Fica no histórico da conversa para o agente saber o que foi enviado.
    expect(store.messages.filter((m) => m.author === "sistema")).toHaveLength(4);
  });

  it("filtra por tags e o modo simular não envia nada", async () => {
    const store = new MemoryStore();
    await seedWhatsApp(store, 6);
    const sendTemplate = vi.fn();
    const r = await runBroadcast({ ...base, tags: ["clientes"], dryRun: true }, { store, whatsapp: { sendTemplate } as any, ratePerSecond: 50 });
    expect(r.audience).toBe(3);
    expect(sendTemplate).not.toHaveBeenCalled();
    expect(store.campaigns.size).toBe(0);
  });

  it("respeita o limite por segundo", async () => {
    const store = new MemoryStore();
    await seedWhatsApp(store, 11); // 10 com opt-in
    const sleeps: number[] = [];
    await runBroadcast(base, {
      store,
      whatsapp: { sendTemplate: async () => "id" } as any,
      ratePerSecond: 4,
      sleep: async (ms) => void sleeps.push(ms),
    });
    expect(sleeps).toHaveLength(2); // 3 lotes de até 4 → 2 pausas
  });

  it("tenta de novo quando a Meta pede para ir mais devagar e registra falhas", async () => {
    const store = new MemoryStore();
    await seedWhatsApp(store, 3);
    let calls = 0;
    const sendTemplate = vi.fn(async (to: string) => {
      calls++;
      if (to.endsWith("01") && calls === 1) throw new Error("WhatsApp API 429: {code: 130429}");
      if (to.endsWith("02")) throw new Error("WhatsApp API 400: número inválido");
      return "ok";
    });
    const r = await runBroadcast(base, { store, whatsapp: { sendTemplate } as any, ratePerSecond: 1, sleep: async () => {} });
    expect(r).toMatchObject({ sent: 1, failed: 1 });
    expect(await store.campaignMetrics(r.campaign!.id)).toMatchObject({ alvo: 2, enviados: 1, falhas: 1 });
  });

  it("Instagram: só para quem falou com o Zind nas últimas 24h", async () => {
    const store = new MemoryStore();
    const now = new Date("2026-10-02T12:00:00Z");
    for (const [id, hoursAgo] of [["recente", 2], ["antigo", 30]] as const) {
      const c = await store.findOrCreateContact("instagram", id, id);
      const conv = await store.findOrCreateConversation(c.id, "instagram");
      await store.updateConversation(conv.id, { lastInboundAt: new Date(now.getTime() - hoursAgo * 3600e3) });
    }
    const sendImage = vi.fn(async () => "img");
    const sendText = vi.fn(async () => "txt");
    const r = await runBroadcast(
      { ...base, channel: "instagram", templateName: null, text: "Oi {{nome}}! Promoção de outubro 💛" },
      { store, instagram: { sendImage, sendText } as any, ratePerSecond: 50, now: () => now },
    );
    expect(r.sent).toBe(1);
    expect(sendImage).toHaveBeenCalledWith("recente", "https://cdn.zind/promo.jpg");
    expect(sendText).toHaveBeenCalledWith("recente", "Oi recente! Promoção de outubro 💛");
  });

  it("métricas: entregue, lida e resposta", async () => {
    const store = new MemoryStore();
    await seedWhatsApp(store, 2);
    const r = await runBroadcast(base, { store, whatsapp: { sendTemplate: async () => "wamid.X" } as any, ratePerSecond: 50 });
    for (const st of parseWhatsAppStatuses({
      entry: [{ changes: [{ value: { statuses: [{ id: "wamid.X", status: "read", timestamp: "1700000000" }] } }] }],
    })) {
      await store.updateDeliveryStatus(st.externalId, st.status, st.at);
    }
    await store.markCampaignReply([...store.contacts.values()][1].id, new Date());
    expect(await store.campaignMetrics(r.campaign!.id)).toMatchObject({ enviados: 1, entregues: 1, lidos: 1, responderam: 1 });
  });
});

describe("aviso de feriado", () => {
  const aberto = { data: "2026-10-12", nome: "Dia das Crianças", horario: "das 10h às 22h" };
  const fechado = { data: "2026-11-02", nome: "Finados", horario: "fechado" };

  it("monta a mensagem e as variáveis do template aviso_feriado", () => {
    expect(holidayMessage(aberto)).toBe(
      "Oi, {{nome}}! 💛\nNo dia 12/10 (Dia das Crianças), vamos abrir das 10h às 22h. 🎉\nQualquer dúvida, é só responder esta mensagem.",
    );
    expect(holidayTemplateParams(fechado)).toEqual(["{{nome}}", "02/11", "Finados", "o parque vai estar fechado"]);
  });

  it("só considera feriados de hoje em diante (horário de Brasília)", () => {
    // 01h de 13/10 em UTC ainda é 12/10 em Balneário Camboriú.
    expect(upcomingHolidays([fechado, aberto], new Date("2026-10-13T01:00:00Z")).map((h) => h.nome)).toEqual(["Dia das Crianças", "Finados"]);
    expect(upcomingHolidays([fechado, aberto], new Date("2026-10-13T12:00:00Z")).map((h) => h.nome)).toEqual(["Finados"]);
  });

  it("valida o feriados.json", () => {
    expect(() => holidaySchema.parse({ data: "12/10", nome: "x", horario: "fechado" })).toThrow();
  });
});
