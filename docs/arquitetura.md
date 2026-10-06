# Agente de IA do Zind: arquitetura (proposta, etapa 2)

Status: WhatsApp, Instagram (sem festas), repasse, disparos e chatbot de intenções implementados.

O atendimento agora passa primeiro pelo chatbot de intenções (`src/bot`), com as respostas oficiais.
O Claude só entra no modo `hibrido`, para o que o bot não entende. Detalhes em `docs/chatbot-intencoes.md`.

## Padrões escolhidos (enquanto os [PREENCHER] não chegam)

| Item | Escolha padrão | Por quê |
|---|---|---|
| Backend | Node.js + TypeScript (Fastify) | Bom para webhooks, SDK oficial da Anthropic, tipagem ajuda a não errar dados de lead |
| Orquestração | Código próprio | Delay, "digitando", divisão em mensagens e o errinho controlado ficam difíceis e frágeis no n8n |
| Fila/agendamento | Timers dentro do processo (debounce e delays) | Simples para uma instância; quando entrarem as campanhas agendadas, adicionamos pg-boss |
| Banco | Supabase (Postgres) | Já sugerido por você; dá painel pronto para ver leads |
| LLM | API da Anthropic, modelo configurável por variável de ambiente | Base de conhecimento pequena vai inteira no prompt com cache, sem RAG |
| Deploy | Railway ou Render (um serviço web sempre ligado + um worker) | Webhook da Meta precisa de URL HTTPS sempre no ar |



## Visão geral do fluxo

```
Meta (WhatsApp / Instagram)
   │ webhook (assinatura X-Hub-Signature-256 validada)
   ▼
[API Fastify]  ── grava mensagem recebida (messages) ── responde 200 na hora
   │
   ▼ espera ~4s o cliente terminar de digitar (debounce)
[Motor da conversa]
   1. junta as mensagens que o cliente mandou em sequência
   2. carrega histórico + estado da conversa + lead
   3. chatbot de intenções (src/bot) responde com a resposta oficial; no modo híbrido,
      o que ele não entende vai para o Claude (system prompt + /knowledge + ferramentas)
   4. pós-processa a resposta (máx. 3 linhas por balão, errinho controlado)
   5. agenda os envios com delay e "digitando"
   ▼
[Canal] WhatsApp Cloud API / Instagram Messaging API
```

## Ferramentas do agente (tool use)

O Claude não grava nada sozinho: ele chama ferramentas e o código valida.

- `salvar_dados_festa` (nome, contato, data, convidados, tema, pacote): grava no lead o que já foi coletado.
- `concluir_coleta_e_repassar`: só funciona quando os 6 campos estão preenchidos; dispara o handoff.
- `chamar_humano` (motivo): quando o agente não sabe a resposta ou o cliente pede uma pessoa. Avisa a organizadora e o agente diz ao cliente que vai confirmar.
- `registrar_opt_out`: cliente pediu para não receber mais mensagens.

## Regras de humanização: o que fica no prompt e o que fica no código

| Regra | Onde | Como |
|---|---|---|
| Máx. 3 linhas por mensagem | prompt + código | O prompt pede balões curtos separados; o código garante: se passar de 3 linhas, quebra em mais balões |
| Delay + "digitando" | código | Marca como lida, liga "digitando" e espera um tempo proporcional ao tamanho do texto (ex.: 1,5s a 6s, com variação aleatória) |
| Errinho de digitação | código | Sorteio com chance de ~1/15 por balão, no máximo 1 por conversa. Troca duas letras vizinhas de uma palavra comum (ex.: "festa" vira "fetsa") e manda "*festa" no balão seguinte. Nunca mexe em números, preços, datas, horários, nomes, links ou dados do pacote |
| Tom, emojis, linha de conversa | prompt | Saudação, entender a necessidade, responder, conduzir para a ação |
| Não dizer que é IA, salvo pergunta direta | prompt | Se perguntarem diretamente, responde com honestidade |
| Nunca inventar | prompt + ferramenta | Só usa /knowledge; fora disso chama `chamar_humano` |

O errinho fica no código, e não no modelo, para garantir que nunca caia em preço, data ou dado importante e para controlar a frequência.

## Fluxo de festas e handoff

Estados da conversa: `aberta` → `coletando_festa` → `repassada` (e `humano` quando uma pessoa assume).
Estados do lead: `novo` (coletando) → `fechado` (repassado para a organizadora; fim do fluxo).

1. Cliente demonstra interesse em festa: o agente apresenta os pacotes (com valores, se pedir) e vai coletando os 6 dados com naturalidade, sem parecer formulário.
2. Com tudo preenchido, `concluir_coleta_e_repassar`:
   - lead vira `fechado`;
   - mensagem para o WhatsApp da organizadora com nome, contato, data, convidados, tema, pacote e valor (o valor vem do `pacotes.json`, nunca do modelo);
   - agente avisa o cliente que a organizadora vai entrar em contato.
3. Depois do repasse, o agente continua tirando dúvidas gerais naquela conversa, mas não conduz mais a venda; se o cliente perguntar da festa, diz que a organizadora já está com o pedido.

Ponto importante da Meta: o WhatsApp só deixa mandar texto livre para quem falou com o número do Zind nas últimas 24h. Como a organizadora nem sempre terá falado, o aviso para ela precisa ser um **template aprovado** (ex.: `novo_lead_festa`, com botão "Assumi"). Eu deixo o texto do template pronto para você submeter na Meta.

## Instagram

- DMs recebidas e respostas a stories: mesmas regras de humanização, sem as ferramentas de festa.
  Quem quiser festa é convidado para o WhatsApp (`ZIND_WHATSAPP_LINK`).
- Comentário com palavra-chave (`campanhas/comentarios-instagram.json`): resposta pública + mensagem privada
  (private reply). Daí em diante o agente conversa normalmente.
- Eco de mensagens que não foram o agente que mandou (equipe respondendo pela caixa do Instagram ou pelo
  app do WhatsApp Business em coexistência) pausa o agente na conversa por `HUMAN_PAUSE_HOURS`.
- Indicador "digitando" via `sender_action: typing_on`.

## Campanhas

- WhatsApp: template aprovado (com foto no cabeçalho), só contatos com opt-in e sem opt-out, segmentação por tags.
  Envio em lotes por segundo (`CAMPAIGN_RATE_PER_SECOND`), com nova tentativa quando a Meta pede para desacelerar.
  Respostas "SAIR"/"PARAR" marcam opt-out na hora, sem passar pelo modelo.
- Instagram: foto + texto só para quem mandou mensagem nas últimas 24h (a API não permite DM em massa para seguidores).
- Toda mensagem de campanha entra no histórico da conversa; se a pessoa responder, o agente sabe a que promoção ela se refere.
- Disparo pelo terminal (`npm run disparo`); um painel pode vir depois.
- Métricas por envio a partir dos webhooks de status da Meta: enviado, entregue, lido, respondido, virou lead.

## Estrutura de pastas

```
/knowledge          info do Zind, festas.pdf, FAQ (fonte da verdade do agente)
/prompts            system prompt do agente
/src/server.ts      API Fastify (webhooks)
/src/simulator.ts   conversa com o agente no terminal
/src/core/engine.ts motor da conversa: debounce, chama o agente, envia balões
/src/agent          chamada ao Claude, ferramentas, base de conhecimento, humanização
/src/channels       whatsapp.ts (instagram.ts vem depois)
/src/handoff        repasse para a organizadora
/src/store          banco: Postgres (Supabase) e memória (testes)
/src/campaigns      (depois) segmentação, disparo, métricas
/db                 schema.sql
/test               testes automáticos
```

O schema do banco está em `db/schema.sql`.
