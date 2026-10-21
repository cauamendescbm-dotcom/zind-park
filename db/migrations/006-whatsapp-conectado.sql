-- Só para bancos criados antes desta versão do schema.sql (cole no SQL Editor do Supabase e clique em Run).
-- Guarda o número de WhatsApp que o cliente conecta pela página /conectar.

-- ---------------------------------------------------------------
-- Número de WhatsApp conectado pela página /conectar (Embedded Signup da Meta).
-- O servidor usa o mais recente. O token dá acesso ao número: só o servidor lê esta tabela.
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
