import { describe, expect, it } from "vitest";
import type { AgentRunner } from "../../src/agent/agent.js";
import type { Knowledge } from "../../src/agent/knowledge.js";
import type { ConversationLog } from "../../src/bot/index.js";
import type { ChannelAdapter, StaffAlertKind, StaffNotifier } from "../../src/channels/types.js";
import { ConversationEngine, newInboundMessages, type BotSettings } from "../../src/core/engine.js";
import { MemoryStore } from "../../src/store/memory.js";
import type { Channel } from "../../src/store/types.js";

const knowledge: Knowledge = { text: "", missingCount: 0, warnings: [], packages: [], holidays: [] };

class FakeChannel implements ChannelAdapter {
  sent: string[] = [];
  constructor(readonly channel: Channel) {}
  async showTyping() {}
  async sendText(_to: string, text: string) {
    this.sent.push(text);
    return `out-${this.sent.length}-${Math.random()}`;
  }
}

class FakeNotifier implements StaffNotifier {
  alerts: { kind: StaffAlertKind; message: string; params: string[] }[] = [];
  async notifyOrganizer(kind: StaffAlertKind, message: string, params: string[]) {
    this.alerts.push({ kind, message, params });
  }
}

function setup(opts: { mode?: BotSettings["mode"]; agent?: AgentRunner; channel?: Channel } = {}) {
  const channelName = opts.channel ?? "whatsapp";
  const store = new MemoryStore();
  const channel = new FakeChannel(channelName);
  const notifier = new FakeNotifier();
  const logs: ConversationLog[] = [];
  const engine = new ConversationEngine({
    store,
    channels: { [channelName]: channel },
    notifier,
    agents: opts.agent ? { [channelName]: opts.agent } : {},
    bot: { mode: opts.mode ?? "intents", whatsappLink: "https://wa.me/5547000000000", log: (l) => logs.push(l) },
    knowledge,
    typoRate: 0,
    debounceMs: 1,
    humanDelays: false,
  });
  let n = 0;
  const say = async (text: string) => {
    const before = channel.sent.length;
    await engine.receive({
      channel: channelName,
      from: channelName === "whatsapp" ? "5547999990000" : "1784140000",
      name: "Maria Souza",
      text,
      externalId: `in-${++n}`,
      timestamp: new Date(),
    });
    await engine.idle();
    return channel.sent.slice(before).join("\n");
  };
  return { store, channel, notifier, logs, engine, say };
}

describe("motor + chatbot de intenções (modo intents, sem IA)", () => {
  it("responde a pergunta com a resposta oficial, em balões de até 3 linhas", async () => {
    const { channel, say, store } = setup();
    await say("Como funciona o parque?");
    expect(channel.sent.length).toBeGreaterThan(1);
    for (const b of channel.sent) expect(b.split("\n").length).toBeLessThanOrEqual(3);
    expect(channel.sent.join("\n")).toContain("R$ 80,00 por hora");
    const conv = [...store.conversations.values()][0];
    expect((conv.botState as any).lastIntent).toBe("COMO_FUNCIONA");
  });

  it("festa completa pelo bot: lead registrado, fechado e organizadora avisada", async () => {
    const { say, store, notifier } = setup();
    await say("quero fazer o aniversário da minha filha aí");
    await say("1");
    await say("sim");
    for (const t of ["20/11", "35", "16h", "7 anos", "salão vip", "Frozen", "Maria"]) await say(t);

    const lead = [...store.leads.values()][0];
    expect(lead).toMatchObject({
      status: "fechado",
      customerName: "Maria",
      customerContact: "+5547999990000", // veio do WhatsApp, sem perguntar
      desiredDate: "20/11",
      desiredTime: "16h",
      birthdayAge: "7 anos",
      guests: 35,
      space: "Salão VIP (2º andar)",
      theme: "Frozen",
      packagePrice: null, // sem PDF, sem valor
    });
    expect([...store.conversations.values()][0].state).toBe("repassada");
    expect(notifier.alerts).toHaveLength(1);
    expect(notifier.alerts[0].message).toContain("Espaço: Salão VIP");
    expect(notifier.alerts[0].message).not.toContain("Valor:");
  });

  it("2 mensagens sem entender: avisa a equipe", async () => {
    const { say, notifier, store } = setup();
    await say("asdkjh");
    const second = await say("qwpeoi");
    expect(second).toContain("Vou te encaminhar para nossa equipe");
    expect(store.humanRequests).toHaveLength(1);
    expect(notifier.alerts[0].kind).toBe("duvida");
  });

  it("mensagens seguidas viram uma resposta só", async () => {
    const { engine, channel } = setup();
    for (const [i, t] of ["oi", "que horas vocês abrem?"].entries()) {
      await engine.receive({ channel: "whatsapp", from: "55", name: null, text: t, externalId: `x${i}`, timestamp: new Date() });
    }
    await engine.idle();
    expect(channel.sent.join("\n")).toContain("terça a sexta");
    expect(channel.sent.join("\n")).not.toContain("como posso te ajudar");
  });

  it("o log não guarda telefone nem o nome digitado", async () => {
    const { say, logs } = setup();
    await say("meu número é 47 99999-1234");
    expect(logs[0].userMessage).toContain("[número]");
    expect(JSON.stringify(logs)).not.toContain("99999");
    await say("quero fechar uma festa");
    for (const t of ["20/11", "35", "16h", "7 anos", "lounge", "Frozen"]) await say(t);
    await say("Maria Souza");
    expect(logs.at(-1)!.userMessage).toBe("[dado pessoal do cliente]");
    expect(JSON.stringify(logs)).not.toContain("Souza");
    expect(logs.at(-1)).toMatchObject({ detectedIntent: "FESTAS_EVENTOS", transferredToHuman: false, fallbackUsed: false });
  });

  it("Instagram: festa vai para o link do WhatsApp", async () => {
    const { say, store } = setup({ channel: "instagram" });
    const r = await say("vocês fazem festa?");
    expect(r).toContain("https://wa.me/5547000000000");
    expect(store.leads.size).toBe(0);
  });
});

describe("modo híbrido", () => {
  it("o bot responde o que sabe e a IA só o que ele não entende", async () => {
    const asked: string[] = [];
    const { say } = setup({
      mode: "hibrido",
      agent: async ({ history }) => {
        asked.push(String(history.at(-1)!.content));
        return "Resposta da IA 💛";
      },
    });
    expect(await say("que horas abre?")).toContain("terça a sexta");
    expect(asked).toHaveLength(0);
    expect(await say("vocês fazem tatuagem?")).toBe("Resposta da IA 💛");
    expect(asked).toEqual(["vocês fazem tatuagem?"]);
  });

  it("IA no meio da coleta da festa: o bot não atropela", async () => {
    let calls = 0;
    const { say, store } = setup({
      mode: "hibrido",
      agent: async ({ actions }) => {
        calls++;
        if (calls === 1) await actions.saveParty({ customerName: "Ana" });
        return "Qual a data? 😊";
      },
    });
    await say("vocês fazem tatuagem?");
    expect([...store.conversations.values()][0].state).toBe("coletando_festa");
    await say("sábado");
    expect(calls).toBe(2);
  });

  it("sem agente configurado, o modo híbrido vira só bot", async () => {
    const { say } = setup({ mode: "hibrido" });
    expect(await say("vocês fazem tatuagem?")).toContain("Quero te ajudar!");
  });
});

describe("newInboundMessages", () => {
  const m = (id: string, direction: "in" | "out") =>
    ({ id, direction, body: id, isTypoFix: false, createdAt: new Date() }) as any;
  it("pega as mensagens depois da última respondida", () => {
    expect(newInboundMessages([m("a", "in"), m("b", "out"), m("c", "in"), m("d", "in")]).map((x) => x.id)).toEqual(["c", "d"]);
    expect(newInboundMessages([m("a", "in"), m("b", "out"), m("c", "in")], "a").map((x) => x.id)).toEqual(["c"]);
  });
});
