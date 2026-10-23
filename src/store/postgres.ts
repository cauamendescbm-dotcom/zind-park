import { readFileSync } from "node:fs";
import pg from "pg";
import {
  type AiUsageRecord,
  emptyPartyData,
  type Campaign,
  type CampaignMetrics,
  type DeliveryStatus,
  type Followup,
  type ImportedContact,
  type Channel,
  type Contact,
  type Conversation,
  type Lead,
  type PartyData,
  type Store,
  type StoredMessage,
  type InstagramConnection,
  type WhatsAppConnection,
} from "./types.js";

/** Certificado raiz do Supabase (o mesmo do painel: Database > SSL Configuration > Download certificate). */
const SUPABASE_CA = new URL("../../certs/supabase-prod-ca-2021.crt", import.meta.url);

/**
 * Opções do pool. No Supabase a conexão é sempre criptografada e o certificado do servidor é conferido
 * contra o certificado raiz do Supabase. Se a URL já disser `sslmode`, vale o que ela diz.
 */
export function poolConfig(connectionString: string): pg.PoolConfig {
  let host = "";
  try {
    host = new URL(connectionString).hostname;
  } catch {
    // URL fora do padrão: o pg mostra o erro ao conectar.
  }
  const supabase = /\.supabase\.(com|co)$/.test(host);
  if (!supabase || /[?&]sslmode=/.test(connectionString)) return { connectionString, max: 5 };
  return { connectionString, max: 5, ssl: { ca: readFileSync(SUPABASE_CA, "utf8") } };
}

/** Banco de produção (Supabase). Usa a connection string do projeto em DATABASE_URL. */
export class PostgresStore implements Store {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool(poolConfig(connectionString));
  }

  /** Confere se o banco responde (usado no /health). */
  async ping() {
    await this.pool.query("select 1");
  }

  async findOrCreateContact(channel: Channel, externalId: string, name?: string | null): Promise<Contact> {
    const col = channel === "whatsapp" ? "whatsapp_id" : "instagram_id";
    const { rows } = await this.pool.query(
      `insert into contacts (${col}, name) values ($1, $2)
       on conflict (${col}) do update set name = coalesce(contacts.name, excluded.name), updated_at = now()
       returning *`,
      [externalId, name ?? null],
    );
    return toContact(rows[0]);
  }

  async getContact(id: string) {
    const { rows } = await this.pool.query(`select * from contacts where id = $1`, [id]);
    return rows[0] ? toContact(rows[0]) : null;
  }

  async findOrCreateConversation(contactId: string, channel: Channel): Promise<Conversation> {
    const { rows } = await this.pool.query(
      `insert into conversations (contact_id, channel) values ($1, $2)
       on conflict (contact_id, channel) do update set updated_at = now()
       returning *`,
      [contactId, channel],
    );
    return toConversation(rows[0]);
  }

  async getConversation(id: string) {
    const { rows } = await this.pool.query(`select * from conversations where id = $1`, [id]);
    return rows[0] ? toConversation(rows[0]) : null;
  }

  async updateConversation(
    id: string,
    patch: Partial<Pick<Conversation, "state" | "lastInboundAt" | "typoUsed" | "pausedUntil" | "botState">>,
  ) {
    const sets: string[] = [];
    const values: unknown[] = [];
    if (patch.state !== undefined) values.push(patch.state), sets.push(`state = $${values.length}`);
    if (patch.lastInboundAt !== undefined) values.push(patch.lastInboundAt), sets.push(`last_inbound_at = $${values.length}`);
    if (patch.typoUsed !== undefined) values.push(patch.typoUsed), sets.push(`typo_used = $${values.length}`);
    if (patch.pausedUntil !== undefined) values.push(patch.pausedUntil), sets.push(`paused_until = $${values.length}`);
    if (patch.botState !== undefined) {
      values.push(patch.botState === null ? null : JSON.stringify(patch.botState));
      sets.push(`bot_state = $${values.length}`);
    }
    if (sets.length === 0) return;
    values.push(id);
    await this.pool.query(
      `update conversations set ${sets.join(", ")}, updated_at = now() where id = $${values.length}`,
      values,
    );
  }

  async addMessage(msg: Omit<StoredMessage, "id" | "createdAt">): Promise<StoredMessage> {
    const { rows } = await this.pool.query(
      `insert into messages (conversation_id, direction, author, body, intended_body, is_typo_fix, external_id, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning *`,
      [
        msg.conversationId,
        msg.direction,
        msg.author,
        msg.body,
        msg.intendedBody,
        msg.isTypoFix,
        msg.externalId,
        msg.direction === "in" ? "recebida" : "enviada",
      ],
    );
    return toMessage(rows[0]);
  }

  async hasExternalMessage(externalId: string) {
    const { rowCount } = await this.pool.query(`select 1 from messages where external_id = $1`, [externalId]);
    return (rowCount ?? 0) > 0;
  }

  async recentMessages(conversationId: string, limit: number) {
    const { rows } = await this.pool.query(
      `select * from (
         select * from messages where conversation_id = $1 order by created_at desc, seq desc limit $2
       ) m order by created_at asc, seq asc`,
      [conversationId, limit],
    );
    return rows.map(toMessage);
  }

  async getOpenLead(conversationId: string) {
    const { rows } = await this.pool.query(
      `select * from leads where conversation_id = $1 and status = 'novo' limit 1`,
      [conversationId],
    );
    return rows[0] ? toLead(rows[0]) : null;
  }

  async upsertOpenLead(conversationId: string, contactId: string, source: string, data: Partial<PartyData>) {
    const d = { ...emptyPartyData(), ...data };
    const { rows } = await this.pool.query(
      `insert into leads (conversation_id, contact_id, source, customer_name, customer_contact, desired_date, guests, theme, package_id,
                          desired_time, birthday_age, space)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       on conflict (conversation_id) where status = 'novo' do update set
         customer_name    = coalesce(excluded.customer_name, leads.customer_name),
         customer_contact = coalesce(excluded.customer_contact, leads.customer_contact),
         desired_date     = coalesce(excluded.desired_date, leads.desired_date),
         desired_time     = coalesce(excluded.desired_time, leads.desired_time),
         birthday_age     = coalesce(excluded.birthday_age, leads.birthday_age),
         space            = coalesce(excluded.space, leads.space),
         guests           = coalesce(excluded.guests, leads.guests),
         theme            = coalesce(excluded.theme, leads.theme),
         package_id       = coalesce(excluded.package_id, leads.package_id),
         updated_at       = now()
       returning *`,
      [
        conversationId, contactId, source, d.customerName, d.customerContact, d.desiredDate, d.guests, d.theme, d.packageId,
        d.desiredTime, d.birthdayAge, d.space,
      ],
    );
    return toLead(rows[0]);
  }

  async closeLead(leadId: string, packagePrice: number | null) {
    await this.pool.query(
      `update leads set status = 'fechado', package_price = $2, handed_off_at = now(), updated_at = now() where id = $1`,
      [leadId, packagePrice],
    );
    await this.pool.query(`insert into lead_events (lead_id, kind) values ($1, 'fechado')`, [leadId]);
  }

  async addHumanRequest(conversationId: string, reason: string) {
    await this.pool.query(`insert into human_requests (conversation_id, reason) values ($1, $2)`, [conversationId, reason]);
  }

  async recordAiUsage(u: AiUsageRecord) {
    await this.pool.query(
      `insert into ai_usage (conversation_id, contact_id, channel, model, input_tokens, output_tokens,
         cache_read_tokens, cache_write_tokens, calls, cost_usd)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [u.conversationId, u.contactId, u.channel, u.model, u.inputTokens, u.outputTokens, u.cacheReadTokens, u.cacheWriteTokens, u.calls, u.costUsd],
    );
  }

  async getFollowup(contactId: string) {
    const { rows } = await this.pool.query(`select * from followups where contact_id = $1`, [contactId]);
    return rows[0] ? toFollowup(rows[0]) : null;
  }

  async saveFollowup(f: Followup) {
    await this.pool.query(
      `insert into followups (contact_id, conversation_id, excuse, status, asked_at, accepted_at, sent_at)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (contact_id) do update set conversation_id = excluded.conversation_id, excuse = excluded.excuse,
         status = excluded.status, asked_at = excluded.asked_at, accepted_at = excluded.accepted_at,
         sent_at = excluded.sent_at, updated_at = now()`,
      [f.contactId, f.conversationId, f.excuse, f.status, f.askedAt, f.acceptedAt, f.sentAt],
    );
  }

  async dueFollowups(acceptedBefore: Date) {
    const { rows } = await this.pool.query(
      `select * from followups where status = 'aguardando' and accepted_at <= $1 order by accepted_at`,
      [acceptedBefore],
    );
    return rows.map(toFollowup);
  }

  async setOptOut(contactId: string) {
    await this.pool.query(`update contacts set opt_out_at = now(), updated_at = now() where id = $1`, [contactId]);
  }

  async importContact(i: ImportedContact) {
    const { rows } = await this.pool.query(
      `insert into contacts (whatsapp_id, name, tags, wa_opt_in, wa_opt_in_at, wa_opt_in_source)
       values ($1, $2, $3, $4, case when $4 then now() end, $5)
       on conflict (whatsapp_id) do update set
         name = coalesce(contacts.name, excluded.name),
         tags = (select array(select distinct unnest(contacts.tags || excluded.tags))),
         wa_opt_in = contacts.wa_opt_in or excluded.wa_opt_in,
         wa_opt_in_at = coalesce(contacts.wa_opt_in_at, excluded.wa_opt_in_at),
         wa_opt_in_source = coalesce(contacts.wa_opt_in_source, excluded.wa_opt_in_source),
         updated_at = now()
       returning *`,
      [i.whatsappId, i.name, i.tags, i.optIn, i.optInSource],
    );
    return toContact(rows[0]);
  }

  async listAudience(channel: Channel, tagsAny: string[], now: Date) {
    const tagFilter = tagsAny.length ? `and c.tags && $1::text[]` : `and $1::text[] is not null`;
    const sql =
      channel === "whatsapp"
        ? `select c.* from contacts c
           where c.whatsapp_id is not null and c.wa_opt_in and c.opt_out_at is null ${tagFilter}`
        : `select c.* from contacts c
           join conversations v on v.contact_id = c.id and v.channel = 'instagram'
           where c.instagram_id is not null and c.opt_out_at is null
             and v.last_inbound_at >= $2::timestamptz - interval '24 hours' ${tagFilter}`;
    const params = channel === "whatsapp" ? [tagsAny] : [tagsAny, now];
    const { rows } = await this.pool.query(sql, params);
    return rows.map(toContact);
  }

  async createCampaign(c: Omit<Campaign, "id" | "createdAt">) {
    const { rows } = await this.pool.query(
      `insert into campaigns (name, channel, template_name, template_lang, template_params, image_url, text, tags)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning *`,
      [c.name, c.channel, c.templateName, c.templateLang, JSON.stringify(c.templateParams), c.imageUrl, c.text, c.tags],
    );
    const r = rows[0];
    return {
      id: r.id,
      name: r.name,
      channel: r.channel,
      templateName: r.template_name,
      templateLang: r.template_lang,
      templateParams: r.template_params,
      imageUrl: r.image_url,
      text: r.text,
      tags: r.tags,
      createdAt: r.created_at,
    } satisfies Campaign;
  }

  async recordCampaignSend(s: { campaignId: string; contactId: string; externalId: string | null; error: string | null }) {
    await this.pool.query(
      `insert into campaign_sends (campaign_id, contact_id, external_id, error) values ($1, $2, $3, $4)
       on conflict (campaign_id, contact_id) do nothing`,
      [s.campaignId, s.contactId, s.externalId, s.error],
    );
  }

  async updateDeliveryStatus(externalId: string, status: DeliveryStatus, at: Date) {
    const sql = {
      delivered: `update campaign_sends set delivered_at = coalesce(delivered_at, $2) where external_id = $1`,
      read: `update campaign_sends set read_at = coalesce(read_at, $2), delivered_at = coalesce(delivered_at, $2) where external_id = $1`,
      failed: `update campaign_sends set error = coalesce(error, 'falhou na entrega') where external_id = $1`,
    }[status];
    await this.pool.query(sql, status === "failed" ? [externalId] : [externalId, at]);
  }

  async markCampaignReply(contactId: string, at: Date) {
    await this.pool.query(
      `update campaign_sends set replied_at = $2 where id = (
         select id from campaign_sends
         where contact_id = $1 and error is null and replied_at is null
           and sent_at >= $2::timestamptz - interval '7 days'
         order by sent_at desc limit 1)`,
      [contactId, at],
    );
  }

  async markCampaignLead(contactId: string, leadId: string) {
    await this.pool.query(
      `update campaign_sends set lead_id = $2 where id = (
         select id from campaign_sends
         where contact_id = $1 and error is null and lead_id is null
           and sent_at >= now() - interval '7 days'
         order by sent_at desc limit 1)`,
      [contactId, leadId],
    );
  }

  async campaignMetrics(campaignId: string): Promise<CampaignMetrics> {
    const { rows } = await this.pool.query(`select * from campaign_metrics where id = $1`, [campaignId]);
    const r = rows[0] ?? {};
    const n = (v: unknown) => Number(v ?? 0);
    return {
      alvo: n(r.alvo),
      enviados: n(r.enviados),
      entregues: n(r.entregues),
      lidos: n(r.lidos),
      responderam: n(r.responderam),
      leads: n(r.leads),
      falhas: n(r.falhas),
    };
  }

  async getWhatsAppConnection() {
    const { rows } = await this.pool.query(`select * from whatsapp_connections order by connected_at desc limit 1`);
    return rows[0] ? toWhatsAppConnection(rows[0]) : null;
  }

  async saveWhatsAppConnection(c: WhatsAppConnection) {
    await this.pool.query(
      `insert into whatsapp_connections (phone_number_id, waba_id, token, display_phone, verified_name, coexistence, pin, connected_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (phone_number_id) do update set waba_id = excluded.waba_id, token = excluded.token,
         display_phone = excluded.display_phone, verified_name = excluded.verified_name,
         coexistence = excluded.coexistence, pin = coalesce(excluded.pin, whatsapp_connections.pin),
         connected_at = excluded.connected_at`,
      [c.phoneNumberId, c.wabaId, c.token, c.displayPhone, c.verifiedName, c.coexistence, c.pin, c.connectedAt],
    );
  }

  async getInstagramConnection() {
    const { rows } = await this.pool.query(`select * from instagram_connections order by connected_at desc limit 1`);
    return rows[0] ? toInstagramConnection(rows[0]) : null;
  }

  async saveInstagramConnection(c: InstagramConnection) {
    await this.pool.query(
      `insert into instagram_connections (page_id, page_name, page_token, account_id, username, connected_at)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (page_id) do update set page_name = excluded.page_name, page_token = excluded.page_token,
         account_id = excluded.account_id, username = excluded.username, connected_at = excluded.connected_at`,
      [c.pageId, c.pageName, c.pageToken, c.accountId, c.username, c.connectedAt],
    );
  }

  async close() {
    await this.pool.end();
  }
}

const toWhatsAppConnection = (r: any): WhatsAppConnection => ({
  phoneNumberId: r.phone_number_id,
  wabaId: r.waba_id,
  token: r.token,
  displayPhone: r.display_phone,
  verifiedName: r.verified_name,
  coexistence: r.coexistence,
  pin: r.pin,
  connectedAt: r.connected_at,
});

const toInstagramConnection = (r: any): InstagramConnection => ({
  pageId: r.page_id,
  pageName: r.page_name,
  pageToken: r.page_token,
  accountId: r.account_id,
  username: r.username,
  connectedAt: r.connected_at,
});

const toFollowup = (r: any): Followup => ({
  contactId: r.contact_id,
  conversationId: r.conversation_id,
  excuse: r.excuse,
  status: r.status,
  askedAt: r.asked_at,
  acceptedAt: r.accepted_at,
  sentAt: r.sent_at,
});

const toContact = (r: any): Contact => ({
  id: r.id,
  name: r.name,
  whatsappId: r.whatsapp_id,
  instagramId: r.instagram_id,
  waOptIn: r.wa_opt_in,
  optOutAt: r.opt_out_at,
  tags: r.tags ?? [],
});

const toConversation = (r: any): Conversation => ({
  id: r.id,
  contactId: r.contact_id,
  channel: r.channel,
  state: r.state,
  lastInboundAt: r.last_inbound_at,
  typoUsed: r.typo_used,
  pausedUntil: r.paused_until,
  botState: r.bot_state ?? null,
});

const toMessage = (r: any): StoredMessage => ({
  id: r.id,
  conversationId: r.conversation_id,
  direction: r.direction,
  author: r.author,
  body: r.body ?? "",
  intendedBody: r.intended_body,
  isTypoFix: r.is_typo_fix,
  externalId: r.external_id,
  createdAt: r.created_at,
});

const toLead = (r: any): Lead => ({
  id: r.id,
  contactId: r.contact_id,
  conversationId: r.conversation_id,
  status: r.status,
  customerName: r.customer_name,
  customerContact: r.customer_contact,
  desiredDate: r.desired_date,
  desiredTime: r.desired_time,
  birthdayAge: r.birthday_age,
  guests: r.guests,
  space: r.space,
  theme: r.theme,
  packageId: r.package_id,
  packagePrice: r.package_price === null ? null : Number(r.package_price),
  source: r.source,
  handedOffAt: r.handed_off_at,
});
