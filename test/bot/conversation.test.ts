import { describe, expect, it } from "vitest";
import { handleMessage, type BotOptions, type BotState, type BotTurn } from "../../src/bot/index.js";
import { pkg } from "../helpers.js";

const WHATSAPP: BotOptions = { partyFlow: true, phoneKnown: true, whatsappLink: "https://wa.me/5547000000000", deferUnknownToAgent: false, packages: [] };
const INSTAGRAM: BotOptions = { ...WHATSAPP, partyFlow: false, phoneKnown: false };

/** Conversa de várias mensagens, guardando o estado entre elas. */
function chat(options: BotOptions = WHATSAPP) {
  let state: BotState | null = null;
  return (text: string): BotTurn => {
    const turn = handleMessage(text, state, options);
    state = turn.state;
    return turn;
  };
}

describe("respostas oficiais", () => {
  it("COMO_FUNCIONA traz a resposta completa com os dados do parkConfig", () => {
    const r = chat()("Como funciona o parque?").reply!;
    expect(r).toContain("Abrimos de terça a sexta das 15h às 22h e sábado e domingo das 14h às 22h.");
    expect(r).toContain("O valor é R$ 80,00 por hora.");
    expect(r).toContain("cafeteria/pub");
  });

  it("endereço, meia e desconto PCD", () => {
    expect(chat()("qual o endereço da zind?").reply).toContain("Rua Chile, 85, Bairro Nações, Balneário Camboriú");
    expect(chat()("precisa usar meia?").reply).toContain("R$ 25,00");
    expect(chat()("tem desconto para autista?").reply).toContain("50% de desconto");
  });

  it("FESTAS_EVENTOS termina com o menu 1/2 e o 1 mostra os pacotes", () => {
    const say = chat();
    const r = say("Vocês fazem festas?").reply!;
    expect(r).toContain("LOUNGE TÉRREO");
    expect(r).toContain("Até 25 pessoas.");
    expect(r).toMatch(/1 — Quero conhecer os pacotes\n2 — Tenho uma dúvida sobre a festa$/);
    const p = say("1");
    expect(p.intent).toBe("PACOTES_FESTA");
    expect(p.reply).toContain("estão sendo finalizados");
  });

  it("menu da festa: 2 abre espaço para a dúvida", () => {
    const say = chat();
    say("quero fazer uma festa aí");
    expect(say("2").reply).toContain("dúvida sobre a festa");
  });
});

describe("nunca inventa preço de festa (seção 19)", () => {
  it("sem o PDF, nenhuma resposta de festa tem R$", () => {
    for (const t of ["Quanto custa uma festa?", "qual o valor do pacote?", "me manda os pacotes", "quanto fica o aniversário?"]) {
      const r = chat()(t);
      expect(r.intent, t).toBe("PACOTES_FESTA");
      expect(r.reply, t).not.toMatch(/R\$\s?\d/);
    }
  });

  it("com o PDF cadastrado, mostra os pacotes e o detalhe de um deles", () => {
    const say = chat({ ...WHATSAPP, packages: [pkg("pacote_1", "Encanto", 3500), pkg("pacote_2", "Magia", 5200)] });
    expect(say("quais são os pacotes?").reply).toContain("Encanto: R$ 3.500,00");
    expect(say("me fala do pacote magia").reply).toContain("Magia: R$ 5.200,00");
  });
});

describe("contexto (seção 21) e repetição (seção 26)", () => {
  it('"E eu?" depois de perguntar se a criança paga = o adulto acompanhante', () => {
    const say = chat();
    expect(say("Meu filho tem 4 anos, ele paga?").reply).toContain("Crianças de todas as idades pagam");
    const r = say("E eu?");
    expect(r.reply).toBe(
      "Para crianças abaixo de 5 anos, o acompanhamento de um adulto responsável é obrigatório e esse adulto acompanhante é isento da cobrança. 😊",
    );
  });

  it('"Quanto custa?" → R$ 80/hora, e "E criança de 4 anos?" → resposta curta', () => {
    const say = chat();
    expect(say("Quanto custa?").reply).toBe("R$ 80/hora.");
    expect(say("E criança de 4 anos?").reply).toBe(
      "Crianças de todas as idades pagam. Para menores de 5 anos, o acompanhante responsável é obrigatório e gratuito. 😊",
    );
  });

  it("pergunta simples ganha resposta curta (seção 25)", () => {
    expect(chat()("Que horas abre?").reply).toBe("De terça a sexta, das 15h às 22h.\nSábado e domingo, das 14h às 22h. 🎉");
  });

  it("assunto já explicado não repete a resposta inteira", () => {
    const say = chat();
    const first = say("como funciona o parque?").reply!;
    const again = say("como funciona mesmo?").reply!;
    expect(again.length).toBeLessThan(first.length / 2);
    // COMO_FUNCIONA já falou dos horários: a pergunta seguinte ganha a versão curta.
    expect(say("qual o horário de funcionamento de vocês?").reply).toBe(
      "De terça a sexta, das 15h às 22h.\nSábado e domingo, das 14h às 22h. 🎉",
    );
  });

  it("no assunto festa, 'bebê paga?' é a regra da festa, não a do parque", () => {
    const park = chat()("bebê paga?");
    expect(park.intent).toBe("IDADE_PAGAMENTO");
    const say = chat();
    say("vocês fazem festa?");
    const party = say("bebê paga?");
    expect(party.intent).toBe("POLITICAS_FESTA");
    expect(party.reply).toContain("Bebês de 0 a 11 meses não pagam");
  });

  it("no assunto festa, 'quanto custa?' é sobre os pacotes", () => {
    const say = chat();
    say("vocês fazem festa?");
    expect(say("e quanto custa?").intent).toBe("PACOTES_FESTA");
  });

  it("sugere o próximo passo no máximo uma vez", () => {
    const say = chat();
    expect(say("como funciona o parque?").reply).toContain("Quer que eu te explique também como funcionam nossas festas?");
    expect(say("ok").intent).toBe("FESTAS_EVENTOS");
    expect(say("quero").intent).toBe("PACOTES_FESTA"); // "quero" no menu 1/2 = conhecer os pacotes
    expect(say("hoje é meu aniversário").reply).not.toContain("Quer saber também");
  });
});

describe("conflito aniversário x festa (seção 22)", () => {
  it("cada frase vai para a intenção certa", () => {
    expect(chat()("Hoje é meu aniversário").intent).toBe("ANIVERSARIANTE");
    expect(chat()("Quero fazer o aniversário da minha filha aí").intent).toBe("FESTAS_EVENTOS");
    expect(["FESTAS_EVENTOS", "PACOTES_FESTA"]).toContain(chat()("Quanto custa uma festa?").intent);
  });

  it('"aniversário" sozinho: pergunta e entende a resposta', () => {
    const say = chat();
    expect(say("aniversário").reply).toBe("Claro! 😊 Você quer saber sobre o uso normal do parque ou sobre festas de aniversário?");
    expect(say("do parque").intent).toBe("ANIVERSARIANTE");
    const say2 = chat();
    say2("niver");
    expect(say2("festa").intent).toBe("FESTAS_EVENTOS");
  });
});

describe("fallback (seção 24)", () => {
  it("1ª vez pergunta o assunto; 2ª vez encaminha para a equipe", () => {
    const say = chat();
    const a = say("asdfgh");
    expect(a.fallback).toBe(true);
    expect(a.reply).toBe(
      "Quero te ajudar! 😊 Só me confirma uma coisinha: você quer saber sobre o parque, valores, horários, festas, alimentação ou localização?",
    );
    expect(a.needsHuman).toBe(false);
    const b = say("qwerty");
    expect(b.reply).toBe("Vou te encaminhar para nossa equipe para te ajudar direitinho, combinado? 💛");
    expect(b.needsHuman).toBe(true);
  });

  it("depois do fallback, 'valores' é entendido", () => {
    const say = chat();
    say("hmmm");
    expect(say("valores").intent).toBe("PRECO_PARQUE");
  });

  it("nunca diz 'Não entendi sua pergunta'", () => {
    const say = chat();
    for (const t of ["???", "lalala", "zzz"]) expect(say(t).reply).not.toMatch(/não entendi/i);
  });

  it("assunto fora da base: diz que não tem a informação e chama a equipe", () => {
    const r = chat()("tem fraldário?");
    expect(r.reply).toContain("Essa informação eu não tenho disponível por aqui, mas nossa equipe pode confirmar para você.");
    expect(r.needsHuman).toBe(true);
  });

  it("modo híbrido: o que o bot não entende vai para o agente com IA", () => {
    const say = chat({ ...WHATSAPP, deferUnknownToAgent: true });
    const r = say("vocês fazem tatuagem?");
    expect(r.deferToAgent).toBe(true);
    expect(r.reply).toBeNull();
    expect(r.state.fallbackCount).toBe(0);
    expect(say("tem fraldário?").deferToAgent).toBe(true);
    expect(say("que horas abre?").deferToAgent).toBe(false);
  });
});

describe("captura de lead de festa (seção 28)", () => {
  it("pergunta um dado por vez e termina repassando", () => {
    const say = chat();
    say("quero fazer o aniversário do meu filho aí");
    say("1");
    expect(say("sim").reply).toBe("Que legal! 🎉 Para eu te ajudar melhor, qual seria a data que você está pensando para a festa?");
    expect(say("15/11").reply).toContain("quantos convidados");
    expect(say("uns 30").reply).toContain("horário");
    expect(say("à tarde").reply).toContain("Quantos anos");
    expect(say("vai fazer 6").reply).toContain("Lounge Térreo");
    const space = say("salão vip");
    expect(space.reply).toContain("tema");
    expect(say("Patrulha Canina").reply).toContain("seu nome");
    const done = say("Ana Paula");
    expect(done.leadComplete).toEqual({
      date: "15/11",
      guests: 30,
      time: "à tarde",
      birthdayAge: "6 anos",
      space: "Salão VIP (2º andar)",
      theme: "Patrulha Canina",
      name: "Ana Paula",
    });
    expect(done.reply).toContain("Prontinho, Ana!");
    expect(done.reply).not.toMatch(/reservad|garantid/i); // não promete reserva
    expect(done.state.leadStatus).toBe("done");
  });

  it("pedido direto para fechar a festa começa a coleta", () => {
    const r = chat()("quero reservar uma festa para o dia 20");
    expect(r.state.leadStatus).toBe("collecting");
    expect(r.state.lead.date).toBe("dia 20");
    expect(r.reply).toContain("convidados");
  });

  it("pergunta no meio da coleta: responde e volta para a festa", () => {
    const say = chat();
    say("quero contratar uma festa");
    const r = say("tem fraldário?");
    expect(r.reply).toContain("Essa informação eu não tenho");
    expect(r.reply).toContain("E voltando para a festa: Qual seria a data");
    expect(r.state.leadStatus).toBe("collecting");
  });

  it("aceita 'não sei' e segue sem travar", () => {
    const say = chat();
    say("quero fechar uma festa");
    expect(say("ainda não sei").reply).toContain("convidados");
    expect(say("hmm").reply).toContain("número aproximado");
    expect(say("hmm").reply).toContain("Sem problemas");
  });

  it("Lounge com mais de 25 pessoas ganha um aviso", () => {
    const say = chat();
    say("quero fechar uma festa");
    say("20/12");
    say("40");
    say("15h");
    say("4 anos");
    expect(say("lounge").reply).toContain("até 25 pessoas");
  });

  it("cliente desiste no meio", () => {
    const say = chat();
    say("quero fechar uma festa");
    const r = say("deixa pra lá, desisti");
    expect(r.state.leadStatus).toBe("cancelled");
    expect(r.leadComplete).toBeNull();
  });

  it("depois de repassada, não abre outra coleta", () => {
    const say = chat();
    say("quero fechar uma festa");
    for (const t of ["10/10", "20", "14h", "3 anos", "lounge", "dinossauro", "Rui"]) say(t);
    expect(say("quero reservar a festa").reply).toContain("já está com a nossa organizadora");
  });

  it("fora do WhatsApp (ex.: site) pergunta o telefone", () => {
    const say = chat({ ...WHATSAPP, phoneKnown: false });
    say("quero fechar uma festa");
    for (const t of ["10/10", "20", "14h", "3 anos", "lounge", "dinossauro"]) say(t);
    expect(say("Rui").reply).toContain("WhatsApp com DDD");
    expect(say("(47) 99999-1234").leadComplete?.phone).toBe("47999991234");
  });
});

describe("Instagram: festas vão para o WhatsApp", () => {
  it("explica as festas e manda o link, sem menu e sem coleta", () => {
    const say = chat(INSTAGRAM);
    const r = say("vocês fazem festa?").reply!;
    expect(r).toContain("https://wa.me/5547000000000");
    expect(r).not.toContain("Digite");
    const b = say("quero fechar a festa");
    expect(b.state.leadStatus).toBe("none");
  });

  it("perguntas do parque funcionam igual", () => {
    expect(chat(INSTAGRAM)("Que horas vocês abrem?").intent).toBe("HORARIO_FUNCIONAMENTO");
  });
});

describe("outros", () => {
  it("saudação e agradecimento", () => {
    const say = chat();
    expect(say("oi").reply).toContain("Que alegria");
    expect(say("obrigada!").reply).toContain("Imagina");
  });

  it("oi + pergunta: responde a pergunta com um oi na frente", () => {
    expect(chat()("Oi! Tem pix?").reply).toMatch(/^Oi! Aceitamos/);
  });

  it("foto ou áudio: pede para escrever", () => {
    expect(chat()("[o cliente enviou um áudio]").reply).toContain("só mensagens de texto");
  });

  it("pergunta se é robô: resposta honesta", () => {
    expect(chat()("você é um robô?").reply).toContain("assistente virtual");
  });

  it("pedir uma pessoa avisa a equipe", () => {
    expect(chat()("quero falar com um atendente").needsHuman).toBe(true);
  });

  it("as respostas usam os valores do parkConfig", () => {
    const r = chat()("quanto custa para brincar no parque?").reply!;
    expect(r).toContain("R$ 80,00");
    expect(r).not.toContain("{{");
  });

  it("conversa nova depois de muito tempo esquece o contexto", () => {
    const first = handleMessage("quanto custa?", null, WHATSAPP);
    const later = handleMessage("E eu?", first.state, { ...WHATSAPP, newSession: true });
    expect(later.intent).not.toBe("ADULTO_BRINCAR");
  });
});

/** Casos encontrados na auditoria com frases de clientes (docs/auditoria-chatbot.md). */
describe("auditoria: regressões", () => {
  it("preço perguntado no meio da coleta da festa fala dos pacotes, sem R$ 80", () => {
    const say = chat();
    say("quero reservar uma festa");
    const r = say("quanto custa?");
    expect(r.intent).toBe("PACOTES_FESTA");
    expect(r.reply).not.toContain("R$");
    expect(r.reply).toContain("E voltando para a festa");
  });

  it("data junto com pergunta: guarda a data e responde", () => {
    const say = chat();
    say("quero reservar uma festa");
    const r = say("dia 10/12, quanto fica?");
    expect(r.state.lead.date).toBe("dia 10/12");
    expect(r.reply).toContain("pacotes");
    expect(r.reply).toContain("convidados");
  });

  it('no passo do nome, "ok", "obrigada" ou uma pergunta não viram nome', () => {
    const say = chat();
    say("quero fechar uma festa");
    for (const t of ["10/10", "20", "14h", "3 anos", "lounge", "dinossauro"]) say(t);
    expect(say("ok").leadComplete).toBeNull();
    expect(say("quanto custa a festa").leadComplete).toBeNull(); // responde a pergunta e pergunta o nome de novo
    expect(say("pode me chamar de Ju").leadComplete?.name).toBe("Ju");
  });

  it('"quero" depois da oferta de ajuda começa a coleta', () => {
    const say = chat();
    say("vocês fazem festa?");
    say("1");
    expect(say("quero sim").state.leadStatus).toBe("collecting");
  });

  it("assunto festa não prende quem pergunta do parque", () => {
    const say = chat();
    say("vcs fazem festa?");
    expect(say("e quanto custa pra brincar no parque?").intent).toBe("PRECO_PARQUE");
  });

  it("aniversário do filho visitando o parque não é festa", () => {
    expect(chat()("hoje é aniversario do meu filho, ele ganha algo?").intent).toBe("ANIVERSARIANTE");
  });

  it('"adulto paga?" não responde "Com certeza!"', () => {
    const r = chat()("adulto paga?");
    expect(r.intent).toBe("ADULTO_PAGA");
    expect(r.reply).not.toContain("Com certeza");
    expect(chat()("quanto custa pra adulto?").reply).not.toContain("R$");
  });

  it("palavras comuns não são 'corrigidas' para outra coisa", () => {
    expect(chat()("fica perto do shopping?").intent).toBe("INFO_INDISPONIVEL");
    expect(chat()("Não entendi").intent).not.toBe("AGRADECIMENTO");
  });

  it("regra de festa quando a mensagem fala de festa", () => {
    expect(chat()("na festa bebe paga?").intent).toBe("POLITICAS_FESTA");
    const say = chat();
    say("quero fechar uma festa");
    expect(say("bebe paga?").intent).toBe("POLITICAS_FESTA");
  });

  it("duas perguntas na mesma mensagem: responde as duas", () => {
    const r = chat()("qual o horario e o valor?");
    expect(r.reply).toContain("terça a sexta");
    expect(r.reply).toContain("R$ 80");
    const r2 = chat()("quanto custa e onde fica?");
    expect(r2.reply).toContain("R$ 80");
    expect(r2.reply).toContain("Rua Chile");
  });

  it("idade e convidados por extenso", () => {
    const say = chat();
    say("quero fechar uma festa");
    say("10/10");
    expect(say("trinta").state.lead.guests).toBe(30);
    say("15h");
    expect(say("um aninho").state.lead.birthdayAge).toBe("1 ano");
  });

  it('"Quanto custa?" → "e no fds?" repete o valor', () => {
    const say = chat();
    say("qnto custa");
    expect(say("e no fds?").intent).toBe("PRECO_PARQUE");
  });
});

describe("auditoria: segunda rodada", () => {
  it('"não quero festa, só brincar" volta para o parque', () => {
    const say = chat();
    say("quero fazer uma festa");
    const r = say("nao quero festa, so ir brincar");
    expect(r.intent).toBe("COMO_FUNCIONA");
    expect(r.state.leadStatus).toBe("none");
    expect(r.state.topic).not.toBe("festa");
  });

  it('"aniversariante paga?" não começa com "É claro que sim!"', () => {
    const r = chat()("aniversariante paga?");
    expect(r.intent).toBe("ANIVERSARIANTE");
    expect(r.reply).not.toContain("É claro que sim");
  });

  it("depois do menu da festa, \"quero fechar\" e \"quero fazer dia 20\" começam a coleta", () => {
    let say = chat();
    say("quero fazer uma festa");
    expect(say("quero fechar").state.leadStatus).toBe("collecting");
    say = chat();
    say("quero fazer uma festa");
    const r = say("quero fazer dia 20");
    expect(r.state.leadStatus).toBe("collecting");
    expect(r.state.lead.date).toBe("dia 20");
  });

  it('no passo dos convidados, "quero falar com uma pessoa" não vira 1 convidado', () => {
    const say = chat();
    say("quero reservar festa");
    say("dia 20");
    const r = say("quero falar com uma pessoa");
    expect(r.state.lead.guests).toBeUndefined();
    expect(r.needsHuman).toBe(true);
  });

  it("com assunto festa, \"e criança paga?\" é a regra da festa", () => {
    const say = chat();
    say("quero fazer uma festa");
    const r = say("e criança paga?");
    expect(r.intent).toBe("POLITICAS_FESTA");
    expect(r.reply).not.toContain("R$ 80");
  });

  it("capacidade do lounge vem do parkConfig; a do Salão VIP vai para a equipe", () => {
    expect(chat()("qual a capacidade do lounge?").reply).toContain("25 pessoas");
    expect(chat()("quantas pessoas cabe no salao vip?").needsHuman).toBe(true);
  });

  it('"e pra adulto?" sem contexto não repete a mesma frase', () => {
    const r = chat()("e pra adulto?");
    expect((r.reply ?? "").match(/abaixo de 5 anos/g)?.length ?? 0).toBeLessThanOrEqual(1);
  });

  it('"quero falar com a organizadora de festas" chama a equipe', () => {
    const r = chat()("quero falar com a organizadora de festas");
    expect(r.intent).toBe("FALAR_COM_HUMANO");
    expect(r.needsHuman).toBe(true);
  });
});

describe("cardápio, estacionamento e feriados", () => {
  it("prato específico: o cardápio completo fica no parque", () => {
    const r = chat()("tem pastel?");
    expect(r.intent).toBe("CARDAPIO");
    expect(r.reply).toContain("quando chegarem");
    expect(r.needsHuman).toBe(false);
  });

  it("estacionamento: não tem", () => {
    const r = chat()("tem estacionamento?");
    expect(r.reply).toContain("Não temos estacionamento");
    expect(r.needsHuman).toBe(false);
  });

  const feriados = [
    { data: "2026-10-12", nome: "Dia das Crianças", horario: "das 10h às 22h" },
    { data: "2026-11-02", nome: "Finados", horario: "fechado" },
  ];
  const comFeriados = { ...WHATSAPP, holidays: feriados };

  it("feriado cadastrado: responde o horário combinado", () => {
    expect(chat(comFeriados)("abre dia 12 de outubro?").reply).toBe("No dia 12/10 (Dia das Crianças), vamos abrir das 10h às 22h.");
    expect(chat(comFeriados)("vcs abrem em finados?").reply).toContain("fechado");
    expect(chat(comFeriados)("abre no feriado?").reply).toContain("Nos próximos feriados");
  });

  it("feriado sem cadastro continua indo para a equipe", () => {
    expect(chat(comFeriados)("abre no natal?").needsHuman).toBe(true);
    expect(chat()("abre no feriado?").needsHuman).toBe(true);
  });
});
