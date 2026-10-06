# Exemplos de conversas

Gerados rodando o chatbot de verdade (modo `intents`, sem IA). Cada `>` é um balão do WhatsApp:
o motor quebra as respostas em balões de no máximo 3 linhas. Embaixo de cada mensagem do cliente
aparece a intenção que o bot identificou.

Para conversar você mesmo: `npm run simular -- --rapido`.

## Primeira visita

**Cliente:** Oi, boa tarde!  
*`SAUDACAO`*

> Oi! Que alegria receber sua mensagem! 💛
> Me conta: como posso te ajudar?

**Cliente:** como funciona o parque?  
*`COMO_FUNCIONA`*

> Olá!! Que alegria receber sua mensagem e saber que você quer conhecer esse espaço super especial que preparamos para você!!!

> Abrimos de terça a sexta das 15h às 22h e sábado e domingo das 14h às 22h.

> O parque não tem tempo máximo de permanência. Você chega quando quiser e fica o tempo que quiser!
> O valor é R$ 80,00 por hora.

> Crianças de todas as idades pagam. Para crianças abaixo de 5 anos, é obrigatório o acompanhamento de um adulto responsável, que é isento da cobrança.

> Além do parque, temos uma cafeteria/pub para trazer conforto e comodidade aos pais, com pratos, porções, lanches, cafés e bebidas preparados na casa. ♡

> Quer que eu te explique também como funcionam nossas festas? 🎉

**Cliente:** não, obrigada  
*`AGRADECIMENTO`*

> Tudo bem! 😊 Se precisar de algo, é só me chamar.

**Cliente:** precisa usar meia?  
*`MEIA_ANTIDERRAPANTE`*

> Sim! 🧦
> O uso de meia antiderrapante é obrigatório por segurança nos brinquedos.
> Você pode trazer a sua de casa ou adquirir um par novinho aqui com a gente por R$ 25,00.

**Cliente:** e aceita pix?  
*`PAGAMENTO`*

> Aceitamos cartão de crédito, débito, Pix e dinheiro! 😊
> O pagamento é no final da visita.

## Contexto: "E eu?"

**Cliente:** Meu filho tem 4 anos, ele paga?  
*`IDADE_PAGAMENTO`*

> Crianças de todas as idades pagam para brincar, pois temos atrações pensadas com muito carinho para cada fase! 💛

> Para os menores de 5 anos, o acompanhamento de um adulto responsável é obrigatório e esse adulto é totalmente isento de cobrança.

**Cliente:** E eu?  
*`ADULTO_PAGA`*

> Para crianças abaixo de 5 anos, o acompanhamento de um adulto responsável é obrigatório e esse adulto acompanhante é isento da cobrança. 😊

## Respostas curtas e sem repetir

**Cliente:** Quanto custa?  
*`PRECO_PARQUE`*

> R$ 80/hora.

**Cliente:** E criança de 4 anos?  
*`IDADE_PAGAMENTO`*

> Crianças de todas as idades pagam. Para menores de 5 anos, o acompanhante responsável é obrigatório e gratuito. 😊

**Cliente:** Que horas abre?  
*`HORARIO_FUNCIONAMENTO`*

> De terça a sexta, das 15h às 22h.
> Sábado e domingo, das 14h às 22h. 🎉

## Aniversariante x festa

**Cliente:** Hoje é meu aniversário  
*`ANIVERSARIANTE`*

> É claro que sim! 🎉
> Amamos quando você escolhe comemorar essa data tão especial com a gente!

> Aniversariantes que vierem acompanhados de 1 pagante ganham a primeira hora de parque como cortesia da casa,

> além de um parabéns super especial com uma delícia preparada com muito carinho pela nossa equipe!

> Lembre-se de trazer um documento com foto para comprovar a data. 💛

> Quer saber também como funcionam nossas festas de aniversário? 🎈

**Cliente:** aniversário  
*`esclarecimento`*

> Claro! 😊 Você quer saber sobre o uso normal do parque ou sobre festas de aniversário?

**Cliente:** festa  
*`FESTAS_EVENTOS`*

> Claro que sim! 🎉
> Aqui na Zind prezamos pelo seu conforto e tranquilidade: você nos fala o dia, o horário e o tema,

> e a gente cuida de tudo para a festa dos seus sonhos sair perfeita e sem dor de cabeça!

> Temos 2 espaços exclusivos para festas no maior parque indoor de Balneário Camboriú:

> 🎈 LOUNGE TÉRREO
> Até 25 pessoas.

> Um ambiente reservado dentro do parque, descontraído e pertinho de onde a brincadeira acontece. Perfeito para quem quer focar em muita diversão e ter um ponto de apoio delicioso!

> ✨ SALÃO VIP — 2º ANDAR
> Espaço privativo com parede inteira de vidro e visão panorâmica do parque.

> Conta com certo isolamento acústico para música própria, banheiros privativos masculino e feminino e copa de suporte.

> Assim, os adultos relaxam com conforto enquanto acompanham as crianças de qualquer ponto!

> Todas as nossas festas incluem:
> • 3h de parque liberadas para todos os convidados 🛝
> • Convite digital personalizado 💌

> • Monitores no parque + equipe de garçons capacitados
> • Recepcionista e entrada com pulseira exclusiva 🎟️
> • Open Bar não alcoólico: água, sucos premium, Coca-Cola e Guaraná 🥤

> • Serviço premium em copos de vidro e louças 🍽️

> Quer conhecer nossos 3 pacotes de comida e decoração para escolher o ideal?
> Digite:
> 1 — Quero conhecer os pacotes

> 2 — Tenho uma dúvida sobre a festa

## Festa completa (WhatsApp)

**Cliente:** Quero fazer o aniversário da minha filha aí  
*`FESTAS_EVENTOS`*

> Claro que sim! 🎉
> Aqui na Zind prezamos pelo seu conforto e tranquilidade: você nos fala o dia, o horário e o tema,

> e a gente cuida de tudo para a festa dos seus sonhos sair perfeita e sem dor de cabeça!

> Temos 2 espaços exclusivos para festas no maior parque indoor de Balneário Camboriú:

> 🎈 LOUNGE TÉRREO
> Até 25 pessoas.

> Um ambiente reservado dentro do parque, descontraído e pertinho de onde a brincadeira acontece. Perfeito para quem quer focar em muita diversão e ter um ponto de apoio delicioso!

> ✨ SALÃO VIP — 2º ANDAR
> Espaço privativo com parede inteira de vidro e visão panorâmica do parque.

> Conta com certo isolamento acústico para música própria, banheiros privativos masculino e feminino e copa de suporte.

> Assim, os adultos relaxam com conforto enquanto acompanham as crianças de qualquer ponto!

> Todas as nossas festas incluem:
> • 3h de parque liberadas para todos os convidados 🛝
> • Convite digital personalizado 💌

> • Monitores no parque + equipe de garçons capacitados
> • Recepcionista e entrada com pulseira exclusiva 🎟️
> • Open Bar não alcoólico: água, sucos premium, Coca-Cola e Guaraná 🥤

> • Serviço premium em copos de vidro e louças 🍽️

> Quer conhecer nossos 3 pacotes de comida e decoração para escolher o ideal?
> Digite:
> 1 — Quero conhecer os pacotes

> 2 — Tenho uma dúvida sobre a festa

**Cliente:** 1  
*`PACOTES_FESTA`*

> Claro! 🎉 Temos 3 opções de pacotes para diferentes estilos de comemoração.

> Os detalhes completos de cada pacote estão sendo finalizados e, assim que estiverem disponíveis no nosso atendimento, posso te apresentar todas as opções de comida,

> decoração e valores.

> Se quiser, também posso te ajudar primeiro a entender qual espaço combina melhor com a sua festa. 😊

**Cliente:** sim  
*`FESTAS_EVENTOS`*

> Que legal! 🎉 Para eu te ajudar melhor, qual seria a data que você está pensando para a festa?

**Cliente:** 15/11  
*`FESTAS_EVENTOS`*

> Perfeito! E aproximadamente quantos convidados vocês imaginam?

**Cliente:** uns 30  
*`FESTAS_EVENTOS`*

> Ótimo! E qual horário vocês preferem para a festa?

**Cliente:** à tarde  
*`FESTAS_EVENTOS`*

> Maravilha! Quantos anos o aniversariante vai fazer? 🎂

**Cliente:** vai fazer 5  
*`FESTAS_EVENTOS`*

> Combinado! Qual espaço combina mais com vocês: o Lounge Térreo (até 25 pessoas) ou o Salão VIP, no 2º andar?

**Cliente:** lounge  
*`FESTAS_EVENTOS`*

> Só um detalhe: o Lounge Térreo é para até 25 pessoas, a organizadora vai ver com você a melhor opção 😊

> Show! E já pensou no tema da festa? 🎈

**Cliente:** tem estacionamento?  
*`INFO_INDISPONIVEL` (avisa a equipe)*

> Essa informação eu não tenho disponível por aqui, mas nossa equipe pode confirmar para você. 💛

> E voltando para a festa: E já pensou no tema da festa? 🎈

**Cliente:** Frozen  
*`FESTAS_EVENTOS`*

> Certinho! Para eu passar tudo para a nossa organizadora, qual é o seu nome?

**Cliente:** Mariana  
*`FESTAS_EVENTOS` (lead repassado para a organizadora)*

> Prontinho, Mariana! 💛 Já passei tudo para a nossa organizadora de festas.
> Ela vai falar com você para apresentar os pacotes e confirmar a disponibilidade da data. 🎉

## Regras de festa x regras do parque

**Cliente:** bebê paga?  
*`IDADE_PAGAMENTO`*

> Crianças de todas as idades pagam para brincar, pois temos atrações pensadas com muito carinho para cada fase! 💛

> Para os menores de 5 anos, o acompanhamento de um adulto responsável é obrigatório e esse adulto é totalmente isento de cobrança.

**Cliente:** vocês fazem festa?  
*`FESTAS_EVENTOS`*

> Claro que sim! 🎉
> Aqui na Zind prezamos pelo seu conforto e tranquilidade: você nos fala o dia, o horário e o tema,

> e a gente cuida de tudo para a festa dos seus sonhos sair perfeita e sem dor de cabeça!

> Temos 2 espaços exclusivos para festas no maior parque indoor de Balneário Camboriú:

> 🎈 LOUNGE TÉRREO
> Até 25 pessoas.

> Um ambiente reservado dentro do parque, descontraído e pertinho de onde a brincadeira acontece. Perfeito para quem quer focar em muita diversão e ter um ponto de apoio delicioso!

> ✨ SALÃO VIP — 2º ANDAR
> Espaço privativo com parede inteira de vidro e visão panorâmica do parque.

> Conta com certo isolamento acústico para música própria, banheiros privativos masculino e feminino e copa de suporte.

> Assim, os adultos relaxam com conforto enquanto acompanham as crianças de qualquer ponto!

> Todas as nossas festas incluem:
> • 3h de parque liberadas para todos os convidados 🛝
> • Convite digital personalizado 💌

> • Monitores no parque + equipe de garçons capacitados
> • Recepcionista e entrada com pulseira exclusiva 🎟️
> • Open Bar não alcoólico: água, sucos premium, Coca-Cola e Guaraná 🥤

> • Serviço premium em copos de vidro e louças 🍽️

> Quer conhecer nossos 3 pacotes de comida e decoração para escolher o ideal?
> Digite:
> 1 — Quero conhecer os pacotes

> 2 — Tenho uma dúvida sobre a festa

**Cliente:** 2  
*`FESTAS_EVENTOS`*

> Claro! Pode me mandar a sua dúvida sobre a festa que eu te ajudo 😊

**Cliente:** bebê paga?  
*`POLITICAS_FESTA`*

> Nas festas, funciona assim: 🎈
> • Bebês de 0 a 11 meses não pagam e são nossos convidados de honra!

> • Crianças de 1 a 5 anos precisam de 1 adulto responsável acompanhando na área de brinquedos, por segurança.

## Não entendeu (fallback)

**Cliente:** queria saber umas coisas  
*`fallback`*

> Quero te ajudar! 😊 Só me confirma uma coisinha: você quer saber sobre o parque, valores, horários, festas, alimentação ou localização?

**Cliente:** hmm  
*`fallback` (avisa a equipe)*

> Vou te encaminhar para nossa equipe para te ajudar direitinho, combinado? 💛

**Cliente:** kkk  
*`fallback`*

> Quero te ajudar! 😊 Só me confirma uma coisinha: você quer saber sobre o parque, valores, horários, festas, alimentação ou localização?

## PCD e autismo

**Cliente:** Meu filho tem TEA, tem desconto?  
*`DESCONTO_PCD_AUTISMO`*

> Sim! 💙
> Pessoas PCD e autistas têm 50% de desconto na entrada, assim como 1 acompanhante responsável.

> Para validar o benefício, basta apresentar na recepção um documento oficial comprobatório:
> • Laudo médico com CID, carimbo e assinatura; ou

> • Documento de identificação oficial com foto que contenha a observação.

**Cliente:** preciso levar o laudo?  
*`DESCONTO_PCD_AUTISMO`*

> Sim! 💙 PCD e autistas têm 50% de desconto, e 1 acompanhante também.
> É só apresentar o laudo com CID ou documento oficial na recepção.

## Instagram: festa vai para o WhatsApp (Instagram)

**Cliente:** vocês fazem festa?  
*`FESTAS_EVENTOS`*

> Claro que sim! 🎉
> Aqui na Zind você nos fala o dia, o horário e o tema, e a gente cuida de tudo para a festa dos seus sonhos sair perfeita e sem dor de cabeça!

> Temos 2 espaços exclusivos: o Lounge Térreo, para até 25 pessoas, e o Salão VIP no 2º andar, com visão panorâmica do parque.

> Todas as festas incluem 3h de parque para os convidados, convite digital, monitores, garçons e open bar não alcoólico.

> Para montar a sua festa, chama a gente no WhatsApp que a nossa equipe cuida de tudo 💛
> https://wa.me/55DDDNUMERO

**Cliente:** que horas vocês abrem?  
*`HORARIO_FUNCIONAMENTO`*

> De terça a sexta, das 15h às 22h.
> Sábado e domingo, das 14h às 22h. 🎉

