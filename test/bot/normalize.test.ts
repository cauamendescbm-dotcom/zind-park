import { describe, expect, it } from "vitest";
import { allIntents, IntentClassifier } from "../../src/bot/index.js";
import { normalizeText } from "../../src/bot/utils/normalizeText.js";
import { isCloseWord, levenshtein } from "../../src/bot/utils/similarity.js";

describe("normalizeText", () => {
  it("exemplo da especificação", () => {
    expect(normalizeText("Meu filho é autista, tem desconto?")).toBe("meu filho e autista tem desconto");
  });

  it("acentos, pontuação, maiúsculas e letras repetidas", () => {
    expect(normalizeText("Olá!!! Que HORAS abrem???")).toBe("ola que hora abrem");
    expect(normalizeText("oiiiii")).toBe("oi");
  });

  it("variações de aniversário viram a mesma palavra", () => {
    for (const v of ["aniversário", "aniversario", "niver", "aniv", "aniver"]) expect(normalizeText(v)).toBe("aniversario");
    expect(normalizeText("festa de aniversário")).toBe("festa de aniversario");
  });

  it("abreviações e plural", () => {
    expect(normalizeText("vc sabe q horas abre hj?")).toBe("voce sabe que hora abre hoje");
    expect(normalizeText("festas")).toBe("festa");
    expect(normalizeText("valores")).toBe("valor");
    expect(normalizeText("pacotes")).toBe("pacote");
  });

  it("não estraga números (datas, telefones, convidados)", () => {
    expect(normalizeText("1000 pessoas dia 15/11")).toBe("1000 pessoa dia 15/11");
  });
});

describe("erros de digitação", () => {
  const classifier = new IntentClassifier(allIntents);
  it("corrige pela palavra mais próxima do vocabulário", () => {
    expect(classifier.prepare("qual o horaio").tokens).toContain("horario");
    expect(classifier.prepare("endereso").tokens).toContain("endereco");
    expect(classifier.prepare("antiderapante").tokens).toContain("antiderrapante");
  });
  it("não troca palavras curtas (mesa não vira meia)", () => {
    expect(classifier.prepare("mesa").tokens).toEqual(["mesa"]);
  });
  it("levenshtein", () => {
    expect(levenshtein("festa", "fseta")).toBe(2);
    expect(isCloseWord("autsta", "autista")).toBe(true);
    expect(isCloseWord("meia", "mesa")).toBe(false);
  });
});
