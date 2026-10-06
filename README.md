# Zind: atendimento 24h no WhatsApp e no Instagram

Atende os clientes do Zind no WhatsApp e no Direct do Instagram com as respostas oficiais da Zind,
conduz o pedido de festa (só no WhatsApp) e repassa para a organizadora. Também faz disparos de promoções com foto.

O atendimento tem duas partes:
- **Chatbot de intenções** (`src/bot`): entende a pergunta e responde com o texto oficial, sem IA.
  Funciona sozinho, sem custo por mensagem. Detalhes: `docs/chatbot-intencoes.md`.
- **Agente com IA** (Claude, opcional): no modo `hibrido`, responde só o que o chatbot não entendeu.

## O que já funciona
- 24 intenções com as respostas oficiais: como funciona, horários, endereço, reserva, valor, quem paga,
  adulto brincar, adulto paga, pagamento, meia antiderrapante, PCD/autismo, aniversariante, cafeteria, cardápio, estacionamento, comida de fora,
  festas, pacotes, regras de festa, saudação, agradecimento, falar com alguém, "é robô?" e assuntos sem informação.
- Entende jeitos diferentes de perguntar, abreviações e erros de digitação; pergunta quando fica em dúvida
  (ex.: "aniversário" sozinho: visita do aniversariante ou festa?).
- Mantém o contexto ("E eu?" depois de "meu filho de 4 anos paga?"), responde curto o que é simples
  e não repete o que já explicou.
- Festa (WhatsApp): coleta data, convidados, horário, idade, espaço, tema e nome, uma pergunta por vez,
  manda tudo para a organizadora e fecha o lead. Nunca fala preço de festa antes do PDF dos pacotes.
- Não entendeu duas vezes, pediu uma pessoa ou perguntou algo que não está na base: a equipe é avisada.
- Respostas humanizadas: balões de no máximo 3 linhas, "digitando", junta mensagens seguidas do cliente
  e no máximo 1 errinho de digitação por conversa, corrigido com `*palavra` (nunca em preço, data, nome ou link).
- Instagram (Direct): mesmo atendimento; festas vão para o link do WhatsApp.
- Disparos com foto: WhatsApp (template aprovado, só para quem deu opt-in) e Instagram
  (só para quem falou com o Zind nas últimas 24h, regra da Meta). Quem responder "SAIR" sai da lista na hora.
- "Comente PROMO" no Instagram: resposta pública no comentário + mensagem no Direct (`campanhas/comentarios-instagram.json`).
- Quando alguém da equipe responde o cliente direto (app do WhatsApp Business ou caixa do Instagram),
  o atendimento automático fica quieto naquela conversa por 12 horas.
- Log de cada resposta do bot sem dados pessoais, e métricas por campanha.
- Banco no Supabase (ou em memória para testes).

## Instalar e testar no seu computador
Precisa de Node 20+. Não precisa de chave de IA.

```bash
npm install
npm run simular -- --rapido   # você conversa como se fosse o cliente
npm test                      # testes automáticos
```

`npm run simular` sem `--rapido` mostra os delays de "digitando"; `--instagram` simula o Direct.
Dentro do simulador: `/estado` mostra o lead e a conversa, `/reset` recomeça, `/sair` sai.
Os avisos que iriam para a organizadora aparecem em amarelo. Exemplos de conversas: `docs/exemplos-conversas.md`.

Para testar o modo com IA, coloque `ANTHROPIC_API_KEY` no `.env`.

## Para colocar no ar, só falta
1. Copiar `.env.example` para `.env` e preencher as chaves da Meta e o número da organizadora.
2. Rodar `db/schema.sql` no Supabase (SQL Editor). Banco criado antes: rodar os arquivos de `db/migrations/`.
3. Aprovar os templates de `docs/templates-meta.md` na Meta.
4. Fazer o deploy e cadastrar os webhooks no app da Meta:
   `https://SEU-DOMINIO/webhook` (um endereço só para os dois canais), linha por linha em `docs/meta-webhook.md`
   (teste local com ngrok incluído).
5. Quando chegar o PDF das festas: cadastrar os pacotes (`docs/chatbot-intencoes.md`, seção "Como adicionar os pacotes").

Passo a passo para quem não programa: `docs/passo-a-passo.md`. Lista do que falta: `docs/pendencias.md`. Explicação sem código: `docs/como-funciona.md`.

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

O `--texto` no WhatsApp é um resumo da promoção, guardado na conversa para o agente com IA saber do que se trata se a pessoa responder.
Velocidade: 50 mensagens por segundo por padrão (3 mil contatos em cerca de 1 minuto).
A Meta começa liberando 80 por segundo por número; dá para subir `CAMPAIGN_RATE_PER_SECOND` depois.

## Comandos
| Comando | O que faz |
|---|---|
| `npm start` | Sobe o servidor dos webhooks |
| `npm run simular` | Conversa com o atendimento no terminal |
| `npm test` | Testes automáticos |
| `npm run typecheck` | Confere os tipos do TypeScript |
| `npm run importar-contatos` | Importa contatos de um CSV |
| `npm run disparo` | Dispara uma campanha |
| `npm run metricas` | Mostra as métricas de uma campanha |

## Onde mexer
| Quero mudar... | Arquivo |
|---|---|
| Endereço, horários, valores, espaços de festa | `src/bot/data/parkConfig.ts` |
| Texto de uma resposta oficial, palavras que ela entende | `src/bot/intents/` |
| Sinônimos | `src/bot/data/synonyms.ts` |
| Fallback e outras respostas fixas | `src/bot/data/faq.ts` |
| Perguntas da coleta da festa | `src/bot/partyLead.ts` |
| Pacotes de festa (do PDF) | `knowledge/pacotes.json` |
| Modo do atendimento (só bot, bot + IA, só IA) | `.env` (`BOT_MODE`) |
| Jeito de falar do agente com IA | `prompts/system-prompt.md` |
| Frequência do errinho, delays | `.env` (`TYPO_RATE`, `DEBOUNCE_MS`, `HUMAN_DELAYS`) |
| Mensagem que a organizadora recebe | `src/handoff/handoff.ts` |
| Palavras do "comente PROMO" | `campanhas/comentarios-instagram.json` |

Como adicionar uma intenção nova ou os pacotes do PDF: `docs/chatbot-intencoes.md`.
Arquitetura e decisões: `docs/arquitetura.md`.
