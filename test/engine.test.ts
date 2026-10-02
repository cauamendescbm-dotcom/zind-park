import { describe, expect, it } from "vitest";
import type { AgentRunner } from "../src/agent/agent.js";
import type { Knowledge } from "../src/agent/knowledge.js";
import type { ChannelAdapter, StaffAlertKind, StaffNotifier } from "../src/channels/types.js";
import { buildHistory, ConversationEngine } from "../src/core/engine.js";
import { MemoryStore } from "../src/store/memory.js";

const knowledge: Knowledge = {
  text: "",
  missingCount: 0,
  warnings: [],
  packages: [
    { id: "pacote_1", nome: "Encanto", valor: 3500, resumo: "" },
    { id: "pacote_2", nome: "Magia", valor: 5200, resumo: "" },
  ],
};

class FakeChannel implements ChannelAdapter {
  readonly channel = "whatsapp" as const;
  sent: string[] = [];
  typing = 0;
  async showTyping() {
    this.typing++;
  }
  async sendText(_to: string, text: string) {
    this.sent.push(text);
    return `out-${this.sent.length}`;
  }
}

class FakeNotifier implements StaffNotifier {
  alerts: { kind: StaffAlertKind; message: string; params: string[] }[] = [];
  async notifyOrganizer(kind: StaffAlertKind, message: string, params: string[]) {
    this.alerts.push({ kind, message, params });
  }
}

function setup(agent: AgentRunner, typoRate = 0) {
  const store = new MemoryStore();
  const channel = new FakeChannel();
  const notifier = new FakeNotifier();
  const engine = new ConversationEngine({
    store,
    channels: { whatsapp: channel },
    notifier,
    agents: { whatsapp: agent },
    knowledge,
    typoRate,
    debounceMs: 1,
    humanDelays: true,
    sleep: async () => {},
    rng: () => 0,
  });
  let n = 0;
  const say = async (text: string) => {
    await engine.receive({
      channel: "whatsapp",
      from: "5541999990000",
      name: "Maria",
      text,
      externalId: `in-${++n}`,
      timestamp: new Date(),
    });
    await engine.idle();
  };
  return { store, channel, notifier, engine, say };
}

describe("ConversationEngine", () => {
  it("responde em balões com digitando antes de cada um", async () => {
    const { channel, say } = setup(async () => "Oi, Maria! 💛\n---\nComo posso te ajudar hoje?");
    await say("oi");
    expect(channel.sent).toEqual(["Oi, Maria! 💛", "Como posso te ajudar hoje?"]);
    expect(channel.typing).toBe(2);
  });

  it("junta mensagens seguidas do cliente numa resposta só", async () => {
    let calls = 0;
    const { engine, channel } = setup(async ({ history }) => {
      calls++;
      return `recebi: ${history.at(-1)!.content}`;
    });
    for (const [i, t] of ["oi", "tudo bem?", "queria saber de festa"].entries()) {
      await engine.receive({ channel: "whatsapp", from: "55", name: null, text: t, externalId: `x${i}`, timestamp: new Date() });
    }
    await engine.idle();
    expect(calls).toBe(1);
    expect(channel.sent[0]).toBe("recebi: oi\ntudo bem?\nqueria saber de festa");
  });

  it("ignora webhook repetido", async () => {
    const { engine, store } = setup(async () => "ok");
    const msg = { channel: "whatsapp" as const, from: "55", name: null, text: "oi", externalId: "dup", timestamp: new Date() };
    await engine.receive(msg);
    await engine.receive(msg);
    await engine.idle();
    expect(store.messages.filter((m) => m.direction === "in")).toHaveLength(1);
  });

  it("fluxo de festa: coleta, repassa, fecha o lead e avisa a organizadora", async () => {
    const results: string[] = [];
    const { store, notifier, say } = setup(async ({ actions }) => {
      results.push(await actions.saveParty({ customerName: "Maria", desiredDate: "15/11", guests: 40 }));
      results.push(await actions.saveParty({ theme: "Frozen", packageId: "pacote_2" }));
      results.push(await actions.completeParty());
      return "Prontinho! A organizadora vai falar com você 💛";
    });
    await say("quero uma festa");

    expect(results[0]).toContain("faltam: tema, pacote");
    const lead = [...store.leads.values()][0];
    expect(lead).toMatchObject({
      status: "fechado",
      customerContact: "+5541999990000", // veio do WhatsApp, sem perguntar
      packagePrice: 5200, // do pacotes.json, nunca do modelo
    });
    expect([...store.conversations.values()][0].state).toBe("repassada");
    expect(notifier.alerts).toHaveLength(1);
    expect(notifier.alerts[0].kind).toBe("lead");
    expect(notifier.alerts[0].message).toContain("Tema: Frozen");
    expect(notifier.alerts[0].message).toContain("Pacote: Magia");
    expect(notifier.alerts[0].message).toContain("R$");
    expect(notifier.alerts[0].params).toHaveLength(7);
  });

  it("não repassa com dados faltando e não aceita pacote inexistente", async () => {
    const errors: string[] = [];
    const { store, notifier, say } = setup(async ({ actions }) => {
      await actions.saveParty({ customerName: "Maria" });
      await actions.completeParty().catch((e) => errors.push(e.message));
      await actions.saveParty({ packageId: "pacote_99" }).catch((e) => errors.push(e.message));
      return "ok";
    });
    await say("festa");
    expect(errors[0]).toContain("data desejada");
    expect(errors[1]).toContain("Pacote inválido");
    expect([...store.leads.values()][0].status).toBe("novo");
    expect(notifier.alerts).toHaveLength(0);
  });

  it("depois do repasse não coleta mais dados", async () => {
    let second = "";
    let turn = 0;
    const { say } = setup(async ({ actions, stateText }) => {
      if (turn++ === 0) {
        await actions.saveParty({ customerName: "M", desiredDate: "1/1", guests: 10, theme: "t", packageId: "pacote_1" });
        await actions.completeParty();
      } else {
        expect(stateText).toContain("JÁ REPASSADA");
        second = await actions.saveParty({ guests: 50 });
      }
      return "ok";
    });
    await say("festa");
    await say("muda pra 50 convidados");
    expect(second).toContain("já foi repassada");
  });

  it("chamar humano avisa a organizadora com o motivo", async () => {
    const { notifier, store, say } = setup(async ({ actions }) => {
      await actions.callHuman("Pode levar cachorro?");
      return "Deixa eu confirmar e já te retorno 💛";
    });
    await say("pode levar cachorro?");
    expect(store.humanRequests[0].reason).toBe("Pode levar cachorro?");
    expect(notifier.alerts[0]).toMatchObject({ kind: "duvida" });
    expect(notifier.alerts[0].message).toContain("+5541999990000");
  });

  it("errinho: no máximo 1 por conversa e o histórico guarda o texto certo", async () => {
    const { channel, store, say } = setup(async () => "Que alegria planejar essa festa", 1);
    await say("oi");
    await say("oi de novo");
    const fixes = channel.sent.filter((t) => t.startsWith("*"));
    expect(fixes).toHaveLength(1);
    const history = buildHistory(store.messages);
    for (const turn of history.filter((h) => h.role === "assistant")) {
      expect(turn.content).toBe("Que alegria planejar essa festa");
    }
  });
});

describe("ConversationEngine: opt-out e Instagram", () => {
  it("SAIR tira das campanhas na hora, sem chamar o modelo", async () => {
    let called = false;
    const { store, channel, say } = setup(async () => ((called = true), "x"));
    await say("SAIR");
    expect(called).toBe(false);
    expect([...store.contacts.values()][0].optOutAt).not.toBeNull();
    expect(channel.sent[0]).toContain("não vai mais receber");
  });

  it("Instagram usa o agente do Instagram e mostra a campanha no histórico", async () => {
    const store = new MemoryStore();
    const ig = new FakeChannel() as any;
    let seen: any[] = [];
    const engine = new ConversationEngine({
      store,
      channels: { instagram: ig },
      notifier: new FakeNotifier(),
      agents: { instagram: async ({ history }) => ((seen = history), "Oi! 💛") },
      knowledge,
      typoRate: 0,
      debounceMs: 1,
      humanDelays: false,
    });
    const c = await store.findOrCreateContact("instagram", "u1", "Ana");
    const conv = await store.findOrCreateConversation(c.id, "instagram");
    await store.addMessage({ conversationId: conv.id, direction: "out", author: "sistema", body: "Promo de outubro", intendedBody: null, isTypoFix: false, externalId: null });
    await engine.receive({ channel: "instagram", from: "u1", name: "Ana", text: "quero!", externalId: "m1", timestamp: new Date() });
    await engine.idle();
    expect(ig.sent).toEqual(["Oi! 💛"]);
    expect(seen).toHaveLength(1);
    expect(seen[0].role).toBe("user");
    expect(seen[0].content).toContain("Promo de outubro");
    expect(seen[0].content).toMatch(/quero!$/);
  });
});

describe("ConversationEngine: robustez", () => {
  it("responde a mensagem que chegou enquanto os balões ainda estavam saindo", async () => {
    const store = new MemoryStore();
    const channel = new FakeChannel();
    const histories: any[][] = [];
    let engine!: ConversationEngine;
    let injected = false;
    channel.sendText = async function (this: FakeChannel, _to: string, text: string) {
      this.sent.push(text);
      if (!injected) {
        injected = true; // cliente manda outra mensagem no meio da resposta
        await engine.receive({ channel: "whatsapp", from: "55", name: null, text: "e o preço?", externalId: "late", timestamp: new Date() });
      }
      return `out-${this.sent.length}`;
    };
    engine = new ConversationEngine({
      store,
      channels: { whatsapp: channel },
      notifier: new FakeNotifier(),
      agents: { whatsapp: async ({ history }) => (histories.push(history), "Oi!\n---\nTudo bem?") },
      knowledge,
      typoRate: 0,
      debounceMs: 1,
      humanDelays: false,
    });
    await engine.receive({ channel: "whatsapp", from: "55", name: null, text: "oi", externalId: "first", timestamp: new Date() });
    await engine.idle();
    expect(histories).toHaveLength(2);
    expect(histories[1].at(-1)).toEqual({ role: "user", content: "e o preço?" });
  });

  it("se o agente falhar, o cliente recebe uma resposta e a equipe é avisada", async () => {
    const { channel, notifier, say } = setup(async () => {
      throw new Error("API fora do ar");
    });
    await say("oi");
    expect(channel.sent.join(" ")).toContain("confirmar");
    expect(notifier.alerts[0].kind).toBe("duvida");
  });

  it("ignora mensagens da organizadora", async () => {
    const store = new MemoryStore();
    let called = false;
    const engine = new ConversationEngine({
      store,
      channels: { whatsapp: new FakeChannel() },
      notifier: new FakeNotifier(),
      agents: { whatsapp: async () => ((called = true), "x") },
      knowledge,
      typoRate: 0,
      debounceMs: 1,
      humanDelays: false,
      ignoreFrom: ["5541988887777"],
    });
    await engine.receive({ channel: "whatsapp", from: "5541988887777", name: null, text: "ok, vou ligar", externalId: "o1", timestamp: new Date() });
    await engine.idle();
    expect(called).toBe(false);
    expect(store.messages).toHaveLength(0);
  });

  it("fica em silêncio quando alguém da equipe assume a conversa", async () => {
    let calls = 0;
    const { engine, say, channel } = setup(async () => (calls++, "Oi!"));
    await say("oi");
    await engine.pauseForHuman("whatsapp", "5541999990000");
    await say("ainda está aí?");
    expect(calls).toBe(1);
    expect(channel.sent).toEqual(["Oi!"]);
  });
});
