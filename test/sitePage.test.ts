import { describe, expect, it } from "vitest";
import { parkConfig } from "../src/bot/data/parkConfig.js";
import { sitePage } from "../src/sitePage.js";

describe("site do parque", () => {
  const html = sitePage();

  it("mostra os dados da empresa que a Meta confere", () => {
    const { companyName, cnpj, phone, email, registeredAddress } = parkConfig.legal;
    for (const dado of [companyName, cnpj, phone, email, registeredAddress]) expect(html).toContain(dado);
    expect(html).toContain('href="/privacidade"');
  });

  it("usa os horários do parkConfig", () => {
    for (const h of Object.values(parkConfig.openingHours)) expect(html).toContain(h);
  });

  it("não mostra CPF nem preço", () => {
    expect(html).not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
    expect(html).not.toContain("R$");
  });
});
