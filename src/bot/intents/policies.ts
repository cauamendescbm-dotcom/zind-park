import type { Intent } from "../types.js";

/** Regras de uso do parque (as regras de festa ficam em party.ts). */
export const policyIntents: Intent[] = [
  {
    id: "MEIA_ANTIDERRAPANTE",
    name: "a meia antiderrapante",
    description: "Uso obrigatório de meia antiderrapante e venda no local.",
    keywords: [
      "meia", "meia antiderrapante", "precisa de meia", "meia obrigatoria", "esqueci minha meia", "vende meia",
      "antiderrapante", "precisa usar meia", "tem que usar meia", "pode entrar de tenis", "pode entrar descalco",
      "de tenis", "descalco", "valor da meia", "quanto custa a meia", "preco da meia", "esqueci a meia",
    ],
    synonyms: ["meia"],
    examples: [
      "precisa usar meia?",
      "esqueci a meia, voces vendem?",
      "e obrigatorio meia antiderrapante?",
      "quanto custa a meia?",
      "pode brincar de tenis?",
    ],
    negativeKeywords: ["autista", "pcd", "desconto", "meia entrada", "paga meia", "deficiencia", "laudo", "meia hora", "estudante", "e meia", "hora e meia"],
    priority: 6,
    scope: "parque",
    response:
      "Sim! 🧦\n" +
      "O uso de meia antiderrapante é obrigatório por segurança nos brinquedos.\n" +
      "Você pode trazer a sua de casa ou adquirir um par novinho aqui com a gente por {{precoMeia}}.",
    shortResponse: "A meia antiderrapante é obrigatória 🧦\nSe não tiver, vendemos aqui por {{precoMeia}}.",
  },
];
