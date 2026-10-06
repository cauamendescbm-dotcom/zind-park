import { readFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { buildTools, createClaudeAgent } from "./agent/agent.js";
import { loadKnowledge, type Knowledge } from "./agent/knowledge.js";
import { resolveBotMode, type Config } from "./config.js";
import type { BotSettings } from "./core/engine.js";
import { MemoryStore } from "./store/memory.js";
import { PostgresStore } from "./store/postgres.js";
import type { Channel, Store } from "./store/types.js";

const CHANNEL_NAME: Record<Channel, string> = { whatsapp: "WhatsApp", instagram: "Instagram (Direct)" };

/** Festas só são atendidas no WhatsApp; no Instagram o agente encaminha para lá. */
export const partyFlowEnabled = (channel: Channel) => channel === "whatsapp";

export function buildSystemPrompt(config: Config, knowledge: Knowledge, channel: Channel): string {
  const festas = readFileSync(`prompts/festas-${channel}.md`, "utf8");
  return readFileSync(config.PROMPT_FILE, "utf8")
    .replaceAll("{{FESTAS}}", festas.trim())
    .replaceAll("{{CANAL}}", CHANNEL_NAME[channel])
    .replaceAll("{{AGENT_NAME}}", config.AGENT_NAME)
    .replaceAll("{{WHATSAPP_LINK}}", config.ZIND_WHATSAPP_LINK)
    .replaceAll("{{CONHECIMENTO}}", knowledge.text || "(vazio)");
}

export function buildAgent(config: Config, knowledge: Knowledge, channel: Channel, client = new Anthropic()) {
  return createClaudeAgent({
    client,
    model: config.CLAUDE_MODEL,
    effort: config.CLAUDE_EFFORT,
    systemPrompt: buildSystemPrompt(config, knowledge, channel),
    tools: buildTools(knowledge.packages, { party: partyFlowEnabled(channel) }),
  });
}

/** Configuração do chatbot de intenções para o motor (undefined = tudo pelo Claude). */
export function buildBotSettings(config: Config): BotSettings | undefined {
  const mode = resolveBotMode(config);
  if (mode === "ia") return undefined;
  return { mode, whatsappLink: config.ZIND_WHATSAPP_LINK };
}

/** Precisa do Claude? (modo ia ou hibrido) */
export const usesClaude = (config: Config) => resolveBotMode(config) !== "intents";

export function buildStore(config: Config): Store {
  if (config.DATABASE_URL) return new PostgresStore(config.DATABASE_URL);
  console.warn("[app] DATABASE_URL vazio: usando banco em memória (os dados somem ao reiniciar)");
  return new MemoryStore();
}

export function loadKnowledgeWithWarnings(config: Config): Knowledge {
  const knowledge = loadKnowledge(config.KNOWLEDGE_DIR);
  for (const w of knowledge.warnings) console.warn(`[knowledge] ${w}`);
  return knowledge;
}
