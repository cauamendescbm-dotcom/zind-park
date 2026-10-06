/**
 * Simulador no terminal: converse com o atendimento como se fosse um cliente no WhatsApp.
 * Banco em memória e canal de mentira (nada é enviado). Sem ANTHROPIC_API_KEY roda só o
 * chatbot de intenções; com a chave, o modo híbrido (o que o bot não entende vai para o Claude).
 *
 *   npm run simular            (com delays de "digitando")
 *   npm run simular -- --rapido (sem delays)
 *   npm run simular -- --instagram (como se fosse no Direct do Instagram, sem festas)
 */
import readline from "node:readline/promises";
import { buildAgent, buildBotSettings, loadKnowledgeWithWarnings, usesClaude } from "./app.js";
import { ConsoleChannel, ConsoleStaffNotifier } from "./channels/console.js";
import { loadConfig, resolveBotMode } from "./config.js";
import { ConversationEngine } from "./core/engine.js";
import { MemoryStore } from "./store/memory.js";

const config = loadConfig();
const fast = process.argv.includes("--rapido");
const channel = process.argv.includes("--instagram") ? "instagram" : "whatsapp";
const knowledge = loadKnowledgeWithWarnings(config);

function newSession() {
  const store = new MemoryStore();
  const engine = new ConversationEngine({
    store,
    channels: { [channel]: new ConsoleChannel(channel) },
    notifier: new ConsoleStaffNotifier(),
    agents: usesClaude(config) ? { [channel]: buildAgent(config, knowledge, channel) } : {},
    bot: buildBotSettings(config) && { ...buildBotSettings(config)!, log: () => {} },
    knowledge,
    typoRate: config.TYPO_RATE,
    debounceMs: fast ? 0 : 1500,
    humanDelays: !fast,
  });
  return { store, engine };
}

let { store, engine } = newSession();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log(`\nSimulador do atendimento do Zind no ${channel} (modo ${resolveBotMode(config)}). Você é o cliente.`);
console.log("Comandos: /estado, /reset, /sair\n");

let n = 0;
const prompt = () => process.stdout.write("\x1b[36mvocê> \x1b[0m");
prompt();
// Lê linha a linha (funciona digitando ou com um arquivo: npm run simular -- --rapido < conversa.txt).
for await (const line of rl) {
  const text = line.trim();
  if (text === "/sair") break;
  if (text === "/reset") {
    ({ store, engine } = newSession());
    console.log("(conversa zerada)\n");
  } else if (text === "/estado") {
    console.log({
      conversas: [...store.conversations.values()],
      leads: [...store.leads.values()],
      pedidosDeAjuda: store.humanRequests,
    });
  } else if (text) {
    if (!process.stdin.isTTY) console.log(text);
    await engine.receive({
      channel,
      from: channel === "whatsapp" ? "5541999990000" : "17841400000000000",
      name: "Cliente Teste",
      text,
      externalId: `sim-${++n}`,
      timestamp: new Date(),
    });
    await engine.idle();
  }
  prompt();
}
rl.close();
