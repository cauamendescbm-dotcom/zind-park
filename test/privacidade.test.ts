import { describe, expect, it } from "vitest";
import { privacyPage } from "../src/privacidade.js";

describe("política de privacidade", () => {
  it("mostra o nome da empresa e como apagar os dados", () => {
    const html = privacyPage("Zind");
    expect(html).toContain("Política de Privacidade - Zind");
    expect(html).toContain("quero apagar meus dados");
    expect(html).toContain("SAIR");
  });

  it("escapa o nome da empresa", () => {
    expect(privacyPage("<b>X</b>")).not.toContain("<b>X</b>");
  });
});
