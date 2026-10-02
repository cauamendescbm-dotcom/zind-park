import Fastify from "fastify";
import { buildAgent, buildStore, loadKnowledgeWithWarnings } from "./app.js";
import { ConsoleStaffNotifier } from "./channels/console.js";
import type { StaffNotifier } from "./channels/types.js";
import {
  parseWhatsAppWebhook,
  verifyMetaSignature,
  WhatsAppClient,
  WhatsAppStaffNotifier,
} from "./channels/whatsapp.js";
import { loadConfig } from "./config.js";
import { ConversationEngine } from "./core/engine.js";

const config = loadConfig();
const knowledge = loadKnowledgeWithWarnings(config);

if (!config.WHATSAPP_TOKEN || !config.WHATSAPP_PHONE_NUMBER_ID) {
  throw new Error("Configure WHATSAPP_TOKEN e WHATSAPP_PHONE_NUMBER_ID (veja .env.example)");
}
if (!config.META_APP_SECRET) {
  console.warn("[server] META_APP_SECRET vazio: a assinatura dos webhooks NÃO será verificada");
}

const whatsapp = new WhatsAppClient({
  token: config.WHATSAPP_TOKEN,
  phoneNumberId: config.WHATSAPP_PHONE_NUMBER_ID,
  apiVersion: config.WHATSAPP_API_VERSION,
});

let notifier: StaffNotifier;
if (config.ORGANIZADORA_WHATSAPP) {
  notifier = new WhatsAppStaffNotifier(
    whatsapp,
    config.ORGANIZADORA_WHATSAPP,
    { lead: config.ORGANIZADORA_TEMPLATE_LEAD, duvida: config.ORGANIZADORA_TEMPLATE_DUVIDA },
    config.ORGANIZADORA_TEMPLATE_LANG,
  );
} else {
  console.warn("[server] ORGANIZADORA_WHATSAPP vazio: avisos da organizadora vão só para o log");
  notifier = new ConsoleStaffNotifier();
}

const engine = new ConversationEngine({
  store: buildStore(config),
  channels: { whatsapp },
  notifier,
  agent: buildAgent(config, knowledge),
  knowledge,
  typoRate: config.TYPO_RATE,
  debounceMs: config.DEBOUNCE_MS,
  humanDelays: config.HUMAN_DELAYS,
});

const app = Fastify({ logger: true });

// Guardamos o corpo cru para conferir a assinatura da Meta.
app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
  (req as any).rawBody = body;
  try {
    done(null, JSON.parse(body as string));
  } catch (err) {
    done(err as Error, undefined);
  }
});

app.get("/health", async () => ({ ok: true }));

// Verificação do webhook (feita uma vez, ao configurar no painel da Meta).
app.get("/webhooks/whatsapp", async (req, reply) => {
  const q = req.query as Record<string, string>;
  if (q["hub.mode"] === "subscribe" && q["hub.verify_token"] === config.WHATSAPP_VERIFY_TOKEN) {
    return reply.type("text/plain").send(q["hub.challenge"]);
  }
  return reply.code(403).send();
});

app.post("/webhooks/whatsapp", async (req, reply) => {
  if (config.META_APP_SECRET) {
    const ok = verifyMetaSignature(
      (req as any).rawBody ?? "",
      req.headers["x-hub-signature-256"] as string | undefined,
      config.META_APP_SECRET,
    );
    if (!ok) return reply.code(401).send();
  }
  // Responde 200 na hora; o processamento segue em segundo plano.
  reply.code(200).send();
  for (const msg of parseWhatsAppWebhook(req.body)) {
    engine.receive(msg).catch((err) => req.log.error(err, "falha ao receber mensagem"));
  }
});

const shutdown = async () => {
  await app.close();
  await engine.idle();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

await app.listen({ port: config.PORT, host: "0.0.0.0" });
