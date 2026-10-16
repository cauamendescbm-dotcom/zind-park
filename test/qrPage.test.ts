import { describe, expect, it } from "vitest";
import { instagramQrLink, renderQrPage, whatsappQrLink } from "../src/qrPage.js";

describe("página de QR Codes", () => {
  it("monta o link do WhatsApp com a mensagem pronta", () => {
    expect(whatsappQrLink("https://wa.me/5547999998888", "Oi!")).toBe("https://wa.me/5547999998888?text=Oi%21");
    expect(whatsappQrLink("(47) 99999-8888", "")).toBe("https://wa.me/5547999998888");
    expect(whatsappQrLink("5547999998888", "")).toBe("https://wa.me/5547999998888");
  });

  it("ignora o WhatsApp ainda não preenchido", () => {
    expect(whatsappQrLink("[PREENCHER link do WhatsApp do Zind]", "Oi")).toBeNull();
    expect(whatsappQrLink("https://wa.me/55DDDNUMERO", "Oi")).toBeNull();
    expect(whatsappQrLink(undefined, "Oi")).toBeNull();
  });

  it("o Instagram abre direto no Direct", () => {
    expect(instagramQrLink("@zind.park")).toBe("https://ig.me/m/zind.park");
    expect(instagramQrLink("https://www.instagram.com/zind_bc/")).toBe("https://ig.me/m/zind_bc");
    expect(instagramQrLink(undefined)).toBeNull();
  });

  it("mostra os dois QR Codes, WhatsApp em cima", async () => {
    const html = await renderQrPage({ name: "Zind", whatsapp: "https://wa.me/5547999998888", instagram: "https://ig.me/m/zind" });
    expect(html.match(/<svg/g)).toHaveLength(2);
    expect(html.indexOf("WhatsApp")).toBeLessThan(html.indexOf("Instagram"));
    expect(html).toContain('href="https://ig.me/m/zind"');
  });

  it("avisa o que falta quando um link não foi configurado", async () => {
    const html = await renderQrPage({ name: "Zind", whatsapp: null, instagram: null });
    expect(html).not.toContain("<svg");
    expect(html).toContain("ZIND_INSTAGRAM_LINK");
  });
});
