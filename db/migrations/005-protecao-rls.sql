-- Só para bancos criados antes desta versão do schema.sql (cole no SQL Editor do Supabase e clique em Run).
-- Protege as tabelas: a API pública do Supabase (chave anon) deixa de enxergar as conversas dos clientes.
-- O servidor não muda nada: ele entra como dono das tabelas.

-- ---------------------------------------------------------------
-- Proteção: só o servidor (dono das tabelas, pelo DATABASE_URL) lê e grava.
-- A API pública do Supabase (chave anon) não enxerga nada.
-- ---------------------------------------------------------------
alter table contacts enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table leads enable row level security;
alter table lead_events enable row level security;
alter table human_requests enable row level security;
alter table campaigns enable row level security;
alter table campaign_sends enable row level security;
alter table webhook_events enable row level security;
alter table ai_usage enable row level security;
alter table followups enable row level security;

-- As views passam a respeitar a proteção de quem consulta.
alter view ai_custo_por_cliente set (security_invoker = true);
alter view leads_desculpa set (security_invoker = true);
