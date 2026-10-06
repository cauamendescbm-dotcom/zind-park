import { describe, expect, it } from "vitest";
import { loadKnowledge } from "../src/agent/knowledge.js";

describe("loadKnowledge", () => {
  it("carrega a pasta knowledge do repositório", () => {
    const k = loadKnowledge("knowledge");
    expect(k.packages).toEqual([]); // até chegar o PDF oficial
    expect(k.text).toContain('<arquivo nome="respostas-oficiais">');
    expect(k.text).toContain("Rua Chile, 85");
    expect(k.text).toContain("NÃO informe valores de festa");
    expect(k.text).not.toContain("README");
    expect(k.missingCount).toBe(0);
  });
});
