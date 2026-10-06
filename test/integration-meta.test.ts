import { describe, expect, it } from "vitest";
import { createClaudeAgent, buildTools, type AgentRunner } from "../src/agent/agent.js";
import { estimateCostUsd } from "../src/agent/pricing.js";
import type { Knowledge } from "../src/agent/knowledge.js";
import type { ChannelAdapter, StaffNotifier } from "../src/channels/types.js";
import { channelOfWebhook } from "../src/channels/webhook.js";
import { loadConfig, staffNumbers } from "../src/config.js";
import { ConversationEngine, parseStaffCommand } from "../src/core/engine.js";
import { MemoryStore } from "../src/store/memory.js";

const knowledge: Knowledge = { text: "", missingCount: 0, warnings: [], packages: [], holidays: [] };

class FakeChannel implements ChannelAdapter {
  readonly channel = "whatsapp" as const;
  sent: { to: string; text: string }[] = [];
  async showTyping() {}
  async sendText(to: string, text: string) {
    this.sent.push({ to, text });
    return `out-${this.sent.length}`;
  }
}
const notifier: StaffNotifier = { notifyOrganizer: async () => {} };

function setup(agent: AgentRunner, extra: Partial<ConstructorParameters<typeof ConversationEngine>[0]> = {}) {
  const store = new MemoryStore();
  const channel = new FakeChannel();
  const engine = new ConversationEngine({
    store,
    channels: { whatsapp: channel },
    notifier,
    agents: { whatsapp: agent },
    knowledge,
    typoRate: 0,
    debounceMs: 1,
    humanDelays: false,
    staffNumbers: ["5547988887777"],
    ignoreFrom: ["5547988887777"],
    ...extra,
  });
  let n = 0;
  const say = async (text: string, from = "5541999990000", timestamp = new Date()) => {
    await engine.receive({ channel: "whatsapp", from, name: "Maria", text, externalId: `in-${++n}`, timestamp });
    await engine.idle();
  };
  return { store, channel, engine, say };
}

describe("variáveis de ambiente com os nomes curtos", () => {
  it("PHONE_NUMBER_ID, VERIFY_TOKEN, APP_SECRET e INSTAGRAM_TOKEN", () => {
    const c = loadConfig({ PHONE_NUMBER_ID: "123", VERIFY_TOKEN: "v", APP_SECRET: "s", INSTAGRAM_TOKEN: "ig" });
    expect(c.WHATSAPP_PHONE_NUMBER_ID).toBe("123");
    expect(c.WHATSAPP_VERIFY_TOKEN).toBe("v");
    expect(c.INSTAGRAM_VERIFY_TOKEN).toBe("v");
    expect(c.META_APP_SECRET).toBe("s");
    expect(c.INSTAGRAM_PAGE_TOKEN).toBe("ig");
  });

  it("custo: Haiku, 10 mensagens de histórico e resposta limitada por padrão", () => {
    const c = loadConfig({});
    expect(c.CLAUDE_MODEL).toBe("claude-haiku-4-5-20251001");
    expect(c.AI_HISTORY_LIMIT).toBe(10);
    expect(c.AI_MAX_TOKENS).toBeLessThanOrEqual(1000);
  });

  it("números da equipe", () => {
    expect(staffNumbers(loadConfig({ ORGANIZADORA_WHATSAPP: "+55 47 98888-7777", EQUIPE_WHATSAPP: "5547911112222, 5547933334444" })))
      .toEqual(["5547988887777", "5547911112222", "5547933334444"]);
  });
});

describe("webhook único", () => {
  it("identifica o canal pelo campo object", () => {
    expect(channelOfWebhook({ object: "whatsapp_business_account" })).toBe("whatsapp");
    expect(channelOfWebhook({ object: "instagram" })).toBe("instagram");
    expect(channelOfWebhook({ object: "page" })).toBe("instagram");
    expect(channelOfWebhook({ object: "user" })).toBeNull();
    expect(channelOfWebhook(null)).toBeNull();
  });
});

describe("pausar por número", () => {
  it("entende os comandos", () => {
    expect(parseStaffCommand("#pausar 5547999990000")).toEqual({ action: "pausar", target: "5547999990000", hours: null });
    expect(parseStaffCommand("pausar (47) 99999-0000 48")).toEqual({ action: "pausar", target: "5547999990000", hours: 48 });
    expect(parseStaffCommand("#voltar 5547999990000")).toMatchObject({ action: "voltar" });
    expect(parseStaffCommand("pausar a festa")).toBeNull();
    expect(parseStaffCommand("oi, tudo bem?")).toBeNull();
  });

  it("a equipe pausa e retoma pelo WhatsApp", async () => {
    let calls = 0;
    const { channel, say } = setup(async () => (calls++, "Oi!"));
    await say("#pausar 5541999990000", "5547988887777");
    expect(channel.sent.at(-1)).toMatchObject({ to: "5547988887777" });
    expect(channel.sent.at(-1)!.text).toContain("pausado");

    await say("oi, alguém aí?");
    expect(calls).toBe(0); // pausado: o bot não responde
    expect(channel.sent.filter((s) => s.to === "5541999990000")).toHaveLength(0);

    await say("#voltar 5541999990000", "5547988887777");
    await say("e agora?");
    expect(calls).toBe(1);
    expect(channel.sent.at(-1)).toEqual({ to: "5541999990000", text: "Oi!" });
  });

  it("mensagem normal da equipe continua sem resposta do bot", async () => {
    let calls = 0;
    const { channel, say } = setup(async () => (calls++, "Oi!"));
    await say("bom dia", "5547988887777");
    expect(calls).toBe(0);
    expect(channel.sent).toHaveLength(0);
  });
});

describe("janela de 24h", () => {
  it("não manda mensagem livre fora da janela", async () => {
    let calls = 0;
    const { channel, say } = setup(async () => (calls++, "Oi!"));
    await say("oi", "5541999990000", new Date(Date.now() - 25 * 3600e3)); // webhook atrasado
    expect(channel.sent).toHaveLength(0);
    expect(calls).toBe(0);
  });
});

describe("mensagem que não é texto", () => {
  it("pede texto sem chamar a IA", async () => {
    let calls = 0;
    const { channel, say } = setup(async () => (calls++, "Oi!"), { bot: { mode: "hibrido", whatsappLink: "https://wa.me/x", log: () => {} } });
    await say("[o cliente enviou um áudio]");
    expect(calls).toBe(0);
    expect(channel.sent.map((s) => s.text).join(" ")).toContain("texto");
  });
});

describe("custo da IA", () => {
  it("manda só as últimas 10 mensagens para a IA", async () => {
    const sizes: number[] = [];
    const { say } = setup(async ({ history }) => (sizes.push(history.length), "ok"));
    for (let i = 0; i < 8; i++) await say(`pergunta ${i}`);
    // 8 perguntas + 7 respostas = 15 mensagens; a IA vê no máximo 10.
    expect(Math.max(...sizes)).toBeLessThanOrEqual(10);
  });

  it("limita max_tokens e registra os tokens de cada resposta com o canal", async () => {
    const responses = [
      { stop_reason: "tool_use", content: [{ type: "tool_use", id: "t1", name: "chamar_humano", input: { motivo: "x" } }],
        usage: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 3000, cache_creation_input_tokens: 0 } },
      { stop_reason: "end_turn", content: [{ type: "text", text: "Vou confirmar 💛" }],
        usage: { input_tokens: 150, output_tokens: 30, cache_read_input_tokens: 3000, cache_creation_input_tokens: 0 } },
    ];
    const requests: any[] = [];
    const client = { beta: { messages: { create: async (r: any) => (requests.push(r), responses.shift()) } } } as any;
    const agent = createClaudeAgent({ client, model: "claude-haiku-4-5-20251001", effort: "low", systemPrompt: "s", tools: buildTools([]), maxTokens: 400 });
    const { store, say } = setup(agent);
    await say("vocês têm estacionamento coberto pra van?");

    expect(requests.every((r) => r.max_tokens === 400)).toBe(true);
    expect(store.aiUsage).toHaveLength(1);
    expect(store.aiUsage[0]).toMatchObject({
      channel: "whatsapp", model: "claude-haiku-4-5-20251001",
      inputTokens: 250, outputTokens: 50, cacheReadTokens: 6000, calls: 2,
    });
    // Haiku: US$ 1/M entrada, 5/M saída, 0,10/M leitura de cache
    expect(store.aiUsage[0].costUsd).toBeCloseTo((250 * 1 + 50 * 5 + 6000 * 0.1) / 1e6, 9);
  });

  it("modelo fora da tabela de preços fica sem custo estimado", () => {
    expect(estimateCostUsd({ model: "outro", inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0, calls: 1 })).toBeNull();
  });
});
