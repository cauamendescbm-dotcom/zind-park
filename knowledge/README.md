# /knowledge: a fonte da verdade do agente

O agente só responde com o que está aqui. Tudo que estiver como `[PREENCHER]`
ainda não foi informado, e o agente vai tratar como "não sei, vou confirmar".

| Arquivo | O que vai nele |
|---|---|
| `parque.md` | Horários, ingressos, preços, regras, endereço, atrações |
| `festas.md` | Como funcionam as festas, o que cada pacote inclui (texto do festas.pdf) |
| `pacotes.json` | Os 3 pacotes com id, nome e valor (usado no repasse para a organizadora) |
| `faq.md` | Perguntas frequentes |

Qualquer outro `.md` ou `.txt` colocado nesta pasta também entra na base.
Este README não entra.

Quando chegar o `festas.pdf`, coloque ele aqui e passe o conteúdo para
`festas.md` e `pacotes.json` (o Claude pode fazer isso por você).
O valor de cada pacote no repasse sempre vem do `pacotes.json`, nunca do modelo.
