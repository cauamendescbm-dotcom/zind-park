-- Só para bancos criados antes desta versão do schema.sql (quem rodar o schema.sql novo já tem isso).
-- Chatbot de intenções: contexto da conversa e os novos dados do lead de festa.
alter table conversations add column if not exists bot_state jsonb;
alter table leads add column if not exists desired_time text;
alter table leads add column if not exists birthday_age text;
alter table leads add column if not exists space text;
