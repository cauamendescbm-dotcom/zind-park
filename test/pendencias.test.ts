import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { pendenciasDeEntrega } from "../src/pendencias.js";
import { pkg } from "./helpers.js";

const pronto = {
  DATABASE_URL: "postgresql://x",
  WHATSAPP_TOKEN: "t",
  PHONE_NUMBER_ID: "1",
  APP_SECRET: "s",
  ORGANIZADORA_WHATSAPP: "5547999990000",
  ORGANIZADORA_TEMPLATE_LEAD: "novo_lead_festa",
  ORGANIZADORA_TEMPLATE_DUVIDA: "duvida_cliente",
  ZIND_WHATSAPP_LINK: "https://wa.me/5547999990000",
  ANTHROPIC_API_KEY: "k",
};
const comPacotes = { packages: [pkg("p1", "Pacote 1", null)], missingCount: 0 };

describe("o que falta no /health", () => {
  it("tudo configurado: nada faltando", () => {
    const config = loadConfig(pronto);
    expect(pendenciasDeEntrega({ config, knowledge: comPacotes, canais: ["whatsapp", "instagram"], banco: "ok" })).toEqual([]);
  });

  it("servidor recém-criado mostra cada coisa que falta, sem mostrar chave nenhuma", () => {
    const falta = pendenciasDeEntrega({
      config: loadConfig({ VERIFY_TOKEN: "segredo123" }),
      knowledge: { packages: [], missingCount: 0 },
      canais: [],
      banco: "memoria",
    }).join("\n");
    for (const nome of ["DATABASE_URL", "WhatsApp desligado", "Instagram desligado", "APP_SECRET", "ORGANIZADORA_WHATSAPP", "ZIND_WHATSAPP_LINK", "pacotes.json", "ANTHROPIC_API_KEY"]) {
      expect(falta).toContain(nome);
    }
    expect(falta).not.toContain("segredo123");
  });

  it("organizadora sem os modelos aprovados é avisada", () => {
    const config = loadConfig({ ...pronto, ORGANIZADORA_TEMPLATE_LEAD: "" });
    const falta = pendenciasDeEntrega({ config, knowledge: comPacotes, canais: ["whatsapp", "instagram"], banco: "ok" });
    expect(falta).toEqual([expect.stringContaining("últimas 24h")]);
  });
});
