import type { Intent } from "../types.js";

/** Valor do parque e quem paga. */
export const pricingIntents: Intent[] = [
  {
    id: "PRECO_PARQUE",
    name: "o valor do parque",
    description: "Quanto custa brincar no parque (valor por hora).",
    keywords: [
      "quanto custa", "qual o valor", "qual valor", "qual o preco", "valor da entrada", "preco da entrada",
      "quanto e a hora", "valor da hora", "preco por hora", "valor por hora", "quanto fica", "quanto e",
      "quanto sai", "quanto cobra", "quanto pago", "quanto paga", "valor do ingresso", "preco do ingresso",
      "quanto e o ingresso", "tabela de preco", "valor do parque",
    ],
    synonyms: ["preco"],
    examples: [
      "quanto custa para brincar?",
      "qual o valor da hora?",
      "quanto e o ingresso?",
      "qual o preco do parque?",
      "quanto fica uma hora ai?",
    ],
    negativeKeywords: [
      "festa", "festinha", "pacote", "evento", "meia", "autista", "pcd", "aniversariante", "aniversario", "salao", "lounge",
      "adulto", "acompanhante", "internet", "online", "meia hora", "marido", "esposa", "hora e meia",
    ],
    priority: 5,
    scope: "parque",
    response:
      "O valor é {{precoHora}} por hora, sem tempo máximo de permanência. 😊\n" +
      "Você paga no final da visita, só pelo tempo que vocês aproveitaram!",
    shortResponse: "{{precoHoraCurto}}/hora.",
  },
  {
    id: "IDADE_PAGAMENTO",
    name: "quem paga no parque",
    description: "Quais crianças pagam e quando precisam de adulto (política do PARQUE, não de festas).",
    keywords: [
      "crianca paga", "bebe paga", "qual idade paga", "a partir de que idade paga", "a partir de qual idade",
      "idade minima", "crianca de 1 ano", "crianca de 2 ano", "crianca de 3 ano", "crianca de 4 ano",
      "crianca de 5 ano", "bebe de colo paga", "crianca pequena paga", "menor paga", "filho paga", "filha paga",
      "ele paga", "ela paga", "nenem paga", "crianca de colo", "entra de graca", "bebe de colo entra", "nenem de colo",
      "bebe entra de graca", "crianca entra de graca", "bebe nao paga", "bebe tambem paga",
    ],
    synonyms: ["crianca", "idade"],
    examples: [
      "meu filho tem 4 anos, ele paga?",
      "crianca de 2 anos paga?",
      "bebe paga para entrar?",
      "qual a idade minima?",
      "minha filha de 3 anos paga?",
    ],
    negativeKeywords: ["festa", "evento", "convidado", "cha de bebe", "cha", "aniversario", "gestante", "gravida"],
    priority: 6,
    scope: "parque",
    response:
      "Crianças de todas as idades pagam para brincar, pois temos atrações pensadas com muito carinho para cada fase! 💛\n\n" +
      "Para os menores de {{idadeAcompanhante}} anos, o acompanhamento de um adulto responsável é obrigatório e esse adulto é totalmente isento de cobrança.",
    shortResponse:
      "Crianças de todas as idades pagam. Para menores de {{idadeAcompanhante}} anos, o acompanhante responsável é obrigatório e gratuito. 😊",
  },
  {
    id: "ADULTO_BRINCAR",
    name: "adultos no parque",
    description: "Se adultos podem brincar e se o acompanhante paga.",
    keywords: [
      "adulto pode brincar", "pai pode brincar", "mae pode brincar", "posso brincar", "acompanhante brinca",
      "adulto entra", "adulto brinca", "adulto tambem brinca", "adulto pode entrar", "e para adulto",
      "tem brinquedo para adulto", "adulto pode ir",
    ],
    synonyms: ["adulto", "brincar"],
    examples: [
      "adulto pode brincar tambem?",
      "eu posso brincar junto com meu filho?",
      "a mae pode entrar nos brinquedos?",
      "pai pode brincar junto?",
    ],
    negativeKeywords: ["festa", "evento", "autista", "pcd", "chegar", "paga", "gestante", "gravida"],
    priority: 5,
    scope: "parque",
    response:
      "Com certeza! 😍\n" +
      "O nosso parque foi todinho projetado para crianças dos 1 aos 100 anos.\n" +
      "Então os adultos não só podem, como devem se divertir junto!\n\n" +
      "Para crianças abaixo de {{idadeAcompanhante}} anos, a presença do acompanhante é obrigatória e o adulto acompanhante é gratuito.",
    shortResponse:
      "Pode sim! 😍 Adultos também brincam.\nPara crianças abaixo de {{idadeAcompanhante}} anos, o acompanhante é obrigatório e gratuito.",
  },
  {
    id: "ADULTO_PAGA",
    name: "quanto o adulto paga",
    description: "Se o adulto acompanhante paga. Só existe a regra do acompanhante de menores de 5 anos.",
    keywords: [
      "adulto paga", "acompanhante paga", "responsavel paga", "mae paga", "pai paga", "eu pago", "adulto tambem paga",
      "quanto custa para adulto", "quanto custa adulto", "valor do adulto", "valor para adulto", "preco do adulto",
      "preco para adulto", "adulto paga para brincar", "quanto paga o adulto", "quanto o adulto paga",
      "adulto acompanhante paga", "acompanhante e gratis", "adulto e gratis", "adulto nao paga",
      "eu e meu marido", "eu e minha esposa", "a gente paga", "nos pagamos", "adultos pagam", "pagamos tambem",
      "pode acompanhar de graca", "acompanhar de graca", "vovo pode acompanhar", "avo pode acompanhar",
    ],
    synonyms: ["adulto"],
    examples: ["adulto paga?", "o acompanhante paga?", "quanto custa para adulto?", "eu pago tambem?", "a mae paga?"],
    negativeKeywords: ["festa", "evento", "autista", "pcd"],
    priority: 6,
    scope: "parque",
    // O que a Zind informou: o adulto que acompanha criança menor de 5 anos não paga. Nada além disso.
    response:
      "Para crianças abaixo de {{idadeAcompanhante}} anos, o acompanhamento de um adulto responsável é obrigatório e esse adulto acompanhante é isento da cobrança. 😊",
  },
];
