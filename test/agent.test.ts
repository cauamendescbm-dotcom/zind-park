import { describe, expect, it, vi } from "vitest";
import { buildTools, createClaudeAgent, FALLBACK_REPLY, type AgentActions } from "../src/agent/agent.js";

const actions = (): AgentActions & { calls: string[] } => {
  const calls: string[] = [];
  return {
    calls,
    saveParty: async (d) => (calls.push(`save:${JSON.stringify(d)}`), "Salvo."),
    completeParty: async () => (calls.push("complete"), "Repassado."),
    callHuman: async (r) => (calls.push(`human:${r}`), "Equipe avisada."),
    optOut: async () => (calls.push("optout"), "ok"),
  };
};

function fakeClient(responses: any[]) {
  const create = vi.fn(async () => responses.shift());
  return { client: { beta: { messages: { create } } } as any, create };
}

const tools = buildTools([{ id: "pacote_1", nome: "A", valor: 1, resumo: "" }]);

describe("createClaudeAgent", () => {
  it("executa ferramentas e devolve o texto final", async () => {
    const { client, create } = fakeClient([
      {
        stop_reason: "tool_use",
        content: [{ type: "tool_use", id: "t1", name: "salvar_dados_festa", input: { nome: "Ana", convidados: 30 } }],
      },
      { stop_reason: "end_turn", content: [{ type: "text", text: "Anotei, Ana! 💛" }] },
    ]);
    const a = actions();
    const agent = createClaudeAgent({ client, model: "m", effort: "low", systemPrompt: "s", tools });
    const out = await agent({ history: [{ role: "user", content: "oi" }], stateText: "<estado/>", actions: a });

    expect(out).toBe("Anotei, Ana! 💛");
    expect(a.calls).toEqual([`save:${JSON.stringify({ customerName: "Ana", guests: 30 })}`]);
    const second = (create.mock.calls[1] as any[])[0];
    expect(second.messages.at(-1).content[0]).toMatchObject({ type: "tool_result", tool_use_id: "t1", content: "Salvo." });
    expect(second.fallbacks).toBe("default");
    expect(second.system[0].cache_control).toEqual({ type: "ephemeral" });
  });

  it("devolve erro para o modelo quando a entrada é inválida", async () => {
    const { client, create } = fakeClient([
      { stop_reason: "tool_use", content: [{ type: "tool_use", id: "t1", name: "chamar_humano", input: {} }] },
      { stop_reason: "end_turn", content: [{ type: "text", text: "ok" }] },
    ]);
    const agent = createClaudeAgent({ client, model: "m", effort: "low", systemPrompt: "s", tools });
    await agent({ history: [{ role: "user", content: "oi" }], stateText: "", actions: actions() });
    const result = (create.mock.calls[1] as any[])[0].messages.at(-1).content[0];
    expect(result.is_error).toBe(true);
  });

  it("em recusa chama humano e responde com a mensagem padrão", async () => {
    const { client } = fakeClient([{ stop_reason: "refusal", content: [] }]);
    const a = actions();
    const agent = createClaudeAgent({ client, model: "m", effort: "low", systemPrompt: "s", tools });
    expect(await agent({ history: [{ role: "user", content: "oi" }], stateText: "", actions: a })).toBe(FALLBACK_REPLY);
    expect(a.calls[0]).toMatch(/^human:/);
  });
});
