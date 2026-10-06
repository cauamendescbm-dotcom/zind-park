/**
 * Respostas fixas que não são de uma intenção só (fallback, contexto, coleta da festa).
 * O texto oficial de cada intenção fica no arquivo da intenção (src/bot/intents).
 */
export const replies = {
  noParty: "Sem problema!",
  loungeCapacity: (max: number) =>
    `O Lounge Térreo recebe até ${max} pessoas. 🎈\nA capacidade do Salão VIP a nossa equipe confirma para você.`,
  fallbackFirst:
    "Quero te ajudar! 😊 Só me confirma uma coisinha: você quer saber sobre o parque, valores, horários, festas, alimentação ou localização?",
  fallbackHuman: "Vou te encaminhar para nossa equipe para te ajudar direitinho, combinado? 💛",
  missingInfo: "Essa informação eu não tenho disponível por aqui, mas nossa equipe pode confirmar para você.",
  clarifyParkOrParty: "Claro! 😊 Você quer saber sobre o uso normal do parque ou sobre festas de aniversário?",
  clarify: (a: string, b: string) => `Claro! 😊 Você quer saber sobre ${a} ou sobre ${b}?`,
  /** "E eu?" logo depois de perguntar se a criança paga. */
  adultCompanion:
    "Para crianças abaixo de {{idadeAcompanhante}} anos, o acompanhamento de um adulto responsável é obrigatório e esse adulto acompanhante é isento da cobrança. 😊",
  attachment: "Por aqui eu consigo ler só mensagens de texto 😊\nMe conta por escrito como posso te ajudar?",
  suggestionDeclined: "Tudo bem! 😊 Se precisar de algo, é só me chamar.",
  partyDoubt: "Claro! Pode me mandar a sua dúvida sobre a festa que eu te ajudo 😊",
  partyAlreadyHandedOff: "O seu pedido de festa já está com a nossa organizadora 💛\nEla vai falar com você por aqui.",
  partyOnWhatsapp: "Para montar a sua festa, chama a gente no WhatsApp que a nossa equipe cuida de tudo 💛\n{{linkWhatsapp}}",
};
