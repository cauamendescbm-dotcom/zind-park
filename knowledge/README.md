# /knowledge

| Arquivo | O que vai nele |
|---|---|
| `pacotes.json` | Os 3 pacotes de festa do PDF oficial. Sem valores (`price: null`): o orçamento é com a organizadora. Formato em `docs/chatbot-intencoes.md`. |
| `festas.md` | O resto do PDF de festas: o que toda festa inclui, espaços, extras e política de convidados. |
| `feriados.json` | Horário de cada feriado. O bot responde "abre no feriado?" com ele e o `npm run disparo-feriado` avisa os clientes. |
| `informacoes-extras.md` | Informações oficiais que ainda não viraram uma intenção do bot. |

As respostas oficiais (endereço, horários, valores, regras e festas) ficam em `src/bot/`.
Qualquer outro `.md` ou `.txt` colocado nesta pasta também entra na base do agente com IA.
Este README não entra.

O valor de cada pacote no repasse para a organizadora sempre vem do `pacotes.json`, nunca do modelo.
Enquanto `pacotes.json` estiver vazio (`[]`), ou o pacote estiver sem `price`, nem o bot nem o agente com IA falam valores de festa.
