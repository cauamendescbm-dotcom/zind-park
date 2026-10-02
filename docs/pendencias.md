# O que falta para colocar no ar

## Informações (do Zind)
- [ ] Preencher `knowledge/parque.md`, `knowledge/festas.md`, `knowledge/faq.md` (tudo que está `[PREENCHER]`)
- [ ] Os 3 pacotes com nome e valor em `knowledge/pacotes.json` (vem do festas.pdf)
- [ ] Nome da atendente (`AGENT_NAME`, hoje "Ju")
- [ ] Número da organizadora (`ORGANIZADORA_WHATSAPP`)
- [ ] Link do WhatsApp do Zind para o Instagram (`ZIND_WHATSAPP_LINK`)
- [ ] Texto da promoção para o "comente PROMO" (`campanhas/comentarios-instagram.json`)
- [ ] O "padrão de mensagem" que o Caua vai mandar (ajustar `prompts/system-prompt.md`)

## Contas e chaves
- [ ] Chave da API da Anthropic
- [ ] App na Meta com WhatsApp Cloud API (número do Zind em coexistência com o app WhatsApp Business)
- [ ] Instagram ligado ao app (Página do Facebook + token), webhooks `messages` e `comments`
- [ ] Projeto no Supabase e rodar `db/schema.sql`
- [ ] Aprovar os templates de `docs/templates-meta.md`
- [ ] Deploy (Railway ou Render) e cadastrar os webhooks na Meta

## Primeiros testes sugeridos
1. `npm run simular` com as informações preenchidas: testar dúvidas, festa completa, pergunta sem resposta.
2. Com o WhatsApp de teste da Meta: mandar mensagem e ver "digitando", balões e o aviso da organizadora.
3. `npm run disparo -- ... --para SEU_NUMERO` antes de qualquer disparo para a lista.

## Ideias para depois
- Painel web para disparar promoções e ver métricas sem usar o terminal.
- Responder áudios (transcrição).
- Lembrete automático para a organizadora (hoje o lead fecha no repasse, como combinado).
