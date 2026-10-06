import type { Intent } from "../types.js";

/** Como o parque funciona, horários e reserva. */
export const parkIntents: Intent[] = [
  {
    id: "COMO_FUNCIONA",
    name: "como funciona o parque",
    description: "Visão geral do parque: horários, permanência, valor, crianças e cafeteria.",
    keywords: [
      "como funciona", "como funciona o parque", "como e o parque", "quero conhecer", "como funciona a entrada",
      "posso chegar e brincar", "como que funciona", "me explica como funciona", "queria conhecer o parque",
      "quero saber mais", "informacoes do parque", "quero informacoes", "como faz para ir", "o que tem no parque",
      "o que e a zind", "como e a zind",
    ],
    synonyms: ["funcionamento", "parque"],
    examples: [
      "como funciona o parque de voces?",
      "queria saber como funciona ai",
      "quero conhecer o parque, como funciona?",
      "me passa as informacoes do parque",
      "como funciona a zind?",
    ],
    negativeKeywords: ["festa", "evento", "pacote"],
    priority: 5,
    scope: "parque",
    response:
      "Olá!! Que alegria receber sua mensagem e saber que você quer conhecer esse espaço super especial que preparamos para você!!!\n\n" +
      "Abrimos de terça a sexta {{horarioSemana}} e sábado e domingo {{horarioFimDeSemana}}.\n\n" +
      "O parque não tem tempo máximo de permanência. Você chega quando quiser e fica o tempo que quiser!\n" +
      "O valor é {{precoHora}} por hora.\n\n" +
      "Crianças de todas as idades pagam. Para crianças abaixo de {{idadeAcompanhante}} anos, é obrigatório o acompanhamento de um adulto responsável, que é isento da cobrança.\n\n" +
      "Além do parque, temos uma cafeteria/pub para trazer conforto e comodidade aos pais, com pratos, porções, lanches, cafés e bebidas preparados na casa. ♡",
    shortResponse:
      "É só chegar no horário de funcionamento e ficar o tempo que quiser! 😊\nO valor é {{precoHora}} por hora, pago no final da visita.",
    covers: ["HORARIO_FUNCIONAMENTO", "PRECO_PARQUE", "IDADE_PAGAMENTO", "ALIMENTACAO"],
    related: ["FESTAS_EVENTOS"],
    followUp: { question: "Quer que eu te explique também como funcionam nossas festas? 🎉", intent: "FESTAS_EVENTOS" },
  },
  {
    id: "HORARIO_FUNCIONAMENTO",
    name: "os horários",
    description: "Dias e horários de funcionamento do parque.",
    keywords: [
      "horario", "que hora abre", "quando abre", "quando fecha", "funcionamento", "abre hoje", "fecha que hora",
      "que hora fecha", "ate que hora", "horario de funcionamento", "que hora voce abrem", "esta aberto",
      "ta aberto", "abre amanha", "abre segunda", "abre domingo", "abre sabado", "dia de funcionamento",
      "que dia abre", "que dia voce abrem", "funciona domingo", "funciona segunda", "funciona hoje", "abre que hora",
    ],
    synonyms: ["horario", "diasSemana"],
    examples: [
      "que horas voces abrem?",
      "qual o horario de voces?",
      "abre no domingo?",
      "voces abrem segunda?",
      "ate que horas fica aberto?",
    ],
    negativeKeywords: [
      "festa", "evento", "aniversariante", "feriado", "natal", "ano novo", "pascoa", "carnaval", "reveillon",
      "12 de outubro", "dia das crianca", "dia da crianca",
    ],
    priority: 6,
    scope: "parque",
    response:
      "Esperamos por você nos seguintes horários:\n" +
      "• Terça a sexta: {{horarioSemana}}\n" +
      "• Sábado e domingo: {{horarioFimDeSemana}}\n\n" +
      "É só chegar e se divertir! 🎉",
    shortResponse: "De terça a sexta, {{horarioSemana}}.\nSábado e domingo, {{horarioFimDeSemana}}. 🎉",
  },
  {
    id: "RESERVA_PARQUE",
    name: "reservas para o parque",
    description: "Se precisa reservar ou comprar antes para visitar o parque.",
    keywords: [
      "precisa reservar", "reserva", "agendamento", "comprar antes", "antecipado", "ingresso antecipado",
      "precisa comprar", "posso chegar direto", "sem reservar", "sem reserva", "tem que reservar", "precisa agendar",
      "tem que agendar", "compra antecipada", "comprar ingresso", "comprar online", "vende online", "lista de espera",
      "precisa marcar", "tem que marcar", "so chegar", "ingresso pela internet", "comprar pela internet", "vende ingresso",
      "compra pela internet", "quanto tempo pode ficar", "limite de tempo", "tempo maximo", "tempo limite",
      "pode ficar quanto tempo", "posso ficar quanto tempo", "ficar o dia todo",
    ],
    synonyms: ["reserva"],
    examples: [
      "posso ir sem reservar?",
      "precisa reservar antes de ir?",
      "tem que comprar ingresso antes?",
      "da pra chegar direto ai?",
      "como faco para agendar?",
    ],
    negativeKeywords: ["festa", "evento", "salao", "lounge"],
    priority: 6,
    scope: "parque",
    response:
      "Não precisa de reserva e nem de compra antecipada! 😊\n" +
      "Nosso parque está sempre de portas abertas para você. É só chegar no horário que preferir e ficar o tempo que quiser.\n\n" +
      "O pagamento é feito ao final da visita, proporcional ao tempo que vocês aproveitaram por aqui!",
    shortResponse: "Não precisa reservar! 😊 É só chegar, e o pagamento é no final, pelo tempo que vocês ficarem.",
  },
];
