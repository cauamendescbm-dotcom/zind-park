import { describe, expect, it } from "vitest";
import { loadKnowledge } from "../src/agent/knowledge.js";

describe("loadKnowledge", () => {
  it("carrega a pasta knowledge do repositório", () => {
    const k = loadKnowledge("knowledge");
    expect(k.packages.map((p) => p.id)).toEqual(["pacote_1", "pacote_2", "pacote_3"]);
    expect(k.text).toContain('<arquivo nome="parque.md">');
    expect(k.text).not.toContain("README");
    expect(k.missingCount).toBeGreaterThan(0);
  });
});
