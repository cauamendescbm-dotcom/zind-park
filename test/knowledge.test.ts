import { describe, expect, it } from "vitest";
import { loadKnowledge } from "../src/agent/knowledge.js";

describe("loadKnowledge", () => {
  it("carrega a pasta knowledge do repositório", () => {
    const k = loadKnowledge("knowledge");
    // Pacotes do PDF oficial, que não traz valores: o orçamento fica com a organizadora.
    expect(k.packages.map((p) => p.id)).toEqual(["after_school", "classic", "experience"]);
    expect(k.packages.every((p) => p.price === null)).toBe(true);
    expect(k.text).toContain('<arquivo nome="respostas-oficiais">');
    expect(k.text).toContain("Rua Chile, 85");
    expect(k.text).toContain("NÃO informe valor");
    expect(k.text).not.toMatch(/R\$\s?\d.*convidados/);
    expect(k.text).not.toContain("README");
    expect(k.missingCount).toBe(0);
  });
});
