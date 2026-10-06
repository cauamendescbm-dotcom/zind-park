/**
 * Pausar ou retomar o atendimento automático de um cliente (um humano assume a conversa).
 *
 *   npm run pausar -- 5547999999999          (24h, ou PAUSA_HORAS_PADRAO)
 *   npm run pausar -- 5547999999999 72       (72 horas)
 *   npm run voltar -- 5547999999999
 *   npm run pausar -- 17841400000000000 --instagram
 *
 * Pelo WhatsApp, a organizadora (ou um número de EQUIPE_WHATSAPP) pode mandar para o número do Zind:
 *   #pausar 5547999999999      #pausar 5547999999999 72      #voltar 5547999999999
 */
import { loadConfig } from "../config.js";
import { PostgresStore } from "../store/postgres.js";

const config = loadConfig();
if (!config.DATABASE_URL) {
  console.error("Configure DATABASE_URL no .env (é o mesmo banco do servidor)");
  process.exit(1);
}
const [action, ...args] = process.argv.slice(2);
const instagram = args.includes("--instagram");
const [rawId, hoursArg] = args.filter((a) => !a.startsWith("--"));
if (!rawId || (action !== "pausar" && action !== "voltar")) {
  console.error("Uso: npm run pausar -- NUMERO [HORAS]   ou   npm run voltar -- NUMERO");
  process.exit(1);
}
const digits = rawId.replace(/\D/g, "");
const id = instagram ? rawId : digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;

const store = new PostgresStore(config.DATABASE_URL);
try {
  const channel = instagram ? "instagram" : "whatsapp";
  const contact = await store.findOrCreateContact(channel, id);
  const conv = await store.findOrCreateConversation(contact.id, channel);
  if (action === "pausar") {
    const hours = hoursArg ? Number(hoursArg) : config.PAUSA_HORAS_PADRAO;
    const until = new Date(Date.now() + hours * 3600e3);
    await store.updateConversation(conv.id, { pausedUntil: until });
    console.log(`Atendimento automático pausado para ${id} até ${until.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`);
  } else {
    await store.updateConversation(conv.id, { pausedUntil: null, ...(conv.state === "humano" ? { state: "aberta" as const } : {}) });
    console.log(`Atendimento automático voltou para ${id}.`);
  }
} finally {
  await store.close();
}
