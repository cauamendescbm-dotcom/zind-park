import { describe, expect, it, vi } from "vitest";
import { InstagramClient } from "../src/channels/instagram.js";
import { describeMetaError, fetchWithRetry } from "../src/channels/metaApi.js";
import { WhatsAppClient } from "../src/channels/whatsapp.js";

const ok = () => new Response(JSON.stringify({ messages: [{ id: "wamid.out" }], message_id: "mid.out" }));
const status = (code: number, body: unknown = {}) => new Response(JSON.stringify(body), { status: code });
const noSleep = { sleep: async () => {} };

describe("fetchWithRetry", () => {
  it("tenta de novo quando a Meta oscila (503, 429, sem conexão)", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(status(503))
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(ok());
    const res = await fetchWithRetry(fetchFn, "u", {}, noSleep);
    expect(res.ok).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("não insiste em erro que não melhora (token, 24h) nem em 500, que pode ter enviado", async () => {
    for (const code of [400, 401, 500]) {
      const fetchFn = vi.fn().mockResolvedValue(status(code));
      const res = await fetchWithRetry(fetchFn, "u", {}, noSleep);
      expect(res.status).toBe(code);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    }
  });

  it("desiste depois de 3 tentativas", async () => {
    const sleeps: number[] = [];
    const fetchFn = vi.fn().mockResolvedValue(status(429));
    const res = await fetchWithRetry(fetchFn, "u", {}, { sleep: async (ms) => void sleeps.push(ms) });
    expect(res.status).toBe(429);
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(sleeps).toEqual([1000, 3000]);
  });
});

describe("describeMetaError", () => {
  it("explica os erros comuns em português", () => {
    expect(describeMetaError({ code: 190, message: "Error validating access token" })).toMatch(/token vencido/);
    expect(describeMetaError({ code: 131047 })).toMatch(/24h/);
    expect(describeMetaError({ code: 10, error_subcode: 2018278 })).toMatch(/24h.*Instagram/);
    expect(describeMetaError({ code: 999, message: "algo novo" })).toBe("código 999: algo novo");
    expect(describeMetaError(undefined)).toBeNull();
  });
});

describe("clientes da Meta", () => {
  it("WhatsApp: reenvia depois de um 503 e o erro final diz o que fazer", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(status(503)).mockResolvedValueOnce(ok());
    const wa = new WhatsAppClient({ token: "t", phoneNumberId: "1", apiVersion: "v23.0", fetchFn, retry: noSleep });
    expect(await wa.sendText("55", "oi")).toBe("wamid.out");

    const expired = vi.fn().mockResolvedValue(status(401, { error: { code: 190, message: "Session has expired" } }));
    const wa2 = new WhatsAppClient({ token: "t", phoneNumberId: "1", apiVersion: "v23.0", fetchFn: expired, retry: noSleep });
    await expect(wa2.sendText("55", "oi")).rejects.toThrow(/token vencido/);
  });

  it("Instagram: reenvia depois de um 429", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(status(429)).mockResolvedValueOnce(ok());
    const ig = new InstagramClient({ pageId: "P", pageToken: "t", apiVersion: "v23.0", apiBase: "https://graph.facebook.com", fetchFn, retry: noSleep });
    expect(await ig.sendText("u1", "oi")).toBe("mid.out");
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
