import type { InstagramClient } from "../channels/instagram.js";
import type { WhatsAppClient } from "../channels/whatsapp.js";
import type { Campaign, Channel, Contact, Store } from "../store/types.js";

export interface BroadcastInput {
  name: string;
  channel: Channel;
  /** Só contatos com alguma dessas tags (vazio = todos os permitidos). */
  tags: string[];
  /** Foto da promoção (URL pública, https). */
  imageUrl: string | null;
  /** Instagram: texto da mensagem. WhatsApp: resumo do template, para o agente saber o que foi enviado. */
  text: string | null;
  /** WhatsApp: template aprovado na Meta (obrigatório no WhatsApp). */
  templateName: string | null;
  templateLang: string;
  /** Variáveis do corpo do template. `{{nome}}` vira o primeiro nome do contato. */
  templateParams: string[];
  /** Só mostra quantos receberiam, sem enviar. */
  dryRun: boolean;
  /** Envia só para estes ids (teste antes do disparo de verdade). */
  onlyTo?: string[];
}

export interface BroadcastDeps {
  store: Store;
  whatsapp?: WhatsAppClient;
  instagram?: InstagramClient;
  ratePerSecond: number;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
  onProgress?: (done: number, total: number) => void;
}

export interface BroadcastResult {
  campaign: Campaign | null;
  audience: number;
  sent: number;
  failed: number;
  errors: string[];
  seconds: number;
}

export function validateBroadcast(input: BroadcastInput): string[] {
  const problems: string[] = [];
  if (!input.name.trim()) problems.push("Dê um nome para a campanha (--nome)");
  if (input.imageUrl && !/^https:\/\//.test(input.imageUrl)) problems.push("A imagem precisa ser um link https público");
  if (input.channel === "whatsapp" && !input.templateName) {
    problems.push("No WhatsApp o disparo precisa de um template aprovado na Meta (--template)");
  }
  if (input.channel === "instagram" && !input.imageUrl && !input.text) {
    problems.push("No Instagram informe a foto (--imagem) e/ou o texto (--texto)");
  }
  return problems;
}

const firstName = (c: Contact) => c.name?.trim().split(/\s+/)[0] || "tudo bem";

export function renderParams(params: string[], contact: Contact): string[] {
  return params.map((p) => p.replaceAll("{{nome}}", firstName(contact)));
}

/** Erros da Meta que valem uma nova tentativa (limite de velocidade). */
const isRateLimit = (err: unknown) => /\b(429|130429|131056|80007)\b/.test(String(err));

/**
 * Dispara a campanha respeitando o limite de mensagens por segundo.
 * Cada contato recebe no máximo uma vez por campanha; tudo fica registrado para as métricas.
 */
export async function runBroadcast(input: BroadcastInput, deps: BroadcastDeps): Promise<BroadcastResult> {
  const problems = validateBroadcast(input);
  if (problems.length) throw new Error(problems.join("\n"));

  const now = deps.now ?? (() => new Date());
  const sleep = deps.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const started = Date.now();

  let audience: Contact[];
  if (input.onlyTo?.length) {
    audience = [];
    for (const id of input.onlyTo) audience.push(await deps.store.findOrCreateContact(input.channel, id));
  } else {
    audience = await deps.store.listAudience(input.channel, input.tags, now());
  }

  const result: BroadcastResult = { campaign: null, audience: audience.length, sent: 0, failed: 0, errors: [], seconds: 0 };
  if (input.dryRun || audience.length === 0) return result;

  const sendOne = input.channel === "whatsapp" ? makeWhatsAppSender(input, deps) : makeInstagramSender(input, deps);

  const campaign = await deps.store.createCampaign({
    name: input.name,
    channel: input.channel,
    templateName: input.templateName,
    templateLang: input.templateName ? input.templateLang : null,
    templateParams: input.templateParams,
    imageUrl: input.imageUrl,
    text: input.text,
    tags: input.tags,
  });
  result.campaign = campaign;

  const batchSize = Math.max(1, Math.floor(deps.ratePerSecond));
  for (let i = 0; i < audience.length; i += batchSize) {
    const batchStart = Date.now();
    const batch = audience.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (contact) => {
        let ids: { id: string | null; body: string }[] = [];
        let error: string | null = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            ids = await sendOne(contact);
            error = null;
            break;
          } catch (err) {
            error = err instanceof Error ? err.message : String(err);
            if (!isRateLimit(err)) break;
            await sleep(1500);
          }
        }
        const externalId = ids.at(-1)?.id ?? null;
        await deps.store.recordCampaignSend({ campaignId: campaign.id, contactId: contact.id, externalId, error });
        if (error) {
          result.failed++;
          if (result.errors.length < 10) result.errors.push(error);
          return;
        }
        result.sent++;
        // Fica no histórico da conversa, para o agente entender se a pessoa responder à promoção.
        // Cada mensagem enviada é guardada com o id da Meta (o eco dela não pausa o agente).
        const conv = await deps.store.findOrCreateConversation(contact.id, input.channel);
        for (const sent of ids) {
          await deps.store.addMessage({
            conversationId: conv.id,
            direction: "out",
            author: "sistema",
            body: sent.body,
            intendedBody: null,
            isTypoFix: false,
            externalId: sent.id,
          });
        }
      }),
    );
    deps.onProgress?.(Math.min(i + batchSize, audience.length), audience.length);
    const elapsed = Date.now() - batchStart;
    if (i + batchSize < audience.length && elapsed < 1000) await sleep(1000 - elapsed);
  }

  result.seconds = Math.round((Date.now() - started) / 100) / 10;
  return result;
}

function makeWhatsAppSender(input: BroadcastInput, deps: BroadcastDeps) {
  if (!deps.whatsapp) throw new Error("WhatsApp não configurado (WHATSAPP_TOKEN e WHATSAPP_PHONE_NUMBER_ID)");
  const wa = deps.whatsapp;
  return async (c: Contact) => {
    if (!c.whatsappId) throw new Error("contato sem WhatsApp");
    const id = await wa.sendTemplate(c.whatsappId, input.templateName!, input.templateLang, renderParams(input.templateParams, c), input.imageUrl);
    return [{ id, body: input.text ?? `Promoção "${input.name}"` }];
  };
}

function makeInstagramSender(input: BroadcastInput, deps: BroadcastDeps) {
  if (!deps.instagram) throw new Error("Instagram não configurado (INSTAGRAM_PAGE_ID e INSTAGRAM_PAGE_TOKEN)");
  const ig = deps.instagram;
  return async (c: Contact) => {
    if (!c.instagramId) throw new Error("contato sem Instagram");
    const sent: { id: string | null; body: string }[] = [];
    if (input.imageUrl) {
      sent.push({ id: await ig.sendImage(c.instagramId, input.imageUrl), body: `[foto da promoção "${input.name}"]` });
    }
    if (input.text) {
      const text = input.text.replaceAll("{{nome}}", firstName(c));
      sent.push({ id: await ig.sendText(c.instagramId, text), body: text });
    }
    return sent;
  };
}
