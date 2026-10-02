/**
 * Simulador no terminal: converse com o agente como se fosse um cliente no WhatsApp.
 * Usa o Claude de verdade, mas banco em memória e canal de mentira (nada é enviado).
 *
 *   npm run simular            (com delays de "digitando")
 *   npm run simular -- --rapido (sem delays)
 *   npm run simular -- --instagram (como se fosse no Direct do Instagram, sem festas)
 */
import readline from "node:readline/promises";
import { buildAgent, loadKnowledgeWithWarnings } from "./app.js";
import { ConsoleChannel, ConsoleStaffNotifier } from "./channels/console.js";
import { loadConfig } from "./config.js";
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
    agents: { [channel]: buildAgent(config, knowledge, channel) },
    knowledge,
    typoRate: config.TYPO_RATE,
    debounceMs: fast ? 0 : 1500,
    humanDelays: !fast,
  });
  return { store, engine };
}

let { store, engine } = newSession();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log(`\nSimulador do agente do Zind no ${channel} (${config.CLAUDE_MODEL}). Você é o cliente.`);
console.log("Comandos: /estado, /reset, /sair\n");

let n = 0;
while (true) {
  const text = (await rl.question("\x1b[36mvocê> \x1b[0m")).trim();
  if (!text) continue;
  if (text === "/sair") break;
  if (text === "/reset") {
    ({ store, engine } = newSession());
    console.log("(conversa zerada)\n");
    continue;
  }
  if (text === "/estado") {
    console.log({
      conversas: [...store.conversations.values()],
      leads: [...store.leads.values()],
      pedidosDeAjuda: store.humanRequests,
    });
    continue;
  }
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
rl.close();
