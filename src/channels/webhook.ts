import type { Channel } from "../store/types.js";

/** O campo "object" do webhook diz de qual produto da Meta ele veio. */
export function channelOfWebhook(body: unknown): Channel | null {
  const object = (body as { object?: string } | null)?.object;
  if (object === "whatsapp_business_account") return "whatsapp";
  if (object === "instagram" || object === "page") return "instagram";
  return null;
}
