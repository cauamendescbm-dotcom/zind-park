-- Só para bancos criados antes desta versão do schema.sql (quem rodar o schema.sql novo já tem isso).
alter table conversations add column if not exists paused_until timestamptz;
alter table messages add column if not exists seq bigserial;
