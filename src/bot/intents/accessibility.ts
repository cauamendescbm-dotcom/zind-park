import type { Intent } from "../types.js";

export const accessibilityIntents: Intent[] = [
  {
    id: "DESCONTO_PCD_AUTISMO",
    name: "o desconto para PCD e autistas",
    description: "Benefício de 50% para pessoas PCD, autistas e 1 acompanhante.",
    keywords: [
      "pcd", "pessoa com deficiencia", "autista", "autismo", "laudo", "desconto autista", "desconto pcd",
      "meia pcd", "meia autista", "desconto especial", "tea", "deficiente", "cadeirante", "sindrome de down",
      "necessidade especial", "neurodivergente", "autista paga meia", "autista paga", "pcd paga",
      "espectro autista", "cid",
    ],
    synonyms: ["pcd", "autismo", "desconto"],
    examples: [
      "autista paga meia?",
      "tem desconto para pcd?",
      "meu filho e autista",
      "quanto paga um autista?",
      "meu filho tem tea, tem desconto?",
    ],
    negativeKeywords: ["acessibilidade", "estudante", "irmao", "professor", "idoso", "rampa", "elevador", "original", "copia", "digital"],
    priority: 7,
    scope: "parque",
    response:
      "Sim! 💙\n" +
      "Pessoas PCD e autistas têm {{descontoPcd}} de desconto na entrada, assim como 1 acompanhante responsável.\n\n" +
      "Para validar o benefício, basta apresentar na recepção um documento oficial comprobatório:\n" +
      "• Laudo médico com CID, carimbo e assinatura; ou\n" +
      "• Documento de identificação oficial com foto que contenha a observação.",
    shortResponse:
      "Sim! 💙 PCD e autistas têm {{descontoPcd}} de desconto, e 1 acompanhante também.\nÉ só apresentar o laudo com CID ou documento oficial na recepção.",
  },
];
