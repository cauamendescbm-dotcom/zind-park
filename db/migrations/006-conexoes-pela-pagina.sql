-- Só para bancos criados antes desta versão do schema.sql (cole no SQL Editor do Supabase e clique em Run).
-- Guarda o WhatsApp e o Instagram que o cliente conecta pela página /conectar.

-- ---------------------------------------------------------------
-- WhatsApp e Instagram conectados pela página /conectar.
-- WhatsApp: cadastro incorporado (Embedded Signup) da Meta.
-- O servidor usa a conexão mais recente. Os tokens dão acesso às contas: só o servidor lê estas tabelas.
-- ---------------------------------------------------------------
create table if not exists whatsapp_connections (
  phone_number_id text primary key,
  waba_id         text not null,
  token           text not null,
  display_phone   text,
  verified_name   text,
  coexistence     boolean not null default false,  -- continua no app WhatsApp Business
  pin             text,                            -- PIN da confirmação em duas etapas
  connected_at    timestamptz not null default now()
);
alter table whatsapp_connections enable row level security;

-- Instagram conectado pela página /conectar (login da Meta com a Página do Facebook).
create table if not exists instagram_connections (
  page_id         text primary key,
  page_name       text,
  page_token      text not null,
  account_id      text not null,                   -- id da conta profissional do Instagram
  username        text,
  connected_at    timestamptz not null default now()
);
alter table instagram_connections enable row level security;
