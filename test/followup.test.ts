import { describe, expect, it } from "vitest";
import type { Knowledge } from "../src/agent/knowledge.js";
import type { ChannelAdapter, StaffNotifier } from "../src/channels/types.js";
import { loadConfig } from "../src/config.js";
import { ConversationEngine } from "../src/core/engine.js";
import { followupStep, followupTexts, isExcuse, isFollowupDue, isNo, isYes, runFollowups } from "../src/core/followup.js";
import { MemoryStore } from "../src/store/memory.js";

const knowledge: Knowledge = { text: "", missingCount: 0, warnings: [], packages: [], holidays: [] };
const notifier: StaffNotifier = { notifyOrganizer: async () => {} };
const brt = (s: string) => new Date(`${s}-03:00`);

class FakeWhatsApp implements ChannelAdapter {
  readonly channel = "whatsapp" as const;
  sent: { to: string; text: string }[] = [];
  templates: { to: string; name: string; params: string[] }[] = [];
  async showTyping() {}
  async sendText(to: string, text: string) {
    this.sent.push({ to, text });
    return `out-${this.sent.length}`;
  }
  async sendTemplate(to: string, name: string, _lang: string, params: string[]) {
    this.templates.push({ to, name, params });
    return `tpl-${this.templates.length}`;
  }
}

function setup(hours: number, start = brt("2026-10-14T14:00:00")) {
  const store = new MemoryStore();
  const wa = new FakeWhatsApp();
  let now = start;
  let aiCalls = 0;
  const engine = new ConversationEngine({
    store,
    channels: { whatsapp: wa },
    notifier,
    agents: { whatsapp: async () => (aiCalls++, "Resposta da IA") },
    knowledge,
    typoRate: 0,
    debounceMs: 1,
    humanDelays: false,
    followupHours: hours,
    now: () => now,
  });
  let n = 0;
  const say = async (text: string, from = "5547999990000") => {
    await engine.receive({ channel: "whatsapp", from, name: "Maria Silva", text, externalId: `in-${++n}`, timestamp: now });
    await engine.idle();
  };
  const run = (template?: string) =>
    runFollowups({ store, whatsapp: wa, hours, template, templateLang: "pt_BR", startHour: 9, endHour: 21, now, log: () => {} });
  const contactId = async (from = "5547999990000") => (await store.findOrCreateContact("whatsapp", from)).id;
  return { store, wa, say, run, contactId, setNow: (d: Date) => (now = d), aiCalls: () => aiCalls };
}

describe("desculpas", () => {
  it("reconhece as frases da planilha", () => {
    for (const t of [
      "vou pensar", "Vou pensar e te falo", "depois eu te falo", "depois te aviso", "vou ver com meu marido",
      "Vou ver com a minha esposa", "preciso conversar com meu sócio", "te aviso", "falo com você mais tarde",
      "vejo isso semana que vem", "agora não posso", "agora nao da", "estou ocupada", "tô ocupado agora",
    ]) expect(isExcuse(t), t).toBe(true);
  });

  it("não confunde com pergunta nem com data", () => {
    for (const t of [
      "quanto custa?", "vou pensar no tema, qual o valor do lounge?", "quero fazer semana que vem",
      "posso ir mais tarde", "oi", "obrigada", "qual horário vocês abrem",
    ]) expect(isExcuse(t), t).toBe(false);
  });

  it("sim e não", () => {
    for (const t of ["sim", "Pode sim!", "claro", "ok", "pode me chamar", "👍"]) expect(isYes(t), t).toBe(true);
    for (const t of ["não", "nao precisa", "não, obrigada", "pode deixar", "eu te chamo"]) expect(isNo(t), t).toBe(true);
    expect(isYes("não")).toBe(false);
  });
});

describe("retorno no mesmo dia (menos de 24h, padrão)", () => {
  it("o padrão é 20 horas", () => {
    expect(loadConfig({}).FOLLOWUP_HORAS).toBe(20);
  });

  it('"vou pensar" recebe resposta fixa, sem IA, e entra na lista', async () => {
    const t = setup(20);
    await t.say("vou pensar");
    expect(t.wa.sent.map((s) => s.text).join("\n")).toBe(followupTexts.noted);
    expect(t.aiCalls()).toBe(0);
    expect(await t.store.getFollowup(await t.contactId())).toMatchObject({ status: "aguardando", excuse: "vou pensar" });
  });

  it("manda o retorno 20h depois, como texto livre, e guarda com o id da Meta", async () => {
    const t = setup(20);
    await t.say("vou ver com meu marido");
    const before = t.wa.sent.length;

    t.setNow(brt("2026-10-15T09:30:00")); // 19h30 depois: ainda não
    expect((await t.run()).enviados).toBe(0);

    t.setNow(brt("2026-10-15T10:05:00"));
    expect((await t.run()).enviados).toBe(1);
    const sent = t.wa.sent.slice(before);
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toBe(followupTexts.message("Maria"));
    expect(sent[0].text.split("\n").length).toBeLessThanOrEqual(3);
    expect(t.wa.templates).toHaveLength(0);

    const f = await t.store.getFollowup(await t.contactId());
    expect(f).toMatchObject({ status: "enviado" });
    expect(await t.store.hasExternalMessage(`out-${before + 1}`)).toBe(true);
    expect((await t.run()).enviados).toBe(0); // não manda duas vezes
  });

  it("quem voltou a conversar antes não recebe", async () => {
    const t = setup(20);
    await t.say("depois eu te falo");
    t.setNow(brt("2026-10-14T18:00:00"));
    await t.say("qual o horário de sábado?");
    expect(t.aiCalls()).toBe(1); // a pergunta seguiu o fluxo normal
    t.setNow(brt("2026-10-15T11:00:00"));
    const before = t.wa.sent.length;
    await t.run();
    expect(t.wa.sent.length).toBe(before);
    expect((await t.store.getFollowup(await t.contactId()))!.status).toBe("respondeu");
  });

  it("não manda fora do horário e antecipa quando a janela de 24h fecharia de madrugada", async () => {
    const t = setup(20, brt("2026-10-14T01:00:00"));
    await t.say("vou pensar");
    t.setNow(brt("2026-10-14T08:00:00"));
    expect((await t.run()).foraDoHorario).toBe(true);
    t.setNow(brt("2026-10-14T15:00:00"));
    expect((await t.run()).enviados).toBe(0);
    // Às 21h para de mandar e a janela fecha à 1h: a última rodada antes das 21h manda.
    t.setNow(brt("2026-10-14T20:45:00"));
    expect((await t.run()).enviados).toBe(1);
  });

  it("isFollowupDue: espera o tempo combinado quando a janela continua aberta amanhã", () => {
    const o = { hours: 20, startHour: 9, endHour: 21, hasTemplate: false };
    const accepted = brt("2026-10-14T14:00:00");
    expect(isFollowupDue({ acceptedAt: accepted }, accepted, o, brt("2026-10-14T20:50:00"))).toBe(false);
    expect(isFollowupDue({ acceptedAt: accepted }, accepted, o, brt("2026-10-15T10:00:00"))).toBe(true);
  });

  it("não entra na lista quem pediu para sair", async () => {
    const t = setup(20);
    await t.say("sair");
    await t.say("vou pensar");
    expect(await t.store.getFollowup(await t.contactId())).toBeNull();
  });

  it("não vale durante a coleta da festa nem no Instagram", () => {
    const contact = { id: "c", name: null, whatsappId: "5547", instagramId: null, waOptIn: false, optOutAt: null, tags: [] };
    const conv = { id: "v", contactId: "c", channel: "whatsapp" as const, state: "aberta" as const, lastInboundAt: null, typoUsed: false, pausedUntil: null, botState: null };
    const now = new Date();
    expect(followupStep(null, "vou pensar", { conv, contact, hours: 20, now }).save).not.toBeNull();
    expect(followupStep(null, "vou pensar", { conv, contact, hours: 20, now, collectingParty: true }).save).toBeNull();
    expect(followupStep(null, "vou pensar", { conv: { ...conv, state: "coletando_festa" }, contact, hours: 20, now }).save).toBeNull();
    expect(followupStep(null, "vou pensar", { conv: { ...conv, channel: "instagram" }, contact, hours: 20, now }).reply).toBeNull();
  });

  it("pedir para sair depois cancela o retorno", async () => {
    const t = setup(20);
    await t.say("vou pensar");
    await t.store.setOptOut(await t.contactId());
    t.setNow(brt("2026-10-15T10:30:00"));
    expect((await t.run()).cancelados).toBe(1);
  });
});

describe("retorno de 3 dias (precisa de permissão e de modelo aprovado)", () => {
  it("pergunta antes; só quem diz sim recebe, e só com o modelo", async () => {
    const t = setup(72);
    await t.say("vou pensar");
    expect(t.wa.sent.at(-1)!.text).toBe(followupTexts.ask(72));
    expect(followupTexts.ask(72)).toContain("daqui a 3 dias");
    await t.say("pode sim");
    expect(t.wa.sent.at(-1)!.text).toBe(followupTexts.accepted(72));
    expect((await t.store.getFollowup(await t.contactId()))!.status).toBe("aguardando");

    t.setNow(brt("2026-10-17T15:00:00"));
    const semModelo = await t.run();
    expect(semModelo.enviados).toBe(0);
    expect(semModelo.esperandoModelo).toBe(1);

    const comModelo = await t.run("retomar_conversa");
    expect(comModelo.enviados).toBe(1);
    expect(t.wa.templates).toEqual([{ to: "5547999990000", name: "retomar_conversa", params: ["Maria"] }]);
  });

  it("quem diz não fica fora e não é perguntado de novo", async () => {
    const t = setup(72);
    await t.say("vou pensar");
    await t.say("não precisa");
    expect(t.wa.sent.at(-1)!.text).toBe(followupTexts.declined);
    await t.say("vou pensar");
    expect((await t.store.getFollowup(await t.contactId()))!.status).toBe("recusado");
  });
});
