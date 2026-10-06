import type { Intent } from "../types.js";

/** Aniversariante VISITANDO o parque (não é festa). Festas ficam em party.ts. */
export const birthdayIntents: Intent[] = [
  {
    id: "ANIVERSARIANTE",
    name: "a cortesia para o aniversariante no parque",
    description: "Benefício de quem faz aniversário e vem brincar no parque.",
    keywords: [
      "aniversariante", "parabens", "aniversario hoje", "meu aniversario", "hoje e meu aniversario",
      "e meu aniversario", "sou aniversariante", "faco aniversario", "fazendo aniversario", "aniversariante paga",
      "aniversariante ganha", "aniversariante nao paga", "aniversariante tem desconto", "estou de aniversario",
      "to de aniversario", "dia do meu aniversario", "aniversario dele", "aniversario dela", "faz aniversario hoje",
      "aniversariante do dia", "aniversariante do mes", "beneficio de aniversario", "desconto de aniversario",
      "cortesia de aniversario", "ganha algo", "ganha alguma coisa", "hoje e aniversario", "e aniversario dele",
      "e aniversario dela", "aniversario do meu filho hoje", "aniversario da minha filha hoje", "so ir brincar",
      "hora gratis", "hora de graca", "ganha a hora", "primeira hora",
    ],
    synonyms: ["aniversario"],
    examples: [
      "hoje e meu aniversario",
      "aniversariante paga?",
      "meu filho faz aniversario hoje, tem desconto?",
      "aniversariante ganha alguma coisa?",
      "sou aniversariante do dia",
    ],
    negativeKeywords: [
      "festa", "festinha", "pacote", "salao", "lounge", "convidado", "evento", "comemorar", "comemoracao",
      "quanto custa", "quanto fica", "quanto sai", "orcamento", "levar", "trazer", "bolo",
    ],
    priority: 6,
    scope: "parque",
    response:
      "É claro que sim! 🎉\n" +
      "Amamos quando você escolhe comemorar essa data tão especial com a gente!\n\n" +
      "Aniversariantes que vierem acompanhados de 1 pagante ganham a primeira hora de parque como cortesia da casa, além de um parabéns super especial com uma delícia preparada com muito carinho pela nossa equipe!\n\n" +
      "Lembre-se de trazer um documento com foto para comprovar a data. 💛",
    shortResponse:
      "O aniversariante acompanhado de 1 pagante ganha a primeira hora de parque, e tem parabéns especial! 🎉\nÉ só trazer um documento com foto.",
    related: ["FESTAS_EVENTOS"],
    followUp: { question: "Quer saber também como funcionam nossas festas de aniversário? 🎈", intent: "FESTAS_EVENTOS" },
  },
];
