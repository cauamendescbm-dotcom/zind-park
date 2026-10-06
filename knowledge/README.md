# /knowledge

| Arquivo | O que vai nele |
|---|---|
| `pacotes.json` | Os pacotes de festa do PDF oficial (vazio até o PDF chegar). Formato no README principal. |
| `informacoes-extras.md` | Informações oficiais que ainda não viraram uma intenção do bot. |

As respostas oficiais (endereço, horários, valores, regras e festas) ficam em `src/bot/`.
Qualquer outro `.md` ou `.txt` colocado nesta pasta também entra na base do agente com IA.
Este README não entra.

O valor de cada pacote no repasse para a organizadora sempre vem do `pacotes.json`, nunca do modelo.
Enquanto `pacotes.json` estiver vazio (`[]`), nem o bot nem o agente com IA falam valores de festa.
