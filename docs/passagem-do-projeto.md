# Zind — passagem do projeto do robô de atendimento

Atualizado em 12/11/2026. Versão editável (Claude Doc): https://claude.ai/artifact/FMGEXjY5JsUHV2MkAwD352

## Resumo

O código do robô está pronto, testado e publicado no Railway. O que falta é configuração na Meta e dados do cliente (Zind). Este documento é a passagem completa para quem continuar, sem precisar perguntar de novo ao Caua.

- **O que é:** um atendente 24h do Zind (parque infantil premium em Balneário Camboriú, que também faz festas) no WhatsApp e no Direct do Instagram.
- **Quem é o dono:** Caua (usuário, leigo em programação, escreve em português informal). Ele é o provedor: o app da Meta fica no portfólio da empresa dele, e o Zind é o primeiro cliente. Outros clientes virão depois.
- **Objetivo:** responder dúvidas com as respostas oficiais do Zind, conduzir o pedido de festa (só no WhatsApp) e repassar o lead para a organizadora. Também faz disparos de promoções e avisos de feriado.
- **Tom:** acolhedor, simpático e amoroso. Emojis com moderação. Balões de no máximo 3 linhas, com "digitando" e pequeno atraso. No máximo 1 errinho de digitação por conversa, corrigido com `*palavra`, e nunca em número, data, link ou nome. Não diz que é IA, a menos que perguntem direto.
- **Repositório:** [github.com/cauamendescbm-dotcom/zind-park](https://github.com/cauamendescbm-dotcom/zind-park), branch `main` (PR #7 já mesclado; nenhum PR aberto).
- **Endereço no ar:** `https://zind-park-production.up.railway.app`

## Arquitetura e stack

A Meta manda cada mensagem para um único endereço (`/webhook`) no Railway. O servidor responde 200 na hora, espera uns 4 segundos o cliente terminar de digitar, decide a resposta e envia em balões curtos.

```
Cliente (WhatsApp / Instagram)
   │
   ▼ Meta (Cloud API / Instagram Messaging API)
   │  POST /webhook  (assinatura X-Hub-Signature-256 conferida com APP_SECRET)
   ▼
Servidor Fastify no Railway ── grava tudo no Supabase (Postgres)
   │
   ├─ 1. Chatbot de intenções (src/bot): respostas oficiais, sem IA, sem custo
   ├─ 2. Não entendeu? Claude Haiku (modo hibrido), com no máx. 10 mensagens de histórico
   ├─ 3. Humanização: balões de 3 linhas, "digitando", errinho controlado
   └─ 4. Festa completa ou dúvida sem resposta → WhatsApp da organizadora
```

| Peça | O que é | Plano / custo |
| --- | --- | --- |
| Código | Node 20 + TypeScript, Fastify, `tsx`, testes com Vitest | GitHub, CI em `.github/workflows/testes.yml` |
| Servidor | Railway (o Caua às vezes chama de "Helloway") | Hobby, cerca de US$ 5/mês |
| Banco | Supabase (Postgres), via `DATABASE_URL` (Session pooler, SSL com `certs/supabase-prod-ca-2021.crt`) | Grátis agora; Pro (US$ 25/mês) quando entrar em produção |
| Mensagens | Meta: WhatsApp Cloud API e Instagram Messaging API, direto, sem intermediário | Responder cliente é grátis; avisos e promoções pagos por mensagem |
| IA | Claude Haiku 4.5 (`CLAUDE_MODEL=claude-haiku-4-5-20251001`), só no que o chatbot não entende | Por uso; tokens gravados em `ai_usage` |

**Modos do atendimento (`BOT_MODE`):** `intents` = só chatbot; `hibrido` = chatbot primeiro e o resto vai pro Claude (escolhido pelo Caua); `ia` = tudo no Claude; `auto` (padrão) = `hibrido` se houver `ANTHROPIC_API_KEY`, senão `intents`.

## Como o código é organizado

As regras que não podem quebrar estão no `CLAUDE.md` da raiz e têm teste. Leia ele primeiro. Antes de subir qualquer mudança: `npm run typecheck` e `npm test` (em 12/11/2026: 436 testes passando, 5 pulados que precisam de TEST_DATABASE_URL; tipos sem erro).

| Pasta / arquivo | Para que serve |
| --- | --- |
| `src/server.ts` | Rotas: `/webhook` (GET verificação, POST mensagens), `/health`, `/qr`, `/privacidade`, `/conectar` |
| `src/core/engine.ts` | Motor da conversa: junta mensagens, janela de 24h, pausa por humano, chama bot ou IA, envia |
| `src/core/followup.ts` | Retorno para quem disse "vou pensar" |
| `src/bot/` | Chatbot de intenções: classificador, contexto, coleta da festa (`partyLead.ts`) |
| `src/bot/intents/` | Textos oficiais do Zind (24 intenções) |
| `src/bot/data/parkConfig.ts` | Único lugar com endereço, horários e valores do parque |
| `src/agent/` | Agente Claude: prompt, ferramentas, humanização (`humanize.ts`), base de conhecimento |
| `src/channels/` | WhatsApp, Instagram, chamadas à Meta, cadastro incorporado (`embeddedSignup.ts`) |
| `src/handoff/handoff.ts` | Mensagem que a organizadora recebe |
| `src/campaigns/` | Disparos, contatos, "comente PROMO" |
| `src/store/` | Banco: Postgres (Supabase) ou memória (testes) |
| `src/pendencias.ts` | Lista "faltando" que aparece no `/health` |
| `knowledge/` | `pacotes.json` (3 pacotes do PDF, sem preço), `feriados.json` (vazio), `festas.md`, `informacoes-extras.md` |
| `prompts/` | Prompt do agente com IA e regras de festa por canal |
| `db/schema.sql` + `db/migrations/001` a `006` | Banco. Mudou o schema? Atualize os dois |
| `docs/` | Guias: `passo-a-passo.md`, `meta-webhook.md`, `conectar-whatsapp.md`, `templates-meta.md`, `chatbot-intencoes.md`, `pendencias.md` |

**Comandos:** `npm start` (servidor), `npm run simular -- --rapido` (conversar no terminal como cliente; `--instagram` simula o Direct), `npm test`, `npm run typecheck`, `npm run disparo`, `npm run disparo-feriado`, `npm run importar-contatos`, `npm run metricas`, `npm run pausar` / `voltar`, `npm run retorno`.

## O que já está pronto

Tudo abaixo está no `main` e tem teste. Uma maratona de cerca de 235 mil conversas simuladas (sem IA) terminou com 0 problemas em 21/10/2026.

- **Respostas oficiais:** 24 intenções (como funciona, horários, endereço, valor, quem paga, adulto, pagamento, meia antiderrapante, PCD/autismo, aniversariante, cafeteria, cardápio, estacionamento, comida de fora, festas, pacotes, regras, saudação, "falar com alguém", "é robô?" etc.). Entende erros de digitação, abreviações e mantém contexto.
- **Festa (só WhatsApp):** apresenta os 3 pacotes do PDF (Zind After School, Zind Classic, Zind Experience) sem preço, coleta pacote + número de convidados + nome, repassa para a organizadora e fecha o lead. Data, horário e tema a organizadora combina depois.
- **Repasse:** festa completa, dúvida sem resposta, "quero falar com alguém" ou não entendeu 2 vezes → aviso no WhatsApp da organizadora.
- **Instagram (Direct):** mesmo atendimento; festa manda para o link do WhatsApp. "Comente PROMO": resposta no comentário + Direct. Ice breakers e resposta a story.
- **Humanização:** balões de até 3 linhas, "digitando", junta mensagens seguidas, 1 errinho por conversa no máximo.
- **Pausa por humano:** se a equipe responde pelo app, o robô fica quieto 12h naquela conversa. Comandos `#pausar` e `#voltar` pelo WhatsApp da equipe.
- **Foto e áudio:** o robô pede para escrever (não vai para a IA).
- **Retorno do "vou pensar":** depois de 20h, entre 9h e 21h, só WhatsApp. Lista na view `leads_desculpa`.
- **Disparos com foto:** WhatsApp (só template aprovado e opt-in) e Instagram (só quem falou nas últimas 24h). "SAIR" tira da lista. Métricas por campanha. Aviso de feriado.
- **Robustez com a Meta:** novas tentativas, aviso à equipe se o envio falhar, erros explicados no log, reações e legenda de foto.
- **Custo de IA controlado:** no máximo `AI_HISTORY_LIMIT=10` mensagens e `AI_MAX_TOKENS=600`; tokens gravados em `ai_usage` e view `ai_custo_por_cliente`.
- **Páginas:** `/health` (estado + lista "faltando" em português), `/qr` (QR Codes do WhatsApp e do Direct para imprimir), `/privacidade` (política exigida pela Meta), `/conectar?chave=...` (o cliente liga o próprio WhatsApp com o QR oficial de coexistência e o Instagram, sem copiar token).

## Decisões já tomadas pelo Caua

Não pergunte de novo. Mudar qualquer uma delas é decisão dele.

| Data | Decisão |
| --- | --- |
| 25/10/2026 | App da Meta no Facebook e portfólio **dele** (não do Zind), porque ele vai atender outros clientes. Cada cliente liga o próprio WhatsApp pela `/conectar` e paga as mensagens dele na Meta. Um número por servidor: cliente novo = outro serviço no Railway |
| 23/10/2026 | Nada de QR estilo WhatsApp Web (não oficial, risco de ban). Aceitou o QR oficial de coexistência no app WhatsApp Business |
| 21/10/2026 | Festa = pacote + convidados + nome. Contato vem do WhatsApp; data, horário e tema a organizadora combina. Salões continuam "Lounge Térreo" e "Salão VIP (2º andar)" |
| 21/10/2026 | Pacotes entraram sem preço (o PDF não tem valores). Sem preço no `pacotes.json`, o robô nunca fala valor de festa |
| 21/10/2026 | Áudio: por enquanto pede texto. Ideia futura: transcrever e responder em texto |
| 13/10/2026 | "Vou pensar": lembrar no mesmo dia (`FOLLOWUP_HORAS=20`, 9h–21h, texto livre dentro das 24h) |
| 06/10/2026 | Stack mais barata: Railway Hobby + Supabase grátis (Pro depois) + `BOT_MODE=hibrido` + Claude Haiku 4.5. Previsão futura: ~100 mil mensagens/mês |
| 06/10/2026 | Sem estacionamento. Pergunta de prato ou bebida específica: "o cardápio completo fica no parque". Feriados em `knowledge/feriados.json` |
| 06/10/2026 | Integração direta com a Meta, sem plataforma intermediária. Template de marketing só por comando, nunca pelo atendimento |
| 02/10/2026 | Lead fecha assim que é repassado (sem realerta). Dúvida que o robô não sabe também vai para a organizadora. Instagram não faz festa, manda para o WhatsApp |
| 02/10/2026 | Tom acolhedor, simpático e amoroso. Caua autorizou corrigir e adicionar coisas sem pedir licença a cada passo |

**Como trabalhar com o Caua:** ele é leigo. Guie um passo por mensagem, com o nome exato do botão e da tela. Nunca peça para ele mandar token ou senha no chat: ele cola direto no Railway ou na Meta.

## Estado da configuração

O servidor está no ar e o webhook do WhatsApp foi ligado com o número de teste. O resto não pôde ser conferido em 12/11/2026: o ambiente do Claude na nuvem bloqueia o endereço do Railway, então o `/health` não foi aberto. Primeira tarefa de quem continuar: pedir ao Caua o texto do `/health` (ou liberar o domínio `zind-park-production.up.railway.app` em Allowed domains do ambiente).

| Item | Estado | Fonte |
| --- | --- | --- |
| Código no `main` (PR #7 mesclado) | Confirmado | GitHub |
| Railway no ar, `https://zind-park-production.up.railway.app` | Confirmado em 21/10 e 26/10 | /health respondeu ok |
| Supabase criado e `db/schema.sql` rodado | Confirmado em 13/10 | Caua |
| Migrações `004-retorno-desculpa`, `005-protecao-rls`, `006-conexoes-pela-pagina` | **Não confirmado** (em 26/10 ainda não tinham sido rodadas) | Testadas e idempotentes: pode rodar de novo sem estragar |
| Variáveis `DATABASE_URL` e `VERIFY_TOKEN` no Railway | Confirmado | Railway |
| `PHONE_NUMBER_ID` (número de teste), `WHATSAPP_TOKEN`, `APP_SECRET` | **Não confirmado** (pedidas ao Caua em 26/10) | |
| Conta de desenvolvedor Meta + app "atendimento zind park" | Confirmado | Facebook do Caua ("Caua Mendes Nardi") |
| Número de teste da Meta +1 555 166-2070 | Criado | Celular que testa: o do Caua |
| Webhook do WhatsApp (`/webhook`, campo `messages`) | Confirmado em 02/11 | Painel da Meta |
| Página `/privacidade` | No ar desde o merge | URL para o app Ativo |
| Teste "oi" no número de teste respondendo | **Não confirmado** | |
| App em modo Ativo | **Não confirmado** | |
| Token permanente (Usuário do sistema) | **Não feito** até 02/11 | Token de teste vence em 24h |
| Número real do Zind | **Em andamento**: em 02/11 a tela de SMS ficou aberta no Chrome do Caua; resultado não confirmado | Ver risco do SMS abaixo |
| Instagram (webhook, Page ID, token ou `/conectar`) | **Não feito** | |
| Variáveis da `/conectar` (`APP_ID`, `WHATSAPP_CONFIG_ID`, `INSTAGRAM_CONFIG_ID`, `CONECTAR_CHAVE`) | **Não confirmado** | `docs/conectar-whatsapp.md` |
| `ANTHROPIC_API_KEY` | **Não confirmado** | Sem ela, `auto` vira `intents` |
| Modelos `novo_lead_festa`, `duvida_cliente`, `aviso_feriado`, `promo_zind` | **Não enviados para aprovação** (pelo que se sabe) | `docs/templates-meta.md` |
| Verificação da empresa do Caua na Meta | **Não confirmado** | |

Os valores das variáveis nunca ficam neste documento nem no GitHub. Lista completa dos nomes em `.env.example`.

## O que falta

Não falta código para entregar o Zind. Falta configuração e dados. A lista "faltando" do `/health` vazia significa pronto.

**Do Caua (no Supabase, Railway e Meta):**

- [ ] Rodar as migrações 004, 005 e 006 no SQL Editor do Supabase, nessa ordem
- [ ] Railway: `PHONE_NUMBER_ID`, `WHATSAPP_TOKEN`, `APP_SECRET` (se ainda não estiverem)
- [ ] Testar "oi" do celular dele para o número de teste
- [ ] Token permanente: business.facebook.com > Configurações > Usuários do sistema > Administrador > atribuir app e conta do WhatsApp > Gerar token sem validade com `whatsapp_business_messaging` e `whatsapp_business_management` > trocar `WHATSAPP_TOKEN`
- [ ] App Ativo: Configurações > Básico > Política de Privacidade = `https://zind-park-production.up.railway.app/privacidade` > mudar para Ativo
- [ ] Verificação da empresa dele (CNPJ e documentos) e Análise do app com as permissões `whatsapp_business_messaging`, `whatsapp_business_management`, `instagram_manage_messages` (necessário para atender número de outra empresa)
- [ ] Enviar os modelos `novo_lead_festa` e `duvida_cliente` (Utilidade) para aprovação e preencher `ORGANIZADORA_TEMPLATE_LEAD` e `ORGANIZADORA_TEMPLATE_DUVIDA`
- [ ] Configurar a `/conectar`: Facebook Login para Empresas, `APP_ID`, `WHATSAPP_CONFIG_ID`, `INSTAGRAM_CONFIG_ID`, `CONECTAR_CHAVE` (`docs/conectar-whatsapp.md`)
- [ ] Webhook do Instagram com os campos `messages` e `comments`
- [ ] Opcional, recomendado: `ANTHROPIC_API_KEY` com crédito e recarga automática

**Do cliente (Zind), na reunião:**

- [ ] Número real do WhatsApp, com o celular do app WhatsApp Business em mãos (QR oficial) ou o código de SMS, conforme a escolha abaixo
- [ ] Cartão na conta do WhatsApp (WhatsApp Manager > Pagamentos)
- [ ] Número da organizadora → `ORGANIZADORA_WHATSAPP` (formato 5547999990000)
- [ ] Link wa.me e @ do Instagram → `ZIND_WHATSAPP_LINK` e `ZIND_INSTAGRAM_LINK`
- [ ] Acesso ao Instagram: colocar o Caua como admin da Página do Facebook ligada ao Instagram, ou o Zind entra pela `/conectar`
- [ ] Valores dos pacotes de festa, se quiserem que o robô fale (hoje o PDF não tem preço)
- [ ] Confirmar o que o robô já fala: R$ 80 a hora, meia R$ 25, terça a sexta 15h–22h, sábado e domingo 14h–22h, Rua Chile, 85, Bairro Nações, Balneário Camboriú, PCD 50%, criança até 5 anos com adulto
- [ ] Segunda-feira o parque fecha? (o robô não diz "segunda fechado" hoje)
- [ ] Feriados do ano com horário (para `knowledge/feriados.json`), nome da atendente (hoje "Ju"), texto do "comente PROMO", outros números da equipe (`EQUIPE_WHATSAPP`)

**Decisão em aberto sobre o número do Zind** (perguntada ao Caua em 02/11, sem resposta registrada): (1) manter o número atual pelo QR de coexistência na `/conectar` (recomendado, o app continua funcionando); (2) chip novo com SMS; (3) número atual pelo SMS, o que apaga a conta do app WhatsApp Business e as conversas do celular.

**Quando os dados chegarem, quem continuar faz no código:** atualizar `parkConfig.ts`, `feriados.json`, preços em `pacotes.json` (se vierem), segunda-feira e `AGENT_NAME`; rodar os testes; abrir PR.

## Riscos

O maior risco é de prazo na Meta, não de código.

| Risco | O que acontece | Como evitar |
| --- | --- | --- |
| App no portfólio do Caua atendendo número do Zind | Meta exige verificação da empresa + Análise do app; leva de dias a 2 semanas | Começar já. Plano B: o Zind põe o Caua como admin do portfólio dele e cria-se um app lá dentro (liga no mesmo dia, mas só serve ao Zind) |
| Registrar o número atual pelo SMS | Apaga a conta do app WhatsApp Business e as conversas do celular | Usar o QR de coexistência da `/conectar` ou um chip novo |
| Modelos da organizadora não aprovados | Festas e dúvidas só chegam se ela falou com o robô nas últimas 24h | Aprovar `novo_lead_festa` e `duvida_cliente` antes de ligar |
| Token temporário | Robô para de responder em 24h | Token de Usuário do sistema |
| App em modo Desenvolvimento | Mensagens reais podem não chegar | App Ativo com a `/privacidade` |
| Migrações não rodadas | "Vou pensar", proteção RLS e `/conectar` falham | Rodar 004, 005, 006 |
| Supabase grátis | Pausa após 7 dias sem uso, sem backup | Plano Pro em produção |
| Sem cartão na Meta ou sem crédito na Anthropic | Avisos e IA param | Cartão e recarga automática |
| Um número por servidor | Conectar outro cliente troca o número do Zind | Cliente novo = outro serviço no Railway |
| Equipe responde pelo app | Robô fica 12h quieto naquela conversa (de propósito) | Combinar com a equipe; `#voltar` religa |
| Preços mudarem | Robô fala valor antigo | Alterar só `parkConfig.ts` |

## Instruções para quem continuar

Comece pelo estado real, depois feche o que falta, um passo por vez com o Caua.

1. Clone `cauamendescbm-dotcom/zind-park`, rode `npm ci`, `npm run typecheck` e `npm test`. Leia `CLAUDE.md` (regras com teste) e `docs/passo-a-passo.md`.
2. Peça ao Caua para abrir `https://zind-park-production.up.railway.app/health` e colar o resultado. Ele mostra `banco`, os canais ligados e a lista `faltando`, sem nenhum valor secreto. Atualize a tabela "Estado da configuração" com isso.
3. Pergunte só o que o `/health` não responde: se as migrações 004–006 rodaram, se o app está Ativo, como ficou o número do Zind (QR, chip novo ou SMS) e se o token é permanente.
4. Siga a lista "O que falta" acima, na ordem: migrações → variáveis → teste "oi" → token permanente → app Ativo → modelos → número real → Instagram → teste final.
5. Teste final com um celular que não seja o do Zind: "oi"; preço, horário e endereço; uma festa inteira (a organizadora recebe); uma dúvida que o robô não sabe ("pode levar cachorro?"); equipe responde pelo app e o robô fica quieto; foto ou áudio pede texto; festa no Instagram manda o link do WhatsApp; "vou pensar" retoma no dia seguinte entre 9h e 21h.
6. Mudança de código: branch nova, testes passando, PR para o Caua mesclar. Ele só sabe clicar em Merge; o Railway publica sozinho depois.

**Regras de segurança:** nunca escreva tokens, senhas ou chaves no chat, em documento ou no GitHub. Tela de login ou código de SMS: deixe o Caua (ou o cliente) digitar. Disparo de marketing só quando o Caua pedir.

**Referências:** [checklist de entrega de 26/10](https://claude.ai/artifact/4eNTjH8tB9Xvcodj4xMrgQ) · [guia da Meta em 9 passos](https://claude.ai/artifact/MKK51pNnnVWwf8YyeJFinG) · `docs/meta-webhook.md` · `docs/conectar-whatsapp.md` · `docs/templates-meta.md` · `docs/chatbot-intencoes.md` (como adicionar intenção ou preço de pacote).
