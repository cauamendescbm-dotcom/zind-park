import Fastify from "fastify";
import { buildAgent, buildStore, loadKnowledgeWithWarnings } from "./app.js";
import { ConsoleStaffNotifier } from "./channels/console.js";
import { InstagramClient, parseInstagramWebhook } from "./channels/instagram.js";
import type { ChannelAdapter, StaffNotifier } from "./channels/types.js";
import {
  parseWhatsAppStatuses,
  parseWhatsAppWebhook,
  verifyMetaSignature,
  WhatsAppClient,
  WhatsAppStaffNotifier,
} from "./channels/whatsapp.js";
import { loadConfig } from "./config.js";
import { ConversationEngine } from "./core/engine.js";
import type { AgentRunner } from "./agent/agent.js";
import type { Channel } from "./store/types.js";

const config = loadConfig();
const knowledge = loadKnowledgeWithWarnings(config);
const store = buildStore(config);

const channels: Partial<Record<Channel, ChannelAdapter>> = {};
const agents: Partial<Record<Channel, AgentRunner>> = {};

let whatsapp: WhatsAppClient | undefined;
if (config.WHATSAPP_TOKEN && config.WHATSAPP_PHONE_NUMBER_ID) {
  whatsapp = new WhatsAppClient({
    token: config.WHATSAPP_TOKEN,
    phoneNumberId: config.WHATSAPP_PHONE_NUMBER_ID,
    apiVersion: config.WHATSAPP_API_VERSION,
  });
  channels.whatsapp = whatsapp;
  agents.whatsapp = buildAgent(config, knowledge, "whatsapp");
} else {
  console.warn("[server] WhatsApp desligado (falta WHATSAPP_TOKEN ou WHATSAPP_PHONE_NUMBER_ID)");
}

if (config.INSTAGRAM_PAGE_ID && config.INSTAGRAM_PAGE_TOKEN) {
  channels.instagram = new InstagramClient({
    pageId: config.INSTAGRAM_PAGE_ID,
    pageToken: config.INSTAGRAM_PAGE_TOKEN,
    apiVersion: config.WHATSAPP_API_VERSION,
    apiBase: config.INSTAGRAM_API_BASE,
  });
  agents.instagram = buildAgent(config, knowledge, "instagram");
} else {
  console.warn("[server] Instagram desligado (falta INSTAGRAM_PAGE_ID ou INSTAGRAM_PAGE_TOKEN)");
}

if (!channels.whatsapp && !channels.instagram) {
  throw new Error("Configure pelo menos um canal (veja .env.example)");
}
if (!config.META_APP_SECRET) {
  console.warn("[server] META_APP_SECRET vazio: a assinatura dos webhooks NÃO será verificada");
}

let notifier: StaffNotifier;
if (whatsapp && config.ORGANIZADORA_WHATSAPP) {
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
  store,
  channels,
  notifier,
  agents,
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

const signatureOk = (req: any) =>
  !config.META_APP_SECRET ||
  verifyMetaSignature(req.rawBody ?? "", req.headers["x-hub-signature-256"], config.META_APP_SECRET);

app.get("/health", async () => ({ ok: true, canais: Object.keys(channels) }));

// Verificação dos webhooks (feita uma vez, ao configurar no painel da Meta).
for (const [path, token] of [
  ["/webhooks/whatsapp", config.WHATSAPP_VERIFY_TOKEN],
  ["/webhooks/instagram", config.INSTAGRAM_VERIFY_TOKEN ?? config.WHATSAPP_VERIFY_TOKEN],
] as const) {
  app.get(path, async (req, reply) => {
    const q = req.query as Record<string, string>;
    if (token && q["hub.mode"] === "subscribe" && q["hub.verify_token"] === token) {
      return reply.type("text/plain").send(q["hub.challenge"]);
    }
    return reply.code(403).send();
  });
}

app.post("/webhooks/whatsapp", async (req, reply) => {
  if (!signatureOk(req)) return reply.code(401).send();
  reply.code(200).send(); // responde na hora; o resto segue em segundo plano
  if (!channels.whatsapp) return;
  for (const msg of parseWhatsAppWebhook(req.body)) {
    engine.receive(msg).catch((err) => req.log.error(err, "falha ao receber mensagem"));
  }
  for (const st of parseWhatsAppStatuses(req.body)) {
    store.updateDeliveryStatus(st.externalId, st.status, st.at).catch((err) => req.log.error(err));
  }
});

app.post("/webhooks/instagram", async (req, reply) => {
  if (!signatureOk(req)) return reply.code(401).send();
  reply.code(200).send();
  if (!channels.instagram) return;
  const ig = channels.instagram as InstagramClient;
  for (const msg of parseInstagramWebhook(req.body, config.INSTAGRAM_ACCOUNT_ID)) {
    ig.getProfile(msg.from)
      .catch(() => ({ name: null, username: null }))
      .then((p) => engine.receive({ ...msg, name: p.name ?? p.username }))
      .catch((err) => req.log.error(err, "falha ao receber mensagem"));
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
