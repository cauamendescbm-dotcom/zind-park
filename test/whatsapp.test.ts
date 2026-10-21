import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { parseWhatsAppStatuses, parseWhatsAppWebhook, verifyMetaSignature, WhatsAppClient } from "../src/channels/whatsapp.js";

const payload = {
  object: "whatsapp_business_account",
  entry: [
    {
      changes: [
        {
          value: {
            contacts: [{ wa_id: "5541999990000", profile: { name: "Maria" } }],
            messages: [
              { from: "5541999990000", id: "wamid.1", timestamp: "1700000000", type: "text", text: { body: "Oi" } },
              { from: "5541999990000", id: "wamid.2", timestamp: "1700000001", type: "audio", audio: {} },
            ],
          },
        },
      ],
    },
  ],
};

describe("parseWhatsAppWebhook", () => {
  it("extrai texto e marca anexos", () => {
    const msgs = parseWhatsAppWebhook(payload);
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toMatchObject({ from: "5541999990000", name: "Maria", text: "Oi", externalId: "wamid.1" });
    expect(msgs[1].text).toBe("[o cliente enviou um áudio]");
  });

  it("usa a legenda da foto e ignora reações", () => {
    const msgs = parseWhatsAppWebhook({
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  { from: "55", id: "w1", timestamp: "1", type: "image", image: { id: "img", caption: " quanto custa esse? " } },
                  { from: "55", id: "w2", timestamp: "2", type: "reaction", reaction: { message_id: "x", emoji: "👍" } },
                  { from: "55", id: "w3", timestamp: "3", type: "image", image: { id: "img2" } },
                ],
              },
            },
          ],
        },
      ],
    });
    expect(msgs.map((m) => m.text)).toEqual(["quanto custa esse?", "[o cliente enviou uma imagem]"]);
  });

  it("ignora webhooks de status", () => {
    expect(parseWhatsAppWebhook({ entry: [{ changes: [{ value: { statuses: [{}] } }] }] })).toEqual([]);
  });
});

describe("parseWhatsAppStatuses", () => {
  it("explica por que a mensagem não foi entregue", () => {
    const [st] = parseWhatsAppStatuses({
      entry: [{ changes: [{ value: { statuses: [{ id: "w", status: "failed", timestamp: "1", recipient_id: "55", errors: [{ code: 131047 }] }] } }] }],
    });
    expect(st).toMatchObject({ externalId: "w", status: "failed", to: "55" });
    expect(st.error).toMatch(/24h/);
  });
});

describe("verifyMetaSignature", () => {
  it("aceita assinatura certa e recusa errada", () => {
    const body = JSON.stringify(payload);
    const sig = "sha256=" + createHmac("sha256", "segredo").update(body).digest("hex");
    expect(verifyMetaSignature(body, sig, "segredo")).toBe(true);
    expect(verifyMetaSignature(body, sig, "outro")).toBe(false);
    expect(verifyMetaSignature(body, undefined, "segredo")).toBe(false);
  });
});

describe("WhatsAppClient", () => {
  it("manda texto e indicador de digitando no formato da Cloud API", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ messages: [{ id: "wamid.out" }] })));
    const wa = new WhatsAppClient({ token: "t", phoneNumberId: "123", apiVersion: "v23.0", fetchFn });
    expect(await wa.sendText("5541", "Olá")).toBe("wamid.out");
    await wa.showTyping("5541", "wamid.1");
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://graph.facebook.com/v23.0/123/messages");
    expect(JSON.parse(init.body as string)).toMatchObject({ messaging_product: "whatsapp", to: "5541", type: "text" });
    const typing = JSON.parse((fetchFn.mock.calls[1] as unknown as [string, RequestInit])[1].body as string);
    expect(typing).toMatchObject({ status: "read", message_id: "wamid.1", typing_indicator: { type: "text" } });
  });
});
