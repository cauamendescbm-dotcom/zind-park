# Notas para quem for mexer no código (pessoas ou IA)

- Projeto do agente de atendimento do Zind. Tudo voltado ao usuário é em português do Brasil.
- Antes de subir: `npm run typecheck` e `npm test`. Para testar o banco de verdade, rode
  `db/schema.sql` num Postgres vazio e defina `TEST_DATABASE_URL`.
- Regras que não podem quebrar (têm teste):
  - balões de no máximo 3 linhas; no máximo 1 errinho por conversa e nunca em número, data, link ou nome;
  - o valor do pacote no repasse vem de `knowledge/pacotes.json`, nunca do modelo;
  - com `pacotes.json` vazio, nenhuma resposta fala valor de festa;
  - endereço, horários e valores do parque só em `src/bot/data/parkConfig.ts`; textos oficiais em `src/bot/intents/`;
  - regras do parque e regras de festa não se misturam sem o contexto de festa;
  - toda intenção tem pelo menos 5 frases em `test/bot/classifier.test.ts`;
  - lead fecha assim que é repassado para a organizadora;
  - festas só no WhatsApp; o Instagram encaminha para o WhatsApp;
  - disparo no WhatsApp só com template aprovado e opt-in; no Instagram só para quem falou nas últimas 24h;
  - toda mensagem enviada é guardada com o id da Meta (senão o eco dela pausa o agente).
  - resposta livre só dentro das 24h desde a última mensagem do cliente; foto/áudio recebem pedido de texto sem passar pela IA;
  - para a IA vão no máximo `AI_HISTORY_LIMIT` mensagens, com `AI_MAX_TOKENS`, e cada resposta com IA grava os tokens em `ai_usage`;
  - template de marketing só sai por comando (`npm run disparo`/`disparo-feriado`), nunca pelo atendimento.
- O histórico enviado ao Claude é só texto, sem blocos de thinking de turnos anteriores.
  Dentro de um turno, o laço de ferramentas é append-only.
- Mudou o schema? Atualize `db/schema.sql` e crie um arquivo em `db/migrations/` para bancos já existentes.
