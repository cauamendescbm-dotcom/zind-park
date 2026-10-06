import Fastify from "fastify";
import { buildAgent, buildBotSettings, buildStore, loadKnowledgeWithWarnings, usesClaude } from "./app.js";
import { ConsoleStaffNotifier } from "./channels/console.js";
import {
  InstagramClient,
  parseInstagramComments,
  parseInstagramEchoes,
  parseInstagramWebhook,
} from "./channels/instagram.js";
import { handleComment, loadCommentTriggers } from "./campaigns/comment-triggers.js";
import type { ChannelAdapter, StaffNotifier } from "./channels/types.js";
import { channelOfWebhook } from "./channels/webhook.js";
import {
  parseWhatsAppEchoes,
  parseWhatsAppStatuses,
  parseWhatsAppWebhook,
  verifyMetaSignature,
  WhatsAppClient,
  WhatsAppStaffNotifier,
} from "./channels/whatsapp.js";
import { loadConfig, resolveBotMode, staffNumbers } from "./config.js";
import { ConversationEngine } from "./core/engine.js";
import type { AgentRunner } from "./agent/agent.js";
import type { Channel } from "./store/types.js";

const config = loadConfig();
const knowledge = loadKnowledgeWithWarnings(config);
const store = buildStore(config);
const withClaude = usesClaude(config);
console.log(`[server] modo do atendimento: ${resolveBotMode(config)}`);
if (withClaude && !config.ANTHROPIC_API_KEY) {
  throw new Error("BOT_MODE pede o Claude, mas ANTHROPIC_API_KEY está vazio (use BOT_MODE=intents para rodar sem IA)");
}

const channels: Partial<Record<Channel, ChannelAdapter>> = {};
const agents: Partial<Record<Channel, AgentRunner>> = {};

let whatsapp: WhatsAppClient | undefined;
if (config.WHATSAPP_TOKEN && config.WHATSAPP_PHONE_NUMBER_ID) {
  whatsapp = new WhatsAppClient({
    token: config.WHATSAPP_TOKEN,
    phoneNumberId: config.WHATSAPP_PHONE_NUMBER_ID,
    apiVersion: config.WHATSAPP_API_VERSION,
    apiBase: config.WHATSAPP_API_BASE,
  });
  channels.whatsapp = whatsapp;
  if (withClaude) agents.whatsapp = buildAgent(config, knowledge, "whatsapp");
} else {
  console.warn("[server] WhatsApp desligado (falta WHATSAPP_TOKEN ou PHONE_NUMBER_ID)");
}

if (config.INSTAGRAM_PAGE_ID && config.INSTAGRAM_PAGE_TOKEN) {
  channels.instagram = new InstagramClient({
    pageId: config.INSTAGRAM_PAGE_ID,
    pageToken: config.INSTAGRAM_PAGE_TOKEN,
    apiVersion: config.WHATSAPP_API_VERSION,
    apiBase: config.INSTAGRAM_API_BASE,
  });
  if (withClaude) agents.instagram = buildAgent(config, knowledge, "instagram");
} else {
  console.warn("[server] Instagram desligado (falta INSTAGRAM_PAGE_ID ou INSTAGRAM_TOKEN)");
}

if (channels.instagram && config.ZIND_WHATSAPP_LINK.includes("PREENCHER")) {
  console.warn("[server] ZIND_WHATSAPP_LINK vazio: no Instagram, quem perguntar de festa não recebe o link do WhatsApp");
}

if (!channels.whatsapp && !channels.instagram) {
  throw new Error("Configure pelo menos um canal (veja .env.example)");
}
if (!config.META_APP_SECRET) {
  console.warn("[server] APP_SECRET vazio: a assinatura dos webhooks NÃO será verificada (só aceitável em teste local)");
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
  bot: buildBotSettings(config),
  knowledge,
  typoRate: config.TYPO_RATE,
  debounceMs: config.DEBOUNCE_MS,
  humanDelays: config.HUMAN_DELAYS,
  // A organizadora recebe avisos neste número; se ela responder, não é cliente.
  ignoreFrom: staffNumbers(config),
  staffNumbers: staffNumbers(config),
  pauseDefaultHours: config.PAUSA_HORAS_PADRAO,
  humanPauseHours: config.HUMAN_PAUSE_HOURS,
  aiHistoryLimit: config.AI_HISTORY_LIMIT,
});

const commentTriggers = loadCommentTriggers(config.COMMENT_TRIGGERS_FILE);
if (channels.instagram && commentTriggers.length) {
  console.log(`[server] respostas a comentários ativas: ${commentTriggers.map((t) => t.palavra).join(", ")}`);
}

/**
 * Uma mensagem que saiu do número/conta do Zind mas não foi o agente que mandou
 * = alguém da equipe respondeu direto. Espera um pouco porque o eco pode chegar
 * antes de o agente terminar de registrar o próprio envio.
 */
function onEcho(channel: Channel, customerId: string, externalId: string, log: { error: (...a: any[]) => void }) {
  setTimeout(async () => {
    try {
      if (!(await store.hasExternalMessage(externalId))) await engine.pauseForHuman(channel, customerId);
    } catch (err) {
      log.error(err, "falha ao processar eco");
    }
  }, 5000);
}

const igNames = new Map<string, string | null>();

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

// Verificação do webhook (a Meta chama uma vez, ao salvar a URL no painel).
// /webhook é o endereço único dos dois canais; os antigos continuam funcionando.
const verifyTokens = [config.WHATSAPP_VERIFY_TOKEN, config.INSTAGRAM_VERIFY_TOKEN].filter(Boolean);
for (const path of ["/webhook", "/webhooks/whatsapp", "/webhooks/instagram"]) {
  app.get(path, async (req, reply) => {
    const q = req.query as Record<string, string>;
    if (q["hub.mode"] === "subscribe" && verifyTokens.includes(q["hub.verify_token"])) {
      return reply.type("text/plain").send(q["hub.challenge"]);
    }
    return reply.code(403).send();
  });
}

type Log = { error: (...a: any[]) => void; warn: (...a: any[]) => void };

/** WhatsApp: mensagens, status de entrega e ecos (equipe respondendo pelo app). */
function onWhatsApp(body: unknown, log: Log) {
  if (!channels.whatsapp) return log.warn("webhook do WhatsApp recebido, mas o WhatsApp não está configurado");
  for (const msg of parseWhatsAppWebhook(body)) {
    engine.receive(msg).catch((err) => log.error(err, "falha ao receber mensagem"));
  }
  for (const st of parseWhatsAppStatuses(body)) {
    store.updateDeliveryStatus(st.externalId, st.status, st.at).catch((err) => log.error(err));
  }
  for (const echo of parseWhatsAppEchoes(body)) onEcho("whatsapp", echo.customerId, echo.externalId, log);
}

/** Instagram: mensagens do Direct, ecos e comentários. */
function onInstagram(body: unknown, log: Log) {
  if (!channels.instagram) return log.warn("webhook do Instagram recebido, mas o Instagram não está configurado");
  const ig = channels.instagram as InstagramClient;
  for (const msg of parseInstagramWebhook(body, config.INSTAGRAM_ACCOUNT_ID)) {
    const name = igNames.has(msg.from)
      ? Promise.resolve(igNames.get(msg.from) ?? null)
      : ig
          .getProfile(msg.from)
          .catch(() => ({ name: null, username: null }))
          .then((p) => {
            const n = p.name ?? p.username;
            igNames.set(msg.from, n);
            return n;
          });
    name
      .then((n) => engine.receive({ ...msg, name: n }))
      .catch((err) => log.error(err, "falha ao receber mensagem"));
  }
  for (const echo of parseInstagramEchoes(body)) onEcho("instagram", echo.customerId, echo.externalId, log);
  for (const comment of parseInstagramComments(body, config.INSTAGRAM_ACCOUNT_ID)) {
    handleComment(comment, commentTriggers, { store, instagram: ig }).catch((err) => log.error(err, "falha ao responder comentário"));
  }
}

// Responde 200 na hora (a Meta reenvia se demorar) e processa em segundo plano:
// o servidor fica sempre ligado, então o trabalho continua depois da resposta.
app.post("/webhook", async (req, reply) => {
  if (!signatureOk(req)) return reply.code(401).send();
  reply.code(200).send();
  const channel = channelOfWebhook(req.body);
  if (channel === "whatsapp") onWhatsApp(req.body, req.log);
  else if (channel === "instagram") onInstagram(req.body, req.log);
  else req.log.warn({ object: (req.body as any)?.object }, "webhook de um produto desconhecido ignorado");
});
app.post("/webhooks/whatsapp", async (req, reply) => {
  if (!signatureOk(req)) return reply.code(401).send();
  reply.code(200).send();
  onWhatsApp(req.body, req.log);
});
app.post("/webhooks/instagram", async (req, reply) => {
  if (!signatureOk(req)) return reply.code(401).send();
  reply.code(200).send();
  onInstagram(req.body, req.log);
});

const shutdown = async () => {
  await app.close();
  await engine.idle();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

await app.listen({ port: config.PORT, host: "0.0.0.0" });
