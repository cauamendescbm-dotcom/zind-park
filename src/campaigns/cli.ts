/**
 * Disparos pelo terminal.
 *
 *   npm run importar-contatos -- contatos.csv --origem "cadastro do site"
 *   npm run disparo -- --canal whatsapp --nome "Promo outubro" --template promo_outubro \
 *       --imagem https://.../promo.jpg --param "{{nome}}" --texto "Resumo da promoção" --tags clientes
 *   npm run disparo -- --canal instagram --nome "Promo outubro" --imagem https://... --texto "Oi {{nome}}! ..."
 *   npm run disparo-feriado -- --data 2026-10-12 --simular   (feriado de knowledge/feriados.json, WhatsApp e Instagram)
 *   npm run metricas -- <id-da-campanha>
 *
 * Use --simular para só ver quantas pessoas receberiam, e --para 5541999999999 para testar com um número.
 */
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { InstagramClient } from "../channels/instagram.js";
import { WhatsAppClient } from "../channels/whatsapp.js";
import { loadConfig } from "../config.js";
import { PostgresStore } from "../store/postgres.js";
import path from "node:path";
import { z } from "zod";
import { holidayMessage, holidaySchema, holidayTemplateParams, shortDate } from "../bot/data/holidays.js";
import { runBroadcast } from "./broadcast.js";
import { parseContactsCsv } from "./contacts.js";

const config = loadConfig();
if (!config.DATABASE_URL) {
  console.error("Os disparos usam o banco: configure DATABASE_URL no .env");
  process.exit(1);
}
const store = new PostgresStore(config.DATABASE_URL);
const [command, ...rest] = process.argv.slice(2);

try {
  if (command === "importar") await importar(rest);
  else if (command === "disparar") await disparar(rest);
  else if (command === "feriado") await feriado(rest);
  else if (command === "metricas") await metricas(rest);
  else console.error("Comandos: importar, disparar, feriado, metricas");
} finally {
  await store.close();
}

async function importar(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: { origem: { type: "string", default: "importacao" } },
  });
  const file = positionals[0];
  if (!file) throw new Error("Informe o arquivo CSV");
  const { contacts, invalid } = parseContactsCsv(readFileSync(file, "utf8"), values.origem!);
  for (const c of contacts) await store.importContact(c);
  console.log(`${contacts.length} contatos importados (${contacts.filter((c) => c.optIn).length} com opt-in).`);
  if (invalid.length) console.log(`${invalid.length} telefones inválidos ignorados: ${invalid.slice(0, 10).join(", ")}`);
}

/** Aviso de feriado com o horário de knowledge/feriados.json, no WhatsApp e no Instagram. */
async function feriado(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      data: { type: "string" },
      canal: { type: "string", default: "ambos" },
      template: { type: "string", default: "aviso_feriado" },
      imagem: { type: "string" },
      tags: { type: "string", default: "" },
      para: { type: "string", multiple: true },
      simular: { type: "boolean", default: false },
    },
  });
  const file = path.join(config.KNOWLEDGE_DIR, "feriados.json");
  const holidays = z.array(holidaySchema).parse(JSON.parse(readFileSync(file, "utf8")));
  const h = holidays.find((x) => x.data === values.data);
  if (!h) {
    const known = holidays.map((x) => x.data).join(", ") || "nenhum";
    throw new Error(`Informe --data AAAA-MM-DD de um feriado cadastrado em ${file} (cadastrados: ${known})`);
  }
  const channels = values.canal === "ambos" ? (["whatsapp", "instagram"] as const) : [values.canal];
  if (values.para?.length && channels.length > 1) throw new Error("Com --para, escolha um canal: --canal whatsapp ou --canal instagram");

  const text = holidayMessage(h);
  console.log(`Mensagem:\n${text.replaceAll("{{nome}}", "Mariana")}\n`);
  for (const canal of channels) {
    console.log(`== ${canal}`);
    await disparar([
      "--canal", canal!, "--nome", `Feriado ${h.nome} (${shortDate(h)})`, "--texto", text,
      ...(canal === "whatsapp" ? ["--template", values.template!, ...holidayTemplateParams(h).flatMap((p) => ["--param", p])] : []),
      // No WhatsApp a foto só vai se o template tiver cabeçalho de imagem; o aviso_feriado sugerido não tem.
      ...(values.imagem && canal === "instagram" ? ["--imagem", values.imagem] : []),
      ...(values.tags ? ["--tags", values.tags] : []),
      ...(values.para ?? []).flatMap((p) => ["--para", p]),
      ...(values.simular ? ["--simular"] : []),
    ]);
  }
}

async function disparar(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      canal: { type: "string" },
      nome: { type: "string", default: "" },
      template: { type: "string" },
      idioma: { type: "string", default: "pt_BR" },
      param: { type: "string", multiple: true, default: [] },
      imagem: { type: "string" },
      texto: { type: "string" },
      tags: { type: "string", default: "" },
      para: { type: "string", multiple: true },
      simular: { type: "boolean", default: false },
    },
  });
  if (values.canal !== "whatsapp" && values.canal !== "instagram") throw new Error("--canal whatsapp ou --canal instagram");

  const whatsapp =
    config.WHATSAPP_TOKEN && config.WHATSAPP_PHONE_NUMBER_ID
      ? new WhatsAppClient({ token: config.WHATSAPP_TOKEN, phoneNumberId: config.WHATSAPP_PHONE_NUMBER_ID, apiVersion: config.WHATSAPP_API_VERSION })
      : undefined;
  const instagram =
    config.INSTAGRAM_PAGE_ID && config.INSTAGRAM_PAGE_TOKEN
      ? new InstagramClient({
          pageId: config.INSTAGRAM_PAGE_ID,
          pageToken: config.INSTAGRAM_PAGE_TOKEN,
          apiVersion: config.WHATSAPP_API_VERSION,
          apiBase: config.INSTAGRAM_API_BASE,
        })
      : undefined;

  const result = await runBroadcast(
    {
      name: values.nome!,
      channel: values.canal,
      tags: values.tags!.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
      imageUrl: values.imagem ?? null,
      text: values.texto ?? null,
      templateName: values.template ?? null,
      templateLang: values.idioma!,
      templateParams: values.param!,
      dryRun: values.simular!,
      onlyTo: values.para,
    },
    {
      store,
      whatsapp,
      instagram,
      ratePerSecond: config.CAMPAIGN_RATE_PER_SECOND,
      onProgress: (done, total) => process.stdout.write(`\r  enviando ${done}/${total}`),
    },
  );
  console.log();
  if (values.simular) {
    console.log(`Simulação: ${result.audience} pessoas receberiam esta campanha. Nada foi enviado.`);
    return;
  }
  console.log(`Campanha ${result.campaign?.id ?? "-"}: ${result.sent} enviadas, ${result.failed} falhas, em ${result.seconds}s.`);
  for (const e of result.errors) console.log(`  erro: ${e}`);
  if (result.campaign) console.log(`Métricas depois: npm run metricas -- ${result.campaign.id}`);
}

async function metricas(args: string[]) {
  const id = args[0];
  if (!id) throw new Error("Informe o id da campanha");
  console.table(await store.campaignMetrics(id));
}
