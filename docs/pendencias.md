# O que falta para colocar no ar

## Informações (do Zind)
- [ ] PDF dos pacotes de festa → `knowledge/pacotes.json` (como fazer: `docs/chatbot-intencoes.md`)
- [ ] Número da organizadora (`ORGANIZADORA_WHATSAPP`)
- [ ] Link do WhatsApp do Zind para o Instagram (`ZIND_WHATSAPP_LINK`)
- [ ] Informações que ainda não temos e hoje vão para a equipe: estacionamento, feriados, promoções etc.
      (quando tiver, vira uma intenção nova ou entra em `knowledge/informacoes-extras.md`)
- [ ] Texto da promoção para o "comente PROMO" (`campanhas/comentarios-instagram.json`)
- [ ] Nome da atendente no modo com IA (`AGENT_NAME`, hoje "Ju")

## Contas e chaves
- [ ] App na Meta com WhatsApp Cloud API (número do Zind em coexistência com o app WhatsApp Business)
- [ ] Instagram ligado ao app (Página do Facebook + token), webhooks `messages` e `comments`
- [ ] Projeto no Supabase e rodar `db/schema.sql` (banco já criado antes: rodar os arquivos de `db/migrations/`)
- [ ] Aprovar os templates de `docs/templates-meta.md`
- [ ] Deploy (Railway ou Render) e cadastrar os webhooks na Meta
- [ ] Opcional: chave da API da Anthropic, para o modo `hibrido` (o bot responde o que sabe, a IA o resto)

## Primeiros testes sugeridos
1. `npm run simular -- --rapido`: testar dúvidas, festa completa, pergunta sem resposta.
2. Com o WhatsApp de teste da Meta: mandar mensagem e ver "digitando", balões e o aviso da organizadora.
3. `npm run disparo -- ... --para SEU_NUMERO` antes de qualquer disparo para a lista.

## Ideias para depois
- Painel web para disparar promoções e ver métricas sem usar o terminal.
- Responder áudios (transcrição).
- Lembrete automático para a organizadora (hoje o lead fecha no repasse, como combinado).
