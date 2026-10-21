import { randomInt } from "node:crypto";
import type { WhatsAppConnection } from "../store/types.js";

/**
 * Cadastro incorporado (Embedded Signup) da Meta: o jeito oficial de o cliente ligar o WhatsApp
 * dele no robô. A página /conectar abre a janela da Meta; quando o cliente termina, a página manda
 * para cá o `code` e os ids do número, e aqui o servidor:
 *   1. troca o `code` pelo token do negócio do cliente;
 *   2. inscreve o app do Zind na conta do WhatsApp dele (para os webhooks chegarem aqui);
 *   3. registra o número na Cloud API (menos no modo coexistência, em que o número segue no app).
 */
export interface SignupOptions {
  appId: string;
  appSecret: string;
  apiVersion: string;
  /** Padrão: https://graph.facebook.com (troque só em testes locais). */
  apiBase?: string;
  fetchFn?: typeof fetch;
}

export interface SignupInput {
  code: string;
  wabaId: string;
  /** Pode vir vazio no modo coexistência: aí pegamos o primeiro número da conta. */
  phoneNumberId?: string | null;
  coexistence: boolean;
  /** PIN para registrar o número (6 dígitos). Vazio = sorteia um. */
  pin?: string | null;
}

export async function finishSignup(input: SignupInput, opts: SignupOptions): Promise<WhatsAppConnection> {
  const fetchFn = opts.fetchFn ?? fetch;
  const base = `${opts.apiBase ?? "https://graph.facebook.com"}/${opts.apiVersion}`;

  const call = async (path: string, init: { method?: string; token?: string; body?: unknown } = {}) => {
    const res = await fetchFn(`${base}${path}`, {
      method: init.method ?? "GET",
      headers: {
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Meta ${res.status} em ${path.split("?")[0]}: ${JSON.stringify(json?.error?.message ?? json)}`);
    return json;
  };

  const q = new URLSearchParams({ client_id: opts.appId, client_secret: opts.appSecret, code: input.code });
  const { access_token: token } = await call(`/oauth/access_token?${q}`);
  if (!token) throw new Error("a Meta não devolveu o token");

  await call(`/${input.wabaId}/subscribed_apps`, { method: "POST", token });

  let phoneNumberId = input.phoneNumberId || null;
  if (!phoneNumberId) {
    const list = await call(`/${input.wabaId}/phone_numbers?fields=id`, { token });
    phoneNumberId = list?.data?.[0]?.id ?? null;
    if (!phoneNumberId) throw new Error("a conta do WhatsApp não tem número");
  }

  let pin: string | null = null;
  if (!input.coexistence) {
    pin = input.pin && /^\d{6}$/.test(input.pin) ? input.pin : String(randomInt(0, 1e6)).padStart(6, "0");
    await call(`/${phoneNumberId}/register`, { method: "POST", token, body: { messaging_product: "whatsapp", pin } });
  }

  const info = await call(`/${phoneNumberId}?fields=display_phone_number,verified_name`, { token }).catch(() => ({}));

  return {
    phoneNumberId,
    wabaId: input.wabaId,
    token,
    displayPhone: info?.display_phone_number ?? null,
    verifiedName: info?.verified_name ?? null,
    coexistence: input.coexistence,
    pin,
    connectedAt: new Date(),
  };
}
