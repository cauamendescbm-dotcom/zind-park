import { describe, expect, it, vi } from "vitest";
import { finishSignup } from "../src/channels/embeddedSignup.js";
import { onlyForPhoneNumber, parseWhatsAppWebhook } from "../src/channels/whatsapp.js";
import { keyMatches, renderConnectPage } from "../src/connectPage.js";
import { MemoryStore } from "../src/store/memory.js";

const opts = { appId: "app1", appSecret: "segredo", apiVersion: "v23.0" };

/** Meta falsa: responde por caminho e guarda as chamadas. */
function fakeMeta(routes: Record<string, unknown>) {
  return vi.fn(async (url: string | URL | Request, _init?: RequestInit) => {
    const path = new URL(String(url)).pathname.replace("/v23.0", "");
    if (!(path in routes)) return new Response(JSON.stringify({ error: { message: "não existe" } }), { status: 404 });
    return new Response(JSON.stringify(routes[path]));
  });
}
const calls = (f: ReturnType<typeof fakeMeta>) =>
  f.mock.calls.map(([url, init]) => `${init?.method ?? "GET"} ${new URL(String(url)).pathname.replace("/v23.0", "")}`);

describe("finishSignup", () => {
  it("número novo: troca o code, inscreve o app e registra o número", async () => {
    const fetchFn = fakeMeta({
      "/oauth/access_token": { access_token: "tok-cliente" },
      "/waba1/subscribed_apps": { success: true },
      "/pn1/register": { success: true },
      "/pn1": { display_phone_number: "+55 41 99999-0000", verified_name: "Zind" },
    });
    const conn = await finishSignup({ code: "c1", wabaId: "waba1", phoneNumberId: "pn1", coexistence: false, pin: "123456" }, { ...opts, fetchFn });
    expect(calls(fetchFn)).toEqual(["GET /oauth/access_token", "POST /waba1/subscribed_apps", "POST /pn1/register", "GET /pn1"]);
    expect(String(fetchFn.mock.calls[0][0])).toContain("client_id=app1&client_secret=segredo&code=c1");
    const reg = fetchFn.mock.calls[2][1]!;
    expect((reg.headers as Record<string, string>).Authorization).toBe("Bearer tok-cliente");
    expect(JSON.parse(reg.body as string)).toEqual({ messaging_product: "whatsapp", pin: "123456" });
    expect(conn).toMatchObject({ phoneNumberId: "pn1", wabaId: "waba1", token: "tok-cliente", displayPhone: "+55 41 99999-0000", coexistence: false, pin: "123456" });
  });

  it("número no app (QR Code): não registra e acha o número pela conta", async () => {
    const fetchFn = fakeMeta({
      "/oauth/access_token": { access_token: "tok" },
      "/waba1/subscribed_apps": { success: true },
      "/waba1/phone_numbers": { data: [{ id: "pn9" }] },
      "/pn9": { display_phone_number: "+55 41 98888-0000" },
    });
    const conn = await finishSignup({ code: "c", wabaId: "waba1", coexistence: true }, { ...opts, fetchFn });
    expect(calls(fetchFn)).not.toContain("POST /pn9/register");
    expect(conn).toMatchObject({ phoneNumberId: "pn9", coexistence: true, pin: null });
  });

  it("sorteia um PIN de 6 dígitos quando não vem um", async () => {
    const fetchFn = fakeMeta({ "/oauth/access_token": { access_token: "t" }, "/w/subscribed_apps": {}, "/p/register": {}, "/p": {} });
    const conn = await finishSignup({ code: "c", wabaId: "w", phoneNumberId: "p", coexistence: false }, { ...opts, fetchFn });
    expect(conn.pin).toMatch(/^\d{6}$/);
  });

  it("para e avisa quando a Meta recusa", async () => {
    const fetchFn = fakeMeta({});
    await expect(finishSignup({ code: "c", wabaId: "w", phoneNumberId: "p", coexistence: false }, { ...opts, fetchFn })).rejects.toThrow(/Meta 404/);
  });
});

describe("onlyForPhoneNumber", () => {
  it("ignora mensagens que chegaram para outro número", () => {
    const change = (id: string, msgId: string) => ({
      value: { metadata: { phone_number_id: id }, messages: [{ from: "5541", id: msgId, timestamp: "1700000000", type: "text", text: { body: "oi" } }] },
    });
    const body = { object: "whatsapp_business_account", entry: [{ changes: [change("pn1", "a"), change("teste", "b")] }] };
    expect(parseWhatsAppWebhook(onlyForPhoneNumber(body, "pn1")).map((m) => m.externalId)).toEqual(["a"]);
  });
});

describe("página /conectar", () => {
  it("só abre com a chave certa", () => {
    expect(keyMatches("abc", "abc")).toBe(true);
    expect(keyMatches("abd", "abc")).toBe(false);
    expect(keyMatches(undefined, "abc")).toBe(false);
    expect(keyMatches("abc", undefined)).toBe(false);
  });

  it("monta o botão oficial da Meta com o app e a configuração", () => {
    const html = renderConnectPage({ appId: "app1", configId: "cfg1", apiVersion: "v23.0", key: "k", agentName: "Ju", connected: { displayPhone: "+55 41 9", verifiedName: "<Zind>" } });
    expect(html).toContain('"configId":"cfg1"');
    expect(html).toContain("whatsapp_business_app_onboarding");
    expect(html).toContain("connect.facebook.net");
    expect(html).toContain("&lt;Zind&gt;");
    expect(html).not.toContain("<Zind>");
    expect(html).toContain("Como funciona");
    expect(html).toContain("O que o robô faz");
  });
});

describe("MemoryStore", () => {
  it("guarda o número conectado", async () => {
    const store = new MemoryStore();
    expect(await store.getWhatsAppConnection()).toBeNull();
    const conn = { phoneNumberId: "p", wabaId: "w", token: "t", displayPhone: null, verifiedName: null, coexistence: true, pin: null, connectedAt: new Date() };
    await store.saveWhatsAppConnection(conn);
    expect(await store.getWhatsAppConnection()).toEqual(conn);
  });
});
