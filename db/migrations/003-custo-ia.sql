-- Só para bancos criados antes desta versão do schema.sql.
-- Registro de tokens da IA por resposta, para calcular o custo por cliente.
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
