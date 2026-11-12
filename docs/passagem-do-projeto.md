# Zind — passagem do projeto do robô de atendimento

Atualizado em 12/11/2026 (noite). Para quem continuar, sem precisar perguntar de novo ao Caua.

## Resumo

- **O que é:** atendente 24h do Zind (parque infantil premium em Balneário Camboriú, que também faz festas) no WhatsApp e no Direct do Instagram.
- **Dono:** Caua, leigo em programação, escreve em português informal. Ele é o provedor: o app da Meta fica no portfólio da empresa dele, e o Zind é o primeiro cliente.
- **Objetivo:** responder com as respostas oficiais do Zind, conduzir o pedido de festa (só no WhatsApp) e repassar para a **equipe de festas**. Também faz disparos de promoção e aviso de feriado.
- **Tom:** acolhedor, simpático e amoroso. Balões de até 3 linhas, "digitando", no máximo 1 errinho por conversa (nunca em número, data, link ou nome). Atendente: "Ju". Não diz que é IA, a menos que perguntem direto.
- **Repositório:** github.com/cauamendescbm-dotcom/zind-park, branch `main`.
- **No ar:** https://zind-park-production.up.railway.app
- **Entrega ao Zind:** 13/11/2026. Guia passo a passo em [entrega-amanha.md](entrega-amanha.md).

## Arquitetura

A Meta manda cada mensagem para `/webhook` no Railway. O servidor responde 200 na hora, espera ~4 s o cliente terminar de digitar, decide a resposta (chatbot de intenções primeiro; o que ele não entende vai para o Claude Haiku no modo `hibrido`) e envia em balões curtos. Festa completa ou dúvida sem resposta vai para o WhatsApp da equipe de festas (`ORGANIZADORA_WHATSAPP`).

| Peça | O que é | Custo |
|---|---|---|
| Código | Node 20 + TypeScript, Fastify, Vitest. CI em `.github/workflows/testes.yml` | — |
| Servidor | Railway (o Caua às vezes chama de "Helloway") | Hobby, ~US$ 5/mês |
| Banco | Supabase (Postgres) via `DATABASE_URL`. **Se não responder na partida, o robô atende em memória** | Pro US$ 25/mês (o Caua vai pagar depois da entrega) |
| Mensagens | Meta: WhatsApp Cloud API e Instagram Messaging API, direto | Responder cliente é grátis |
| IA | Claude Haiku 4.5, só no que o chatbot não entende | Por uso, gravado em `ai_usage` |

Regras que não podem quebrar: `CLAUDE.md` da raiz (todas têm teste). Antes de subir: `npm run typecheck` e `npm test`.
Mapa de pastas e comandos: [passo-a-passo.md](passo-a-passo.md) e [chatbot-intencoes.md](chatbot-intencoes.md).

## O que mudou em 12/11/2026

- **PR #9 (mesclado):** segunda o parque fecha, menos quando é feriado (`parkConfig.openingHours.monday`, respostas de horário, /qr). Nas mensagens para o cliente, "nossa organizadora" virou "nossa equipe de festas" (texto neutro, sem "ela"). As variáveis continuam com o nome `ORGANIZADORA_*`.
- **Banco à prova de falha:** `openStore` (src/app.ts) confere o banco na partida. Se não responder, o robô atende em memória e o /health mostra `"banco": "memoria (banco fora: ...)"` e um aviso em `faltando`. Quando o banco voltar: **Restart** no Railway.
- **Feriados:** lista de 2026–2027 para o Zind confirmar em [feriados-para-confirmar.md](feriados-para-confirmar.md). `knowledge/feriados.json` continua vazio até o Zind confirmar os horários.
- Teste no simulador (`npm run simular -- --rapido`): oi, preço, horário, segunda, festa completa com aviso, dúvida sem resposta e "vou pensar" ok.

## Estado da configuração (conferido no /health em 12/11/2026)

| Item | Estado |
|---|---|
| Código no `main` | Ok, 441 testes passando, 5 pulados (precisam de `TEST_DATABASE_URL`) |
| Railway no ar | Ok |
| Banco Supabase | **Fora:** `tenant/user ... not found`. O Caua diz que precisa pagar. Até lá, memória |
| `WHATSAPP_TOKEN`, `PHONE_NUMBER_ID`, `APP_SECRET` | **Faltando** no Railway |
| `ORGANIZADORA_WHATSAPP`, `ZIND_WHATSAPP_LINK` | **Faltando** |
| `ANTHROPIC_API_KEY` | Faltando (sem ela, `auto` vira só chatbot) |
| Instagram | Desligado |
| Webhook do WhatsApp (campo `messages`) | Ligado em 02/11 com o número de teste +1 555 166-2070 |
| Token permanente, app Ativo, verificação da empresa | Não feitos; o Caua aguarda autorização da Meta |
| Migrações 004–006 | Não confirmadas (rodar quando o Supabase voltar) |

## O que falta

Ordem e cliques exatos em [entrega-amanha.md](entrega-amanha.md): dados do número de teste → variáveis no Railway → teste "oi" → token permanente → app Ativo → número real (QR de coexistência) → Instagram → Supabase pago + migrações.

Do Zind: número real do WhatsApp, cartão na Meta, número do responsável pelas festas, link wa.me e @ do Instagram, horários dos feriados, texto do "comente PROMO", outros números da equipe (`EQUIPE_WHATSAPP`).
Já decidido com o Zind: segunda fecha (menos feriado); atendente "Ju"; o robô **não** fala valor de festa, só passa para a equipe de festas.

## Decisões do Caua (não perguntar de novo)

| Data | Decisão |
|---|---|
| 12/11/2026 | Entrega com banco em memória; Supabase pago depois. Segunda fechada menos feriado. Festa sem preço: só direciona para quem cuida das festas |
| 25/10/2026 | App da Meta no portfólio dele. Cada cliente liga o próprio WhatsApp pela /conectar. Um número por servidor |
| 23/10/2026 | Nada de QR estilo WhatsApp Web. Só o QR oficial de coexistência |
| 21/10/2026 | Festa = pacote + convidados + nome. Pacotes sem preço. Áudio: pede texto |
| 13/10/2026 | "Vou pensar": retorno no mesmo dia (`FOLLOWUP_HORAS=20`, 9h–21h) |
| 06/10/2026 | Railway Hobby + Supabase + `BOT_MODE=hibrido` + Claude Haiku 4.5. Sem estacionamento. Integração direta com a Meta |
| 02/10/2026 | Lead fecha assim que é repassado. Instagram não faz festa, manda para o WhatsApp. O Caua autorizou corrigir e adicionar coisas sem pedir licença a cada passo |

## Riscos

| Risco | Como evitar |
|---|---|
| Robô em memória perde conversas, pausas e "vou pensar" a cada reinício ou deploy | Pagar o Supabase logo depois da entrega e dar Restart |
| Token de teste vence em 24h | Token de Usuário do sistema |
| Número de teste só manda para destinatários cadastrados | Cadastrar o número do responsável pelas festas na lista do teste |
| Registrar o número atual do Zind por SMS apaga o app WhatsApp Business | QR de coexistência ou chip novo |
| Autorização da Meta demora (dias a 2 semanas) | Entregar com o número de teste; plano B: app dentro do portfólio do Zind |
| Modelos da equipe de festas não aprovados | Aviso só chega se o responsável falou com o robô nas últimas 24h |

## Como trabalhar com o Caua

Um passo por mensagem, com o nome exato do botão e da tela. Nunca peça token ou senha no chat. Mudança de código: branch nova, testes passando, PR; ele só clica em Merge e o Railway publica sozinho.
