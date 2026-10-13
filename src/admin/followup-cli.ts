/**
 * Manda agora os retornos vencidos de quem disse "vou pensar" (o servidor já faz isso sozinho a cada 15 min).
 *
 *   npm run retorno
 *
 * A lista fica no Supabase: Table Editor > leads_desculpa.
 */
import { WhatsAppClient } from "../channels/whatsapp.js";
import { loadConfig } from "../config.js";
import { followupOptions, runFollowups } from "../core/followup.js";
import { PostgresStore } from "../store/postgres.js";

const config = loadConfig();
if (!config.DATABASE_URL || !config.WHATSAPP_TOKEN || !config.WHATSAPP_PHONE_NUMBER_ID) {
  console.error("Configure DATABASE_URL, WHATSAPP_TOKEN e PHONE_NUMBER_ID no .env");
  process.exit(1);
}
const store = new PostgresStore(config.DATABASE_URL);
const whatsapp = new WhatsAppClient({
  token: config.WHATSAPP_TOKEN,
  phoneNumberId: config.WHATSAPP_PHONE_NUMBER_ID,
  apiVersion: config.WHATSAPP_API_VERSION,
  apiBase: config.WHATSAPP_API_BASE,
});
try {
  const r = await runFollowups(followupOptions(config, store, whatsapp));
  if (r.foraDoHorario) console.log(`Fora do horário de retorno (${config.FOLLOWUP_HORA_INICIO}h às ${config.FOLLOWUP_HORA_FIM}h): nada enviado.`);
  else console.log(`Retornos: ${r.enviados} enviado(s), ${r.responderam} já tinham voltado, ${r.cancelados} cancelado(s).`);
} finally {
  await store.close();
}
