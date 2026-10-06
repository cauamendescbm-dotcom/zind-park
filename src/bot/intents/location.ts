import type { Intent } from "../types.js";

export const locationIntents: Intent[] = [
  {
    id: "LOCALIZACAO",
    name: "o endereço",
    description: "Endereço do parque.",
    keywords: [
      "endereco", "onde fica", "localizacao", "local", "como chegar", "fica onde", "rua", "endereco da zind",
      "como chego", "onde voce fica", "onde e", "qual o endereco", "manda a localizacao", "localizacao no mapa",
      "google maps", "maps", "waze", "qual bairro", "em que cidade",
    ],
    synonyms: ["localizacao"],
    examples: [
      "como chego ai?",
      "onde voces ficam?",
      "qual o endereco?",
      "me manda a localizacao",
      "fica em qual bairro?",
    ],
    priority: 5,
    scope: "parque",
    response:
      "Será um prazer te receber por aqui! 📍\n" +
      "Nosso parque fica na {{endereco}}.\n\n" +
      "Temos fácil acesso e uma estrutura prontinha para receber toda a sua família!",
    shortResponse: "Fica na {{endereco}}. 📍",
  },
];
