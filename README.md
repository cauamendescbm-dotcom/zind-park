# Zind: agente de atendimento 24h

Agente de IA (Claude) que atende os clientes do Zind no WhatsApp e no Direct do Instagram:
tira dúvidas a partir de `/knowledge`, conduz o pedido de festa (só no WhatsApp) e repassa para a organizadora.
Também faz disparos de promoções com foto nos dois canais.

## O que já funciona
- WhatsApp oficial (Cloud API): recebe, responde, "digitando", confirma leitura.
- Respostas humanizadas: balões de no máximo 3 linhas, delay proporcional ao texto,
  junta mensagens seguidas do cliente, e no máximo 1 errinho de digitação por conversa,
  corrigido com `*palavra` (nunca em preço, data, horário, nome ou link).
- Fluxo de festa: coleta nome, contato, data, convidados, tema e pacote; ao concluir,
  manda tudo (com o valor do pacote) para o WhatsApp da organizadora e fecha o lead.
- Dúvida que não está na base: o agente diz que vai confirmar e avisa a organizadora.
- Instagram (Direct): mesmo atendimento humanizado, sem festa; quem quiser festa é convidado para o WhatsApp.
  Também entende respostas a stories.
- Disparos com foto: WhatsApp (template aprovado, só para quem deu opt-in) e Instagram
  (só para quem falou com o Zind nas últimas 24h, regra da Meta). Quem responder "SAIR" sai da lista na hora.
- "Comente PROMO" no Instagram: resposta pública no comentário + mensagem no Direct (`campanhas/comentarios-instagram.json`).
- Quando alguém da equipe responde o cliente direto (app do WhatsApp Business ou caixa do Instagram),
  o agente fica quieto naquela conversa por 12 horas. Mensagens da organizadora nunca são respondidas pelo agente.
- Se a API do Claude falhar, o cliente recebe "vou confirmar" e a equipe é avisada.
- Métricas por campanha: enviados, entregues, lidos, responderam, viraram lead, falhas.
- Banco no Supabase (ou em memória para testes).

## Para colocar no ar, só falta
1. Preencher `/knowledge` (tudo que está como `[PREENCHER]`), incluindo os 3 pacotes em `knowledge/pacotes.json`.
2. Copiar `.env.example` para `.env` e preencher as chaves.
3. Rodar `db/schema.sql` no Supabase (SQL Editor).
4. Aprovar os templates de `docs/templates-meta.md` na Meta.
5. Fazer o deploy e cadastrar os webhooks no app da Meta:
   `https://SEU-DOMINIO/webhooks/whatsapp` (campos `messages` e, se usar o app junto, `smb_message_echoes`)
   e `https://SEU-DOMINIO/webhooks/instagram` (campos `messages` e `comments`).

Lista completa do que falta: `docs/pendencias.md`. Explicação sem código: `docs/como-funciona.md`.

## Testar sem WhatsApp (no seu computador)
Precisa de Node 20+ e de uma `ANTHROPIC_API_KEY` no `.env`.

```bash
npm install
npm run simular              # você conversa como se fosse o cliente
npm run simular -- --rapido  # sem os delays de "digitando"
```

Para simular o Direct do Instagram: `npm run simular -- --instagram`.

Dentro do simulador: `/estado` mostra o lead e a conversa, `/reset` recomeça, `/sair` sai.
Os avisos que iriam para a organizadora aparecem em amarelo.

## Disparos

```bash
# 1. Importar contatos (CSV com colunas telefone;nome;tags;opt_in, tags separadas por |)
npm run importar-contatos -- contatos.csv --origem "cadastro do site"

# 2. Ver quantas pessoas receberiam, sem enviar
npm run disparo -- --canal whatsapp --nome "Promo outubro" --template promo_zind --param "{{nome}}" \
  --imagem https://SEU-LINK/promo.jpg --texto "20% no ingresso em outubro" --simular

# 3. Testar com o seu número
npm run disparo -- ...mesmos parâmetros... --para 5541999999999

# 4. Disparar para todo mundo (ou só para algumas tags: --tags clientes,festa)
npm run disparo -- --canal whatsapp --nome "Promo outubro" --template promo_zind --param "{{nome}}" \
  --imagem https://SEU-LINK/promo.jpg --texto "20% no ingresso em outubro"

# Instagram (só chega em quem falou com o Zind nas últimas 24h)
npm run disparo -- --canal instagram --nome "Promo outubro" --imagem https://SEU-LINK/promo.jpg \
  --texto "Oi {{nome}}! Saiu promoção nova no Zind 💛"

# Métricas
npm run metricas -- ID-DA-CAMPANHA
```

O `--texto` no WhatsApp é um resumo da promoção para o agente saber do que se trata se a pessoa responder.
Velocidade: 50 mensagens por segundo por padrão (3 mil contatos em cerca de 1 minuto).
A Meta começa liberando 80 por segundo por número; dá para subir `CAMPAIGN_RATE_PER_SECOND` depois.

## Comandos
| Comando | O que faz |
|---|---|
| `npm start` | Sobe o servidor dos webhooks |
| `npm run simular` | Conversa com o agente no terminal |
| `npm test` | Testes automáticos |
| `npm run typecheck` | Confere os tipos do TypeScript |
| `npm run importar-contatos` | Importa contatos de um CSV |
| `npm run disparo` | Dispara uma campanha |
| `npm run metricas` | Mostra as métricas de uma campanha |

## Onde mexer
| Quero mudar... | Arquivo |
|---|---|
| Informações do parque, festas, FAQ | `knowledge/` |
| Jeito de falar, regras do atendimento | `prompts/system-prompt.md` |
| Como cada canal trata festas | `prompts/festas-whatsapp.md`, `prompts/festas-instagram.md` |
| Frequência do errinho, delays | `.env` (`TYPO_RATE`, `DEBOUNCE_MS`, `HUMAN_DELAYS`) |
| Mensagem que a organizadora recebe | `src/handoff/handoff.ts` |
| Palavras do "comente PROMO" | `campanhas/comentarios-instagram.json` |

Arquitetura e decisões: `docs/arquitetura.md`.
