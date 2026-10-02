# Zind: agente de atendimento 24h

Agente de IA (Claude) que atende os clientes do Zind no WhatsApp (e depois no Instagram):
tira dúvidas a partir de `/knowledge`, conduz o pedido de festa e repassa para a organizadora.

## O que já funciona
- WhatsApp oficial (Cloud API): recebe, responde, "digitando", confirma leitura.
- Respostas humanizadas: balões de no máximo 3 linhas, delay proporcional ao texto,
  junta mensagens seguidas do cliente, e no máximo 1 errinho de digitação por conversa,
  corrigido com `*palavra` (nunca em preço, data, horário, nome ou link).
- Fluxo de festa: coleta nome, contato, data, convidados, tema e pacote; ao concluir,
  manda tudo (com o valor do pacote) para o WhatsApp da organizadora e fecha o lead.
- Dúvida que não está na base: o agente diz que vai confirmar e avisa a organizadora.
- Banco no Supabase (ou em memória para testes).

## Para colocar no ar, só falta
1. Preencher `/knowledge` (tudo que está como `[PREENCHER]`), incluindo os 3 pacotes em `knowledge/pacotes.json`.
2. Copiar `.env.example` para `.env` e preencher as chaves.
3. Rodar `db/schema.sql` no Supabase (SQL Editor).
4. Aprovar os templates de `docs/templates-meta.md` na Meta.
5. Fazer o deploy e cadastrar o webhook `https://SEU-DOMINIO/webhooks/whatsapp` no app da Meta (campo `messages`).

## Testar sem WhatsApp (no seu computador)
Precisa de Node 20+ e de uma `ANTHROPIC_API_KEY` no `.env`.

```bash
npm install
npm run simular              # você conversa como se fosse o cliente
npm run simular -- --rapido  # sem os delays de "digitando"
```

Dentro do simulador: `/estado` mostra o lead e a conversa, `/reset` recomeça, `/sair` sai.
Os avisos que iriam para a organizadora aparecem em amarelo.

## Comandos
| Comando | O que faz |
|---|---|
| `npm start` | Sobe o servidor dos webhooks |
| `npm run simular` | Conversa com o agente no terminal |
| `npm test` | Testes automáticos |
| `npm run typecheck` | Confere os tipos do TypeScript |

## Onde mexer
| Quero mudar... | Arquivo |
|---|---|
| Informações do parque, festas, FAQ | `knowledge/` |
| Jeito de falar, regras do atendimento | `prompts/system-prompt.md` |
| Frequência do errinho, delays | `.env` (`TYPO_RATE`, `DEBOUNCE_MS`, `HUMAN_DELAYS`) |
| Mensagem que a organizadora recebe | `src/handoff/handoff.ts` |

Arquitetura e decisões: `docs/arquitetura.md`.
