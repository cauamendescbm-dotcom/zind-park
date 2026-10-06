# Chatbot de intenções da Zind

O chatbot responde as dúvidas frequentes com as respostas oficiais da Zind, sem IA:
entende a pergunta por palavras-chave, sinônimos e exemplos, guarda o contexto da conversa,
coleta os dados das festas e chama a equipe quando não sabe.

## Arquitetura

```
WhatsApp / Instagram
   ↓ webhook (src/server.ts)
Adaptador do canal (src/channels: transforma o JSON da Meta em InboundMessage)
   ↓
Motor da conversa (src/core/engine.ts: espera o cliente terminar de digitar, guarda tudo no banco)
   ↓
Conversation Manager (src/bot/conversationManager.ts: contexto, pendências, festa)
   ↓
Intent Classifier (src/bot/intentClassifier.ts: normaliza e calcula o score)
   ↓
Response Generator (src/bot/responseGenerator.ts: monta a resposta com o parkConfig)
   ↓
Motor (balões de até 3 linhas, "digitando", errinho controlado) → adaptador do canal → cliente
```

O núcleo (`src/bot`) não conhece WhatsApp nem Instagram: recebe um texto e o estado da conversa
e devolve a resposta. Para ligar outro canal (site, QR Code), basta criar um adaptador em `src/channels`.

Decisão sobre as pastas: a especificação sugeria `src/bot`, `src/intents`, `src/data`, `src/utils` e `src/types`.
Como o projeto já tinha o agente com IA, os canais e as campanhas em `src/`, tudo do chatbot ficou
dentro de `src/bot/` (com as mesmas subpastas), para ele ficar separado e fácil de achar.

| Arquivo | O que faz |
|---|---|
| `src/bot/data/parkConfig.ts` | Endereço, horários, valores, espaços de festa. **Mudou preço ou horário? Só aqui.** |
| `src/bot/intents/*.ts` | As intenções com palavras-chave, exemplos e a resposta oficial |
| `src/bot/data/synonyms.ts` | Banco de sinônimos |
| `src/bot/data/faq.ts` | Respostas fixas: fallback, "E eu?", esclarecimento |
| `src/bot/data/partyPackages.ts` | Formato dos pacotes de festa (preenchidos com o PDF) |
| `src/bot/utils/normalizeText.ts` | Minúsculas, sem acento, abreviações, plural, erros de digitação |
| `src/bot/utils/similarity.ts` | Distância entre palavras (erros de digitação) e entre frases |
| `src/bot/intentClassifier.ts` | Sistema de score |
| `src/bot/conversationManager.ts` | Contexto, menu 1/2, sim/não, esclarecimento, festa |
| `src/bot/partyLead.ts` | Perguntas da coleta da festa, uma por vez |
| `src/bot/fallbackHandler.ts` | Quando não entende |
| `src/bot/utils/logger.ts` | Log de cada resposta, sem dados pessoais |
| `src/bot/types.ts` | Tipos (Intent, BotState, ConversationLog...) |

## Modos (`BOT_MODE` no `.env`)

| Modo | Como responde |
|---|---|
| `intents` | Só o chatbot. Sem custo de IA. É o padrão quando não há `ANTHROPIC_API_KEY`. |
| `hibrido` | O chatbot responde o que sabe; o que ele não entende vai para o Claude, que recebe as mesmas respostas oficiais. Padrão quando há chave. |
| `ia` | Tudo pelo Claude (como era antes). |

## Como o bot entende

1. **Normaliza**: `"Meu filho é autista, tem desconto?"` vira `meu filho e autista tem desconto`.
   Também expande abreviações (`vc`, `qto`, `hj`, `niver`, `fds`), tira plural e corrige erros
   de digitação pela palavra mais próxima do vocabulário (`horaio` → `horario`). Palavras curtas
   não são corrigidas, para "mesa" não virar "meia".
2. **Score** de cada intenção:
   - palavra-chave encontrada: **+5** (se uma frase está dentro de outra maior, só a maior vale:
     "quanto custa uma festa" ganha de "quanto custa");
   - sinônimo (por grupo): **+3**;
   - parecida com um exemplo: **+2**;
   - metade de uma palavra-chave composta: **+1**;
   - palavra que tira a intenção (ex.: "festa" no preço do parque): **−5**.
3. **Decide**: abaixo de 3 pontos, não entendeu (fallback). Se as duas primeiras estão a menos de
   2 pontos, pergunta: "Claro! 😊 Você quer saber sobre o uso normal do parque ou sobre festas de aniversário?".

## Contexto

- **"E eu?"** depois de perguntar se a criança paga: responde sobre o adulto acompanhante.
- **Resposta curta** para pergunta simples ("Que horas abre?"), para "E ...?" e para assunto já explicado
  (ex.: depois de "como funciona", os horários vêm na versão curta).
- **Assunto festa**: depois de falar de festa, "bebê paga?" é a regra da festa e "quanto custa?" é sobre os pacotes.
  Sem esse contexto, valem as regras do parque.
- **Menu da festa**: depois da resposta de festas, "1" mostra os pacotes e "2" abre espaço para a dúvida.
- **Sugestão de próximo passo**: no máximo uma por conversa ("Quer que eu te explique também como funcionam nossas festas?").
- **Conversa nova**: se o cliente volta depois de 12 horas, o contexto anterior é esquecido.

## Festa: captura do lead (só no WhatsApp)

Começa quando o cliente aceita ajuda depois de ver os pacotes, ou pede direto ("quero fechar/reservar a festa").
Pergunta uma coisa por vez: data → convidados → horário → idade do aniversariante → espaço → tema → nome
(o telefone já vem do WhatsApp). Aceita "não sei" e, se a pessoa não conseguir responder duas vezes, segue sem o dado.
Se no meio vier outra pergunta ("tem estacionamento?"), responde e volta para a festa.

No fim, o motor registra o lead, fecha e manda tudo para a organizadora (`src/handoff/handoff.ts`).
O bot nunca promete reserva: diz que a organizadora vai confirmar a disponibilidade.

No Instagram, as perguntas de festa recebem a explicação e o link do WhatsApp.

## Fallback

1ª vez sem entender: "Quero te ajudar! 😊 Só me confirma uma coisinha: você quer saber sobre o parque, valores, horários, festas, alimentação ou localização?"
2ª vez seguida: "Vou te encaminhar para nossa equipe para te ajudar direitinho, combinado? 💛" e a organizadora é avisada.
Assuntos que a Zind ainda não passou (estacionamento, feriados, promoções, pets...) recebem
"Essa informação eu não tenho disponível por aqui, mas nossa equipe pode confirmar para você." e também avisam a equipe.

## Log

Cada resposta gera uma linha `[bot] {...}` com: horário, canal, mensagem, intenção, score, resposta,
se usou fallback e se chamou a equipe. Telefones e e-mails viram `[número]`/`[email]`, e as respostas
de nome e telefone na coleta da festa não são gravadas. Nenhum id do cliente vai para o log.

## Como adicionar uma intenção

1. Escolha o arquivo em `src/bot/intents/` (ou crie um e inclua em `src/bot/intents/index.ts`).
2. Acrescente o id em `IntentId` (`src/bot/types.ts`).
3. Preencha:

```ts
{
  id: "ESTACIONAMENTO",
  name: "o estacionamento",                 // usado em "Você quer saber sobre X ou Y?"
  description: "Se o parque tem estacionamento.",
  keywords: ["estacionamento", "onde estacionar", "tem vaga para carro"],  // +5 cada
  synonyms: ["localizacao"],                // grupos de src/bot/data/synonyms.ts, +3 cada
  examples: ["tem estacionamento?", "onde eu paro o carro?"],              // +2 se parecida
  negativeKeywords: ["festa"],              // opcional: −5 se aparecer
  priority: 5,                              // desempate
  scope: "parque",                          // "parque", "festa" ou "geral"
  response: "Texto oficial completo. Pode usar {{endereco}}, {{precoHora}}...",
  shortResponse: "Versão curta, para pergunta simples ou repetida.",
}
```

4. Se a palavra-chave já existia em outra intenção (ex.: "estacionamento" está em `INFO_INDISPONIVEL`), tire de lá.
5. Coloque pelo menos 5 frases de teste em `test/bot/classifier.test.ts` e rode `npm test`.
   O teste "toda intenção tem testes" falha se você esquecer.

## Como adicionar os pacotes de festa (quando o PDF chegar)

1. Passe cada pacote do PDF para `knowledge/pacotes.json`, **só com o que está no PDF**:

```json
[
  {
    "id": "pacote_1",
    "name": "Nome do pacote 1",
    "price": 3500,
    "description": "Resumo de uma linha",
    "guests": 30,
    "includedFood": ["..."],
    "decoration": ["..."],
    "includedServices": ["..."],
    "additionalItems": ["..."],
    "observations": ["regras, horários e condições de pagamento do PDF"]
  }
]
```

   O Claude pode fazer essa conversão: é só mandar o PDF.
2. Rode `npm test`. O arquivo é validado ao iniciar: campo faltando ou preço que não é número dá erro.
3. Pronto. A partir daí:
   - "quais são os pacotes?" lista nome, valor e convidados de cada um;
   - "me fala do pacote X" mostra o detalhe;
   - o repasse para a organizadora leva o pacote e o valor do `pacotes.json` (nunca do texto do cliente ou da IA).

Enquanto o arquivo estiver vazio (`[]`), nenhuma resposta fala valor de festa.

## Integração com o WhatsApp

O código de WhatsApp já está pronto (`src/channels/whatsapp.ts` e `src/server.ts`). Falta só a parte das contas:

1. App na Meta com WhatsApp Cloud API; o número do Zind pode continuar no app WhatsApp Business (coexistência).
2. `.env`: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `META_APP_SECRET`,
   `ORGANIZADORA_WHATSAPP` (e `BOT_MODE`).
3. `db/schema.sql` no Supabase e `DATABASE_URL` no `.env`.
4. Deploy (Railway ou Render) e webhook `https://SEU-DOMINIO/webhooks/whatsapp` com os campos `messages`
   e `smb_message_echoes`.
5. Templates aprovados para a organizadora (`docs/templates-meta.md`), senão os avisos só chegam se ela
   tiver falado com o número do Zind nas últimas 24h.

## Auditoria interna

Ver `docs/auditoria-chatbot.md`.
