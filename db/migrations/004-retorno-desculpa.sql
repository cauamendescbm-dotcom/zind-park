-- Só para bancos criados antes desta versão do schema.sql (cole no SQL Editor do Supabase e clique em Run).
-- Retorno para quem disse "vou pensar".

-- ---------------------------------------------------------------
-- Retorno para quem deu uma desculpa ("vou pensar", "depois te falo")
-- Um por contato. Planilha: Supabase > Table Editor > leads_desculpa
-- ---------------------------------------------------------------
create table if not exists followups (
  contact_id      uuid primary key references contacts(id),
  conversation_id uuid not null references conversations(id),
  excuse          text not null,                  -- a mensagem do cliente
  status          text not null check (status in ('perguntado', 'aguardando', 'recusado', 'respondeu', 'enviado', 'cancelado')),
  asked_at        timestamptz not null,           -- quando deu a desculpa
  accepted_at     timestamptz,                    -- quando aceitou receber o retorno
  sent_at         timestamptz,                    -- quando o retorno saiu
  updated_at      timestamptz not null default now()
);
create index if not exists followups_due_idx on followups (status, accepted_at);
-- Só o servidor (dono das tabelas) acessa; a API pública do Supabase não vê nada.
alter table followups enable row level security;

create or replace view leads_desculpa with (security_invoker = true) as
select c.name as nome, c.whatsapp_id as telefone, f.excuse as desculpa, f.asked_at as data_contato,
  f.status, case when f.sent_at is not null then 'sim' else 'não' end as followup_enviado,
  f.accepted_at as aceitou_em, f.sent_at as enviado_em
from followups f
join contacts c on c.id = f.contact_id;
