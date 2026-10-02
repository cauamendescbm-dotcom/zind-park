import { describe, expect, it } from "vitest";
import { makeTypo, maybeAddTypo, splitIntoBubbles, typingDelayMs } from "../src/agent/humanize.js";

const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe("splitIntoBubbles", () => {
  it("separa por --- e por parágrafo", () => {
    expect(splitIntoBubbles("Oi! Tudo bem?\n---\nQue bom te ver 💛\n\nComo posso ajudar?")).toEqual([
      "Oi! Tudo bem?",
      "Que bom te ver 💛",
      "Como posso ajudar?",
    ]);
  });

  it("nunca passa de 3 linhas", () => {
    const bubbles = splitIntoBubbles("a\nb\nc\nd\ne");
    expect(bubbles).toEqual(["a\nb\nc", "d\ne"]);
    for (const b of bubbles) expect(b.split("\n").length).toBeLessThanOrEqual(3);
  });

  it("quebra texto longo por frases sem passar do limite", () => {
    const long = Array.from({ length: 12 }, (_, i) => `Esta é a frase número ${i} do texto.`).join(" ");
    const bubbles = splitIntoBubbles(long, 120);
    expect(bubbles.length).toBeGreaterThan(1);
    for (const b of bubbles) expect(b.length).toBeLessThanOrEqual(120);
    expect(bubbles.join(" ")).toBe(long);
  });
});

describe("typingDelayMs", () => {
  it("fica entre 1,5s e 7s", () => {
    expect(typingDelayMs("oi", () => 0)).toBe(1500);
    expect(typingDelayMs("x".repeat(1000), () => 1)).toBe(7000);
  });
});

describe("makeTypo", () => {
  it("troca duas letras vizinhas do meio", () => {
    expect(makeTypo("festa", () => 0)).toBe("fseta");
    expect(makeTypo("festa", () => 0.99)).toBe("fesat");
  });
});

describe("maybeAddTypo", () => {
  it("coloca o errinho e a correção no balão seguinte", () => {
    const r = maybeAddTypo(["Que alegria planejar essa festa com você"], {
      enabled: true,
      rate: 1,
      rng: seq(0, 0.99, 0),
    });
    expect(r.typo).not.toBeNull();
    expect(r.bubbles).toHaveLength(2);
    expect(r.bubbles[0].text).not.toBe(r.bubbles[0].intended);
    expect(r.bubbles[0].intended).toBe("Que alegria planejar essa festa com você");
    expect(r.bubbles[1]).toEqual({ text: `*${r.typo!.original}`, intended: "", isTypoFix: true });
  });

  it("nunca mexe em balão com preço, data, horário ou link", () => {
    for (const bubble of [
      "O pacote completo custa R$ 3.500",
      "Temos disponibilidade no dia 15/11",
      "Abrimos às 10h",
      "Compre pelo site https://zind.com",
    ]) {
      const r = maybeAddTypo([bubble], { enabled: true, rate: 1, rng: () => 0 });
      expect(r.typo).toBeNull();
      expect(r.bubbles[0].text).toBe(bubble);
    }
  });

  it("não mexe em nomes, meses e palavras protegidas", () => {
    const r = maybeAddTypo(["Combinado Mariana, sábado"], {
      enabled: true,
      rate: 1,
      rng: () => 0,
    });
    expect(r.typo).toBeNull();
  });

  it("respeita desligado e taxa zero", () => {
    expect(maybeAddTypo(["Que alegria planejar"], { enabled: false, rate: 1 }).typo).toBeNull();
    expect(maybeAddTypo(["Que alegria planejar"], { enabled: true, rate: 0 }).typo).toBeNull();
  });
});
