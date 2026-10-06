-- Agente de IA do Zind: schema (Supabase / Postgres)
-- Rode este arquivo uma vez no SQL Editor do Supabase.

create extension if not exists pgcrypto;

-- Canais suportados
create type channel as enum ('whatsapp', 'instagram');

-- ---------------------------------------------------------------
-- Contatos: uma pessoa pode ter WhatsApp e Instagram
-- ---------------------------------------------------------------
create table contacts (
  id              uuid primary key default gen_random_uuid(),
  name            text,
  whatsapp_id     text unique,            -- wa_id da Meta, ex.: 5541999999999
  instagram_id    text unique,            -- IGSID (id do usuário no Instagram)
  instagram_handle text,
  wa_opt_in       boolean not null default false,
  wa_opt_in_at    timestamptz,
  wa_opt_in_source text,                  -- ex.: 'site', 'balcao', 'conversa'
  opt_out_at      timestamptz,            -- preenchido = nunca mais recebe campanha (nos dois canais)
  tags            text[] not null default '{}',  -- usado na segmentação
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Conversas: uma por contato e canal
-- ---------------------------------------------------------------
create type conversation_state as enum (
  'aberta',           -- atendimento geral
  'coletando_festa',  -- agente conduzindo o fluxo de festa
  'repassada',        -- festa repassada; agente não conduz mais a venda
  'humano'            -- uma pessoa assumiu; agente fica em silêncio
);

create table conversations (
  id                 uuid primary key default gen_random_uuid(),
  contact_id         uuid not null references contacts(id),
  channel            channel not null,
  state              conversation_state not null default 'aberta',
  last_inbound_at    timestamptz,         -- controla a janela de 24h da Meta
  typo_used          boolean not null default false,  -- máx. 1 errinho por conversa
  paused_until       timestamptz,         -- alguém da equipe respondeu: agente em silêncio até aqui
  bot_state          jsonb,               -- contexto do chatbot de intenções (src/bot)
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (contact_id, channel)
);

-- ---------------------------------------------------------------
-- Mensagens (entrada e saída)
-- ---------------------------------------------------------------
create type msg_direction as enum ('in', 'out');
create type msg_author as enum ('cliente', 'agente', 'humano', 'sistema');
create type msg_status as enum ('agendada', 'enviada', 'entregue', 'lida', 'falhou', 'recebida');

create table messages (
  id               uuid primary key default gen_random_uuid(),
  seq              bigserial,            -- desempate da ordem quando dois registros têm o mesmo horário
  conversation_id  uuid not null references conversations(id),
  direction        msg_direction not null,
  author           msg_author not null,
  body             text,
  intended_body    text,                 -- o que o agente quis dizer (sem o errinho)
  media            jsonb,               -- áudio, imagem etc.
  is_typo_fix      boolean not null default false,  -- o balão "*festa"
  external_id      text unique,          -- wamid / mid da Meta (idempotência)
  status           msg_status not null,
  send_after       timestamptz,          -- quando o balão deve sair (delay)
  error            text,
  campaign_send_id uuid,                 -- se veio de campanha
  created_at       timestamptz not null default now()
);
create index on messages (conversation_id, created_at);

-- ---------------------------------------------------------------
-- Leads de festa
-- ---------------------------------------------------------------
-- novo: coletando dados. fechado: repassado para a organizadora (fim do fluxo).
create type lead_status as enum ('novo', 'fechado');

create table leads (
  id               uuid primary key default gen_random_uuid(),
  contact_id       uuid not null references contacts(id),
  conversation_id  uuid not null references conversations(id),
  status           lead_status not null default 'novo',
  customer_name    text,
  customer_contact text,
  desired_date     text,                 -- como o cliente falou, ex.: '15/11' ou 'sábado dia 20'
  desired_time     text,                 -- ex.: '15h', 'à tarde', 'a definir'
  birthday_age     text,                 -- ex.: '5 anos', 'não é aniversário'
  guests           int,
  space            text,                 -- 'Lounge Térreo', 'Salão VIP (2º andar)' ou 'a definir'
  theme            text,
  package_id       text,                 -- id do knowledge/pacotes.json (depois do PDF)
  package_price   numeric(10,2),         -- valor no momento do repasse (vem do pacotes.json)
  source           text,                 -- 'whatsapp', 'instagram_dm', 'comentario_FESTA', 'campanha:<id>'
  handed_off_at    timestamptz,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on leads (status);
-- só um lead aberto por conversa
create unique index leads_one_open_per_conversation on leads (conversation_id) where status = 'novo';

-- Histórico de mudanças e alertas do lead (repasse, realerta, fechado...)
create table lead_events (
  id         bigserial primary key,
  lead_id    uuid not null references leads(id),
  kind       text not null,              -- 'criado','fechado'
  payload    jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Pedidos de ajuda humana (agente não soube responder)
-- ---------------------------------------------------------------
create table human_requests (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id),
  reason          text not null,
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Campanhas
-- ---------------------------------------------------------------
create table campaigns (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  channel         channel not null,
  template_name   text,                  -- WhatsApp: template aprovado na Meta
  template_lang   text,
  template_params jsonb not null default '[]',
  image_url       text,                  -- foto da promoção
  text            text,                  -- Instagram: texto enviado; WhatsApp: resumo para o agente
  tags            text[] not null default '{}',  -- segmentação (vazio = todos)
  created_at      timestamptz not null default now()
);

create table campaign_sends (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references campaigns(id),
  contact_id    uuid not null references contacts(id),
  external_id   text unique,             -- id da mensagem na Meta (status de entrega chega por webhook)
  sent_at       timestamptz not null default now(),
  delivered_at  timestamptz,
  read_at       timestamptz,
  replied_at    timestamptz,
  lead_id       uuid references leads(id),
  error         text,
  unique (campaign_id, contact_id)       -- nunca manda 2x a mesma campanha
);
create index on campaign_sends (contact_id, sent_at desc);

-- Métricas prontas por campanha
create view campaign_metrics as
select c.id, c.name, c.channel, c.created_at,
  count(s.*)                as alvo,
  count(s.external_id)      as enviados,
  count(s.delivered_at)     as entregues,
  count(s.read_at)          as lidos,
  count(s.replied_at)       as responderam,
  count(s.lead_id)          as leads,
  count(s.error)            as falhas
from campaigns c
left join campaign_sends s on s.campaign_id = c.id
group by c.id;

-- Log bruto de webhooks (debug e reprocessamento)
create table webhook_events (
  id          bigserial primary key,
  channel     channel not null,
  payload     jsonb not null,
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Custo da IA: uma linha por resposta que usou o Claude
-- ---------------------------------------------------------------
create table if not exists ai_usage (
  id                 bigserial primary key,
  conversation_id    uuid not null references conversations(id),
  contact_id         uuid not null references contacts(id),
  channel            channel not null,
  model              text not null,
  input_tokens       integer not null,
  output_tokens      integer not null,
  cache_read_tokens  integer not null default 0,
  cache_write_tokens integer not null default 0,
  calls              integer not null default 1,     -- chamadas à API (cada ferramenta usada é mais uma)
  cost_usd           numeric(12, 6),                 -- estimado pela tabela de preços do código
  created_at         timestamptz not null default now()
);
create index if not exists ai_usage_contact_idx on ai_usage (contact_id, created_at);

-- Custo por cliente e canal (Supabase > Table Editor > ai_custo_por_cliente)
create or replace view ai_custo_por_cliente as
select u.contact_id, c.name as cliente, coalesce(c.whatsapp_id, c.instagram_handle, c.instagram_id) as contato,
  u.channel as canal,
  count(*)               as respostas_com_ia,
  sum(u.input_tokens)    as tokens_entrada,
  sum(u.output_tokens)   as tokens_saida,
  sum(u.cache_read_tokens + u.cache_write_tokens) as tokens_cache,
  sum(u.cost_usd)        as custo_usd,
  min(u.created_at)      as primeira,
  max(u.created_at)      as ultima
from ai_usage u
join contacts c on c.id = u.contact_id
group by u.contact_id, c.name, c.whatsapp_id, c.instagram_handle, c.instagram_id, u.channel;
