import { readFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { buildTools, createClaudeAgent } from "./agent/agent.js";
import { loadKnowledge, type Knowledge } from "./agent/knowledge.js";
import type { Config } from "./config.js";
import { MemoryStore } from "./store/memory.js";
import { PostgresStore } from "./store/postgres.js";
import type { Store } from "./store/types.js";

export function buildSystemPrompt(config: Config, knowledge: Knowledge): string {
  return readFileSync(config.PROMPT_FILE, "utf8")
    .replaceAll("{{AGENT_NAME}}", config.AGENT_NAME)
    .replaceAll("{{CONHECIMENTO}}", knowledge.text || "(vazio)");
}

export function buildAgent(config: Config, knowledge: Knowledge) {
  return createClaudeAgent({
    client: new Anthropic(),
    model: config.CLAUDE_MODEL,
    effort: config.CLAUDE_EFFORT,
    systemPrompt: buildSystemPrompt(config, knowledge),
    tools: buildTools(knowledge.packages),
  });
}

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
