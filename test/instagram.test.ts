import { describe, expect, it, vi } from "vitest";
import { InstagramClient, parseInstagramWebhook } from "../src/channels/instagram.js";

const webhook = (messaging: any[]) => ({ object: "instagram", entry: [{ id: "IGBIZ", messaging }] });

describe("parseInstagramWebhook", () => {
  it("lê DMs e ignora echo e a própria conta", () => {
    const msgs = parseInstagramWebhook(
      webhook([
        { sender: { id: "u1" }, recipient: { id: "IGBIZ" }, timestamp: 1700000000000, message: { mid: "m1", text: "Oi!" } },
        { sender: { id: "IGBIZ" }, recipient: { id: "u1" }, timestamp: 1, message: { mid: "m2", text: "eco", is_echo: true } },
        { sender: { id: "IGBIZ" }, recipient: { id: "u1" }, timestamp: 1, message: { mid: "m3", text: "x" } },
      ]),
      "IGBIZ",
    );
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({ channel: "instagram", from: "u1", text: "Oi!", externalId: "m1" });
  });

  it("marca resposta de story e anexos", () => {
    const msgs = parseInstagramWebhook(
      webhook([
        { sender: { id: "u1" }, timestamp: 1, message: { mid: "a", text: "que lindo", reply_to: { story: { id: "s" } } } },
        { sender: { id: "u2" }, timestamp: 1, message: { mid: "b", attachments: [{ type: "audio" }] } },
      ]),
    );
    expect(msgs[0].text).toBe("[respondendo a um story do Zind] que lindo");
    expect(msgs[1].text).toBe("[o cliente enviou um áudio]");
  });

  it("ignora webhooks que não são do Instagram", () => {
    expect(parseInstagramWebhook({ object: "page", entry: [] })).toEqual([]);
  });
});

describe("InstagramClient", () => {
  it("manda digitando, texto e foto pela API da Meta", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ message_id: "mid.out" })));
    const ig = new InstagramClient({ pageId: "PAGE", pageToken: "t", apiVersion: "v23.0", apiBase: "https://graph.facebook.com", fetchFn });
    await ig.showTyping("u1");
    expect(await ig.sendText("u1", "Oi")).toBe("mid.out");
    await ig.sendImage("u1", "https://x/promo.jpg");
    const bodies = fetchFn.mock.calls.map((c: any) => JSON.parse(c[1].body));
    expect((fetchFn.mock.calls[0] as any)[0]).toBe("https://graph.facebook.com/v23.0/PAGE/messages");
    expect(bodies[0]).toEqual({ recipient: { id: "u1" }, sender_action: "mark_seen" });
    expect(bodies[1]).toEqual({ recipient: { id: "u1" }, sender_action: "typing_on" });
    expect(bodies[2]).toEqual({ recipient: { id: "u1" }, message: { text: "Oi" } });
    expect(bodies[3].message.attachment).toEqual({ type: "image", payload: { url: "https://x/promo.jpg" } });
  });
});
