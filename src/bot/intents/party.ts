import type { Intent } from "../types.js";

/**
 * Festas e eventos. Regras de festa (POLITICAS_FESTA) são diferentes das do parque
 * (IDADE_PAGAMENTO): nunca misturar sem o contexto de festa.
 */
export const partyIntents: Intent[] = [
  {
    id: "FESTAS_EVENTOS",
    name: "festas de aniversário",
    description: "Como funcionam as festas: espaços e o que está incluso.",
    keywords: [
      "voce fazem festa", "fazem festa", "fazem aniversario", "voce fazem aniversario", "quero fazer aniversario",
      "quero fazer o aniversario", "fazer o aniversario", "fazer aniversario", "fazer a festa", "fazer uma festa",
      "quero comemorar", "festa", "festinha", "festa infantil", "evento", "comemorar ai", "como funciona festa",
      "como funciona a festa", "festa na zind", "aniversario na zind", "festa de aniversario", "aniversario da minha filha",
      "aniversario do meu filho", "aniversario da minha", "aniversario do meu", "comemorar o aniversario",
      "comemorar aniversario", "espaco para festa", "salao de festa", "salao vip", "lounge", "lounge terreo",
      "aluga o espaco", "alugar o espaco", "confraternizacao", "evento corporativo", "festa ai", "festa de crianca",
      "capacidade do lounge", "lounge cabe", "cabe no lounge",
    ],
    synonyms: ["festa", "aniversario"],
    examples: [
      "voces fazem festas?",
      "quero fazer o aniversario da minha filha ai",
      "como funciona a festa de aniversario?",
      "quero comemorar o niver do meu filho ai",
      "voces fazem niver?",
    ],
    negativeKeywords: [
      "quanto custa", "preco", "valor", "quanto fica", "quanto sai", "orcamento", "pacote", "bebe paga", "convidado paga",
      "hoje", "ganha", "cortesia", "nao quero festa", "sem festa", "so ir brincar", "so brincar", "organizadora",
      "cha de bebe", "cha revelacao", "batizado", "cabe no salao", "salao vip cabe", "capacidade do salao",
    ],
    priority: 9,
    scope: "festa",
    response:
      "Claro que sim! 🎉\n" +
      "Aqui na Zind prezamos pelo seu conforto e tranquilidade: você nos fala o dia, o horário e o tema, e a gente cuida de tudo para a festa dos seus sonhos sair perfeita e sem dor de cabeça!\n\n" +
      "Temos 2 espaços exclusivos para festas no maior parque indoor de Balneário Camboriú:\n\n" +
      "🎈 LOUNGE TÉRREO\n" +
      "Até {{loungeMax}} pessoas.\n" +
      "Um ambiente reservado dentro do parque, descontraído e pertinho de onde a brincadeira acontece. Perfeito para quem quer focar em muita diversão e ter um ponto de apoio delicioso!\n\n" +
      "✨ SALÃO VIP — 2º ANDAR\n" +
      "Espaço privativo com parede inteira de vidro e visão panorâmica do parque.\n" +
      "Conta com certo isolamento acústico para música própria, banheiros privativos masculino e feminino e copa de suporte.\n" +
      "Assim, os adultos relaxam com conforto enquanto acompanham as crianças de qualquer ponto!\n\n" +
      "Todas as nossas festas incluem:\n" +
      "• 3h de parque liberadas para todos os convidados 🛝\n" +
      "• Convite digital personalizado 💌\n" +
      "• Monitores no parque + equipe de garçons capacitados\n" +
      "• Recepcionista e entrada com pulseira exclusiva 🎟️\n" +
      "• Open Bar não alcoólico: água, sucos premium, Coca-Cola e Guaraná 🥤\n" +
      "• Serviço premium em copos de vidro e louças 🍽️\n\n" +
      "Quer conhecer nossos 3 pacotes de comida e decoração para escolher o ideal?\n" +
      "Digite:\n" +
      "1 — Quero conhecer os pacotes\n" +
      "2 — Tenho uma dúvida sobre a festa",
    /** Instagram: as festas são atendidas no WhatsApp. */
    responseWithoutPartyFlow:
      "Claro que sim! 🎉\n" +
      "Aqui na Zind você nos fala o dia, o horário e o tema, e a gente cuida de tudo para a festa dos seus sonhos sair perfeita e sem dor de cabeça!\n\n" +
      "Temos 2 espaços exclusivos: o Lounge Térreo, para até {{loungeMax}} pessoas, e o Salão VIP no 2º andar, com visão panorâmica do parque.\n\n" +
      "Todas as festas incluem 3h de parque para os convidados, convite digital, monitores, garçons e open bar não alcoólico.\n\n" +
      "Para montar a sua festa, chama a gente no WhatsApp que a nossa equipe cuida de tudo 💛\n{{linkWhatsapp}}",
    shortResponse:
      "Temos o Lounge Térreo (até {{loungeMax}} pessoas) e o Salão VIP no 2º andar, e a gente cuida de tudo da festa! 🎉\n" +
      "Quer conhecer os pacotes?",
    related: ["PACOTES_FESTA", "POLITICAS_FESTA"],
    requiresData: true,
  },
  {
    id: "PACOTES_FESTA",
    name: "os pacotes de festa",
    description: "Pacotes de festa (comida, decoração e valores). Valores só depois do PDF oficial.",
    keywords: [
      "pacote", "pacote de festa", "quero conhecer os pacotes", "conhecer os pacotes", "quanto custa uma festa",
      "quanto custa a festa", "quanto custa festa", "quanto fica uma festa", "quanto fica a festa", "valor da festa",
      "preco da festa", "valor de uma festa", "preco de uma festa", "valor do pacote", "preco do pacote",
      "orcamento", "orcamento de festa", "cardapio da festa", "decoracao", "buffet", "o que tem no pacote",
      "opcoes de pacote", "quanto e a festa", "valor para festa", "quanto custa para fazer uma festa",
      "quanto custa para fazer o aniversario", "quanto custa o aniversario", "valor do aniversario",
      "quanto fica o aniversario", "quanto fica uma festinha", "quanto custa uma festinha", "valor da festinha",
      "preco do lounge", "valor do lounge", "quanto custa o lounge", "preco do salao", "valor do salao",
      "quanto custa o salao", "quanto e o lounge", "quanto e o salao",
    ],
    negativeKeywords: ["mensal", "mensalidade", "de hora", "de 2 hora", "passaporte", "organizadora"],
    synonyms: ["pacote", "festa"],
    examples: [
      "quanto custa uma festa?",
      "quais sao os pacotes?",
      "qual o valor da festa de aniversario?",
      "me manda os pacotes",
      "quero um orcamento para festa",
    ],
    priority: 8,
    scope: "festa",
    response:
      "Claro! 🎉 Temos 3 opções de pacotes para diferentes estilos de comemoração.\n\n" +
      "Os detalhes completos de cada pacote estão sendo finalizados e, assim que estiverem disponíveis no nosso atendimento, posso te apresentar todas as opções de comida, decoração e valores.\n\n" +
      "Se quiser, também posso te ajudar primeiro a entender qual espaço combina melhor com a sua festa. 😊",
    responseWithoutPartyFlow:
      "Claro! 🎉 Temos 3 opções de pacotes para diferentes estilos de comemoração.\n\n" +
      "Os detalhes completos de cada pacote estão sendo finalizados. Para saber mais e montar a sua festa, chama a gente no WhatsApp 💛\n{{linkWhatsapp}}",
    shortResponse:
      "Os detalhes dos pacotes (comida, decoração e valores) estão sendo finalizados. 😊\nSe quiser, já te ajudo a escolher o espaço ideal!",
    related: ["FESTAS_EVENTOS"],
    requiresData: true,
  },
  {
    id: "POLITICAS_FESTA",
    name: "as regras das festas",
    description: "Políticas específicas de festas (bebês e crianças pequenas). Não é a política do parque.",
    keywords: [
      "bebe paga na festa", "bebe na festa", "bebe e convidado", "bebe conta como convidado", "convidado bebe",
      "bebe de colo na festa", "crianca pequena na festa", "regra da festa", "politica da festa", "regras das festas",
      "convidado paga", "bebe conta", "crianca de colo na festa", "conta como convidado", "adulto acompanha na festa",
      "precisa de adulto na festa", "convidado pequeno", "na festa bebe paga", "na festa a mae precisa acompanhar",
      "adulto paga na festa", "precisa acompanhar na festa", "adulto na festa", "mae na festa", "crianca na festa",
      "conta na festa", "convidado de", "convidado precisa", "convidado pequeno precisa",
    ],
    synonyms: ["festa"],
    examples: [
      "bebe paga na festa?",
      "bebe de 8 meses conta como convidado?",
      "quais as regras da festa?",
      "crianca pequena precisa de adulto na festa?",
      "convidado de 2 anos precisa de acompanhante na festa?",
    ],
    negativeKeywords: ["organizadora"],
    priority: 8,
    scope: "festa",
    response:
      "Nas festas, funciona assim: 🎈\n" +
      "• Bebês de 0 a 11 meses não pagam e são nossos convidados de honra!\n" +
      "• Crianças de 1 a 5 anos precisam de 1 adulto responsável acompanhando na área de brinquedos, por segurança.",
  },
];
