import { describe, expect, it } from "vitest";
import { allIntents, IntentClassifier, type IntentId } from "../../src/bot/index.js";

const classifier = new IntentClassifier(allIntents);

/** Pelo menos 5 jeitos diferentes de perguntar cada coisa (seção 32). */
const CASES: Record<IntentId, string[]> = {
  SAUDACAO: ["oi", "Olá!", "bom dia", "Boa tarde, tudo bem?", "oiiii", "boa noite!"],
  COMO_FUNCIONA: [
    "Como funciona?",
    "como funciona o parque?",
    "Como é o parque?",
    "quero conhecer",
    "Posso chegar e brincar?",
    "me explica como funciona aí",
    "como funciona a entrada?",
  ],
  HORARIO_FUNCIONAMENTO: [
    "Que horas vocês abrem?",
    "Que horas abre?",
    "qual o horário de funcionamento?",
    "vocês abrem segunda?",
    "até que horas fica aberto?",
    "abre domingo?",
    "qual o horaio de vcs",
    "fecha que horas?",
  ],
  LOCALIZACAO: ["Como chego aí?", "qual o endereço?", "onde fica a Zind?", "me manda a localização", "fica em qual bairro?", "qual o endereso"],
  RESERVA_PARQUE: [
    "Posso ir sem reservar?",
    "quanto tempo pode ficar?",
    "tem limite de tempo?",
    "vcs vendem ingresso pela internet?",
    "precisa reservar?",
    "tem que comprar ingresso antes?",
    "posso chegar direto?",
    "precisa agendar?",
    "dá pra comprar antecipado?",
  ],
  PRECO_PARQUE: ["Quanto custa?", "qual o valor da hora?", "quanto é o ingresso?", "qual o preço do parque?", "quanto fica uma hora aí?", "valores"],
  IDADE_PAGAMENTO: [
    "Meu filho tem 4 anos, ele paga?",
    "nenê de colo entra de graça?",
    "criança de 2 anos paga?",
    "bebê paga?",
    "qual idade paga?",
    "minha filha de 3 anos paga?",
    "E criança de 4 anos?",
  ],
  ADULTO_BRINCAR: [
    "adulto pode brincar?",
    "eu posso brincar junto com meu filho?",
    "mãe pode brincar?",
    "pai pode brincar também?",
    "tem brinquedo para adulto?",
  ],
  ADULTO_PAGA: [
    "adulto paga?",
    "o acompanhante paga?",
    "adulto paga para brincar?",
    "quanto custa pra adulto?",
    "qual o valor do adulto?",
    "mãe paga?",
  ],
  PAGAMENTO: ["Tem Pix?", "aceita cartão de crédito?", "quais as formas de pagamento?", "posso pagar no débito?", "aceitam dinheiro?", "dá pra parcelar?"],
  MEIA_ANTIDERRAPANTE: [
    "Precisa usar meia?",
    "esqueci minha meia",
    "vocês vendem meia?",
    "é obrigatório meia antiderrapante?",
    "quanto custa a meia?",
    "pode brincar de tênis?",
  ],
  DESCONTO_PCD_AUTISMO: [
    "Autista paga meia?",
    "Meu filho tem TEA, tem desconto?",
    "tem desconto para pcd?",
    "meu filho é autista",
    "quanto paga um autista?",
    "preciso levar laudo?",
    "meu filho é autsta",
  ],
  ANIVERSARIANTE: [
    "Hoje é meu aniversário",
    "hoje é aniversario do meu filho, ele ganha algo?",
    "aniversariante paga?",
    "meu filho faz aniversário hoje, tem desconto?",
    "aniversariante ganha alguma coisa?",
    "sou aniversariante do dia",
    "é meu niver hoje!",
  ],
  ALIMENTACAO: ["Tem comida aí?", "vocês têm restaurante?", "tem cafeteria no parque?", "vende bebida?", "tem onde comer?", "tem lanche aí?"],
  COMIDA_FORA: [
    "Posso levar meu lanche?",
    "posso levar o bolo pro parabens?",
    "pode levar comida de casa?",
    "posso entrar com bebida?",
    "pode levar a mamadeira?",
    "dá para trazer lanche para as crianças?",
    "posso levar comida de fora?",
  ],
  FESTAS_EVENTOS: [
    "Vocês fazem niver?",
    "Quero comemorar o aniversário da minha filha",
    "Quero fazer o aniversário da minha filha aí",
    "vocês fazem festas?",
    "como funciona a festa de aniversário?",
    "festa infantil",
    "queria fazer um evento aí",
    "quero comemorar o niver do meu filho com vcs",
  ],
  PACOTES_FESTA: [
    "Quanto custa uma festa?",
    "quais são os pacotes?",
    "qual o valor da festa de aniversário?",
    "me manda os pacotes",
    "quero um orçamento para festa",
    "quanto fica uma festinha?",
    "qual o preço do lounge?",
  ],
  POLITICAS_FESTA: [
    "bebê paga na festa?",
    "bebê de 8 meses conta como convidado?",
    "quais as regras da festa?",
    "criança pequena precisa de adulto na festa?",
    "bebê de colo na festa paga?",
    "na festa bebe paga?",
    "crianca de 3 anos precisa de adulto na festa?",
    "na festa a mae precisa acompanhar?",
  ],
  AGRADECIMENTO: ["obrigada!", "muito obrigado", "valeu!", "ok, obrigado", "perfeito", "combinado"],
  FALAR_COM_HUMANO: [
    "quero falar com um atendente",
    "posso falar com uma pessoa?",
    "quero falar com alguém da equipe",
    "me liga por favor",
    "quero falar com a organizadora",
    "quero falar com o gerente",
  ],
  PERGUNTA_ROBO: ["vc é uma IA?", "vc é de verdade?", "você é um robô?", "isso é resposta automática?", "é um bot?", "você é humano?", "tô falando com uma pessoa?"],
  INFO_INDISPONIVEL: ["tem estacionamento?", "tem wifi aí?", "abre no feriado?", "vocês têm promoção?", "aceitam excursão de escola?", "pode levar cachorro?",
    "abre dia 12 de outubro?", "vcs abrem no natal?", "estudante paga meia?", "tem desconto pra irmaos?",
    "tem acessibilidade pra cadeirante?", "quanto é meia hora?", "sou gestante posso brincar?", "tem pacote mensal?",
    "o salao vip cabe quantas pessoas?", "fica perto do shopping?",
    "fazem chá de bebê?", "quantas pessoas cabe no salao vip?", "quanto custa 1h e meia?", "laudo precisa ser original?",
    "tem pastel?", "vende sorvete?", "aceitam ticket alimentação?"],
};

describe("IntentClassifier", () => {
  for (const [intent, phrases] of Object.entries(CASES)) {
    describe(intent, () => {
      it("tem pelo menos 5 frases de teste", () => expect(phrases.length).toBeGreaterThanOrEqual(5));
      for (const phrase of phrases) {
        it(`"${phrase}"`, () => {
          const c = classifier.classify(phrase);
          expect(c.ambiguous, JSON.stringify(c.scores.slice(0, 3))).toBe(false);
          expect(c.best?.intent, JSON.stringify(c.scores.slice(0, 3))).toBe(intent);
        });
      }
    });
  }

  it("toda intenção tem testes", () => {
    for (const i of allIntents) expect(CASES[i.id], i.id).toBeDefined();
  });

  it('"aniversário" sozinho é ambíguo: pergunta se é parque ou festa (seção 22)', () => {
    const c = classifier.classify("aniversário");
    expect(c.ambiguous).toBe(true);
    expect([c.best?.intent, c.second?.intent].sort()).toEqual(["ANIVERSARIANTE", "FESTAS_EVENTOS"]);
  });

  it("não entende o que não tem nada a ver: vai para o fallback", () => {
    for (const t of ["blablabla", "qual a capital da França?", "xyz", "kkkkk"]) {
      expect(classifier.classify(t).best, t).toBeNull();
    }
  });

  it("saudação junto com pergunta: vale a pergunta", () => {
    const c = classifier.classify("Oi, boa tarde! Que horas vocês abrem?");
    expect(c.best?.intent).toBe("HORARIO_FUNCIONAMENTO");
    expect(c.greeting).toBe(true);
  });

  it("score segue a tabela: palavra-chave +5, sinônimo +3, exemplo parecido +2", () => {
    const score = (t: string) => classifier.classify(t).scores.find((s) => s.intent === "PAGAMENTO")?.score;
    // "pix": palavra-chave (+5) e sinônimo do grupo pagamento (+3).
    expect(score("tem pix")).toBe(8);
    // "aceita pix": palavra-chave (+5), sinônimo (+3) e parecida com o exemplo "tem pix?" (+2).
    expect(score("aceita pix")).toBe(10);
  });
});
