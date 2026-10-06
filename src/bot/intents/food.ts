import type { Intent } from "../types.js";

export const foodIntents: Intent[] = [
  {
    id: "ALIMENTACAO",
    name: "a cafeteria",
    description: "Cafeteria/pub dentro do parque.",
    keywords: [
      "comida", "alimentacao", "restaurante", "cafeteria", "pub", "lanche", "almoco", "porcao", "cafe", "bebida", "tem comida",
      "tem onde comer", "lanchonete", "tem lanche", "vende comida", "tem bebida", "tem cerveja",
      "tem chopp", "da para comer", "onde comer", "janta", "jantar",
    ],
    synonyms: ["comida"],
    examples: [
      "tem comida ai?",
      "voces tem restaurante?",
      "tem cafeteria no parque?",
      "da pra lanchar ai?",
      "vende bebida?",
    ],
    negativeKeywords: ["levar", "trazer", "de fora", "de casa", "entrar com", "festa", "pacote", "ticket", "vale"],
    priority: 5,
    scope: "parque",
    response:
      "Sim, e é uma delícia! 🍔☕\n" +
      "Além da área de brinquedos, temos uma cafeteria/pub completa para trazer todo o conforto e comodidade aos pais e famílias.\n\n" +
      "Servimos pratos, porções, lanches, cafés e bebidas preparados na casa.\n" +
      "Você pode brincar e fazer uma pausa gostosa para lanchar com a gente!",
    shortResponse: "Temos sim! ☕ Nossa cafeteria/pub serve pratos, porções, lanches, cafés e bebidas preparados na casa.",
  },
  {
    id: "CARDAPIO",
    name: "o cardápio",
    description: "Pergunta sobre um prato, lanche ou bebida específica: o cardápio completo fica no parque.",
    keywords: [
      "cardapio", "menu", "pastel", "sorvete", "pizza", "acai", "coxinha", "batata frita", "hamburguer", "hamburger",
      "menu infantil", "prato infantil", "vegano", "vegana", "vegetariano", "vegetariana", "sem gluten",
      "sem lactose", "salgado", "refrigerante", "cerveja", "chopp", "drink", "cafe da manha",
      "sanduiche", "lanche natural", "fruta", "papinha", "o que tem para comer", "o que voces servem",
    ],
    synonyms: ["comida"],
    examples: [
      "tem pastel?",
      "vende sorvete?",
      "qual o cardapio?",
      "tem opcao vegana?",
      "tem comida sem gluten?",
    ],
    negativeKeywords: ["levar", "trazer", "de fora", "de casa", "entrar com", "festa", "pacote", "parabens", "aniversario"],
    priority: 6,
    scope: "parque",
    response:
      "Nossa cafeteria/pub serve pratos, porções, lanches, cafés e bebidas preparados na casa. ☕\n" +
      "O cardápio completo vocês conferem aqui quando chegarem! 😊",
  },
  {
    id: "COMIDA_FORA",
    name: "levar comida de fora",
    description: "Regra sobre alimentos e bebidas de fora.",
    keywords: [
      "posso levar comida", "comida de fora", "pode levar lanche", "posso levar bebida", "pode entrar com comida",
      "posso trazer comida", "levar lanche", "levar comida", "levar bebida", "trazer lanche", "trazer bebida",
      "entrar com comida", "entrar com lanche", "entrar com bebida", "mamadeira", "papinha", "lanche de casa",
      "comida de casa", "levar bolo", "levar o bolo", "trazer o bolo", "levar um bolo", "trazer bolo",
      "posso levar meu lanche", "levar agua",
    ],
    synonyms: ["levarComida", "comida"],
    examples: [
      "posso levar meu lanche?",
      "pode levar comida de casa?",
      "posso entrar com bebida?",
      "pode levar a mamadeira?",
      "da para trazer lanche para as criancas?",
    ],
    negativeKeywords: ["festa", "pacote", "evento", "cachorro", "pet", "animal", "gato"],
    priority: 6,
    scope: "parque",
    response:
      "Para garantir a segurança alimentar e a higiene de todas as nossas instalações, não é permitida a entrada de alimentos e bebidas de fora.\n\n" +
      "As exceções são mamadeiras e alimentação especial para bebês ou pessoas com restrições médicas.\n\n" +
      "Mas pode ficar tranquilo: nossa cafeteria/pub tem opções deliciosas para todos os gostos! 😋",
    shortResponse:
      "Não é permitido entrar com comida e bebida de fora. 😊\nSó mamadeiras e alimentação especial para bebês ou restrições médicas.",
  },
];
