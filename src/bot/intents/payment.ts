import type { Intent } from "../types.js";

export const paymentIntents: Intent[] = [
  {
    id: "PAGAMENTO",
    name: "formas de pagamento",
    description: "Formas de pagamento aceitas.",
    keywords: [
      "pix", "cartao", "credito", "debito", "dinheiro", "pagamento", "forma de pagamento", "aceita cartao",
      "aceita pix", "como pago", "como faco o pagamento", "parcela", "parcelar", "maquininha",
    ],
    synonyms: ["pagamento"],
    examples: [
      "tem pix?",
      "aceita cartao de credito?",
      "quais as formas de pagamento?",
      "posso pagar no debito?",
      "aceitam dinheiro?",
    ],
    priority: 5,
    scope: "parque",
    response:
      "Aceitamos:\n" +
      "💳 Cartão de crédito\n" +
      "💳 Cartão de débito\n" +
      "📱 Pix\n" +
      "💵 Dinheiro\n\n" +
      "O acerto é feito no final da visita, de acordo com o tempo exato que vocês permaneceram se divertindo!",
    shortResponse: "Aceitamos cartão de crédito, débito, Pix e dinheiro! 😊\nO pagamento é no final da visita.",
  },
];
