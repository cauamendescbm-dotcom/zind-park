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
  {
    id: "ESTACIONAMENTO",
    name: "o estacionamento",
    description: "Se o parque tem estacionamento (não tem).",
    keywords: [
      "estacionamento", "estacionar", "onde estaciono", "onde paro o carro", "onde deixo o carro", "parar o carro",
      "deixar o carro", "vaga para carro", "vaga de carro", "tem vaga", "garagem", "manobrista", "valet",
    ],
    synonyms: [],
    examples: [
      "tem estacionamento?",
      "onde eu paro o carro?",
      "tem onde estacionar?",
      "o estacionamento e pago?",
      "tem vaga pra carro?",
    ],
    negativeKeywords: ["emprego", "trabalho", "curriculo"],
    priority: 6,
    scope: "parque",
    response: "Não temos estacionamento próprio, combinado? 🚗\nNosso endereço é {{endereco}}.",
    shortResponse: "Não temos estacionamento próprio. 🚗",
  },
];
