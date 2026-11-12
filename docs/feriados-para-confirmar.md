# Feriados para o Zind confirmar

O robô só fala horário de feriado que esteja em `knowledge/feriados.json`. Hoje o arquivo está vazio.
Pergunte ao Zind, para cada linha: **abre? Se abre, que horas?** Depois é só preencher o `feriados.json`
(ou mandar a lista para o Claude preencher).

Regra que o robô já segue: **segunda o parque fecha, menos quando é feriado.** Por isso as segundas
com feriado (marcadas com ⭐) são as mais importantes de confirmar.

| Data | Dia | Feriado | Abre? Horário |
|---|---|---|---|
| 15/11/2026 | domingo | Proclamação da República | |
| 20/11/2026 | sexta | Dia da Consciência Negra | |
| 25/11/2026 | quarta | Santa Catarina de Alexandria (confirmar se é feriado em BC) | |
| 24/12/2026 | quinta | Véspera de Natal (não é feriado, mas costuma mudar horário) | |
| 25/12/2026 | sexta | Natal | |
| 31/12/2026 | quinta | Véspera de Ano Novo (não é feriado, mas costuma mudar horário) | |
| 01/01/2027 | sexta | Ano Novo | |
| ⭐ 08/02/2027 | segunda | Carnaval (ponto facultativo) | |
| 09/02/2027 | terça | Carnaval (ponto facultativo) | |
| 10/02/2027 | quarta | Quarta-feira de Cinzas (ponto facultativo até 14h) | |
| 26/03/2027 | sexta | Sexta-feira Santa | |
| 28/03/2027 | domingo | Páscoa | |
| 21/04/2027 | quarta | Tiradentes | |
| 01/05/2027 | sábado | Dia do Trabalho | |
| 27/05/2027 | quinta | Corpus Christi | |
| 20/07/2027 | terça | Aniversário de Balneário Camboriú (confirmar se é feriado) | |
| 11/08/2027 | quarta | Data Magna de Santa Catarina (confirmar a data do feriado) | |
| 07/09/2027 | terça | Independência | |
| 12/10/2027 | terça | Nossa Senhora Aparecida / Dia das Crianças | |
| 02/11/2027 | terça | Finados | |
| ⭐ 15/11/2027 | segunda | Proclamação da República | |
| 20/11/2027 | sábado | Dia da Consciência Negra | |
| 25/12/2027 | sábado | Natal | |

## Como fica no `knowledge/feriados.json`

Uma linha por feriado. Data no formato AAAA-MM-DD; em `horario`, escreva "das 10h às 22h" ou "fechado":

```json
[
  { "data": "2026-11-20", "nome": "Dia da Consciência Negra", "horario": "das 14h às 22h" },
  { "data": "2026-12-25", "nome": "Natal", "horario": "fechado" }
]
```

Os horários acima são só exemplo: **não copie sem o Zind confirmar.**
