# Auditoria interna do chatbot (06/10/2026)

## Como foi feita
1. Testes automáticos: pelo menos 5 frases por intenção, mais os exemplos da especificação
   (`test/bot/classifier.test.ts`, `test/bot/conversation.test.ts`, `test/bot/engine-bot.test.ts`).
2. Um revisor simulou cerca de 340 mensagens de clientes reais: informais, com erros de digitação,
   abreviações, duas perguntas juntas, respostas no meio da coleta da festa. Ele achou 19 tipos de erro,
   que foram corrigidos e viraram testes (bloco "auditoria: regressões").
3. Uma segunda rodada, com frases novas e as mesmas conversas, achou mais 12 problemas (alguns causados
   pelas correções da primeira). Também foram corrigidos e viraram testes (bloco "auditoria: segunda rodada").

## Checklist (seção 39)

| Pergunta | Resultado |
|---|---|
| Existem intenções duplicadas? | Não. Cada assunto tem uma intenção. `ADULTO_BRINCAR` (adulto pode brincar) foi separada de `ADULTO_PAGA` (adulto paga), porque "Com certeza!" respondia errado "adulto paga?". |
| Existem conflitos? | Os conhecidos são resolvidos: frase mais longa ganha da mais curta, palavras negativas ("festa" tira o preço do parque) e contexto. Os empates restantes viram pergunta. |
| Palavras-chave ambíguas? | "aniversário" (visita x festa) pergunta; "meia" (meia antiderrapante x paga meia x meia hora) separada por palavras negativas; "valor/quanto custa" vai para festa só com contexto de festa. |
| Diferencia aniversário pessoal de festa? | Sim: "Hoje é meu aniversário" → aniversariante; "Quero fazer o aniversário da minha filha aí" → festa; "aniversário" sozinho → pergunta. |
| Diferencia política do parque e de festas? | Sim: "bebê paga?" é a regra do parque, a não ser que a conversa ou a mensagem seja sobre festa. |
| Evita inventar? | Sim. Valores e horários vêm do `parkConfig`; sem `pacotes.json`, nenhuma resposta fala preço de festa (testado). Assuntos sem informação (estacionamento, feriados, meia hora, estudante, gestante...) recebem "Essa informação eu não tenho disponível por aqui..." e a equipe é avisada. |
| Reconhece erros de digitação? | Sim ("horaio", "endereso", "autsta"). Palavras curtas e palavras comuns não são trocadas ("mesa", "perto", "cancelar"). |
| Entende frases curtas? | Sim: "Tem pix?", "valores", "festas", "E eu?", "e no fds?". |
| Mantém contexto? | Sim: "E eu?", "E criança de 4 anos?", menu 1/2 da festa, "sim/não" depois de uma sugestão, assunto festa. Esquece depois de 12 horas sem conversa. |
| Faz perguntas naturais? | Sim: uma pergunta por vez na festa, com "Anotado!", "Perfeito!"... variando. |
| Evita respostas gigantes? | Pergunta simples ganha resposta curta; assunto repetido também. As respostas oficiais longas (festas) são quebradas em balões de até 3 linhas. |
| Possui fallback? | Sim: 1ª vez pergunta o assunto, 2ª vez encaminha para a equipe. Nunca diz "não entendi". |
| Preparado para novos pacotes? | Sim: `knowledge/pacotes.json` no formato da especificação, validado ao iniciar, com lista e consulta de cada pacote. |
| Preparado para o WhatsApp? | Sim: já ligado ao canal do WhatsApp e do Instagram que existiam; falta só a configuração das contas. |
| Os testes passam? | Sim: 317 testes passando (3 só rodam com Postgres e também passam num banco novo e num migrado). `npm run typecheck` sem erros. |

## Erros encontrados e corrigidos

1. Pergunta de preço no meio da coleta da festa respondia "R$ 80/hora" (preço do parque). Agora fala dos pacotes.
2. Qualquer resposta no passo do nome virava o nome ("Prontinho, Ok!"). Agora "ok", "obrigada" e perguntas não valem como nome.
3. "quero" depois da oferta de ajuda não começava a coleta. Agora começa.
4. Depois de falar de festa, "quanto custa pra brincar no parque?" ia para os pacotes. Agora respeita "parque".
5. "hoje é aniversário do meu filho, ele ganha algo?" ia para festa. Agora é o aniversariante.
6. "adulto paga?" respondia "Com certeza!". Agora responde a regra do acompanhante.
7. "quanto custa pra adulto?" respondia R$ 80. A Zind não informou valor para adulto: agora responde só a regra do acompanhante.
8. "qual o preço do lounge?" respondia o preço do parque. Agora vai para os pacotes de festa.
9. A correção de digitação trocava "perto" por "certo" e "cancelar" por "parcelar". Corrigido.
10. "estudante paga meia?", "desconto para irmãos" e "acessibilidade para cadeirante" recebiam o desconto PCD. Agora vão para a equipe.
11. "quanto é meia hora?" respondia sobre a meia antiderrapante. Agora vai para a equipe.
12. Perguntas sobre regras de festa ("na festa bebê paga?") não chegavam na regra da festa. Corrigido.
13. Duas perguntas na mesma mensagem ("qual o horário e o valor?") tinham só uma resposta. Agora responde as duas.
14. "posso levar o bolo pro parabéns?" respondia "É claro que sim!". Agora responde a regra de comida de fora. "sou gestante, posso brincar?" vai para a equipe.
15. Feriados (Natal, 12 de outubro) recebiam o horário normal. Agora vão para a equipe.
16. "tem pacote mensal?", "chá de bebê", "ingresso pela internet" iam para a intenção errada. Corrigido.
17. "quanto tempo pode ficar?", "nenê de colo entra de graça?", "vc é uma IA?" e "quero falar com a organizadora" caíam no fallback. Corrigido.
18. Na coleta da festa, "um aninho", "1 ano e meio" e "trinta" não eram entendidos. Corrigido.
19. "Quanto custa?" → "e no fds?" respondia o horário. Agora repete o valor.

## Segunda rodada

20. "não quero festa, só ir brincar" depois da apresentação da festa contava como "sim". Agora volta para o parque.
21. "aniversariante paga?" começava com "É claro que sim!". Agora vem a versão curta, sem esse "sim".
22. Depois do menu 1/2, "quero fechar" ou "quero fazer dia 20" mostravam os pacotes. Agora começam a coleta (e já guardam a data).
23. No passo dos convidados, "quero falar com uma pessoa" virava 1 convidado. Agora chama a equipe e não grava número.
24. Com assunto festa, "e criança paga?" respondia a regra do parque com o R$ 80. Agora é a regra da festa.
25. "quero falar com a organizadora de festas" mostrava os pacotes. Agora chama a equipe.
26. "qual a capacidade do lounge?" ia para a equipe. Agora responde 25 pessoas (dado oficial).
27. "e pra adulto?" sem contexto repetia a mesma frase duas vezes. Corrigido.
28. "convidado de 2 anos precisa de adulto?" e "bebê de 6 meses conta na festa?" recebiam a apresentação inteira da festa. Agora é a regra da festa.
29. "aceitam ticket alimentação?" respondia sobre a cafeteria; "laudo precisa ser original?" respondia "Sim!"; "quanto custa 1h e meia?" respondia sobre a meia. Agora vão para a equipe.
30. "eu e meu marido pagamos?" e "vovó pode acompanhar de graça?" agora recebem a regra do acompanhante.
31. "tem pastel?", "vende sorvete?", "fazem chá de bebê?" e a capacidade do Salão VIP vão para a equipe, porque a Zind não passou essas informações.

## O que fica para a equipe decidir
- Valor para adultos que não acompanham criança pequena: a Zind não informou. Hoje o bot só diz a regra do acompanhante.
- Chá de bebê/batizado, cardápio da cafeteria, ticket alimentação, capacidade do Salão VIP, estacionamento, feriados: vão para a equipe até a Zind passar a informação.
