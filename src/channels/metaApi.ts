/**
 * Detalhes comuns das APIs da Meta (WhatsApp e Instagram): tentar de novo quando a Meta
 * oscila e explicar os erros mais comuns em português, para quem lê o log do Railway.
 */

export interface RetryOptions {
  /** Quantas vezes tentar ao todo. Padrão: 3. */
  attempts?: number;
  /** Espera entre as tentativas (trocada nos testes). */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Só tenta de novo quando a mensagem com certeza não saiu: limite de velocidade (429),
 * Meta fora do ar (502, 503, 504) ou a conexão nem chegou. Outros erros (token, número,
 * 24h...) não melhoram tentando de novo, e um 500 pode ter enviado a mensagem.
 */
const RETRY_STATUS = new Set([429, 502, 503, 504]);

export async function fetchWithRetry(
  fetchFn: typeof fetch,
  url: string,
  init: RequestInit,
  opts: RetryOptions = {},
): Promise<Response> {
  const attempts = Math.max(1, opts.attempts ?? 3);
  const sleep = opts.sleep ?? defaultSleep;
  for (let i = 1; ; i++) {
    let res: Response;
    try {
      res = await fetchFn(url, init);
    } catch (err) {
      if (i >= attempts) throw err;
      await sleep(backoffMs(i));
      continue;
    }
    if (!RETRY_STATUS.has(res.status) || i >= attempts) return res;
    await sleep(backoffMs(i, res.headers.get("retry-after")));
  }
}

function backoffMs(attempt: number, retryAfter?: string | null): number {
  const s = Number(retryAfter);
  if (retryAfter && Number.isFinite(s) && s > 0) return Math.min(s, 10) * 1000;
  return attempt === 1 ? 1000 : 3000;
}

/** Erros da Meta que mais aparecem, com o que fazer. */
const HINTS: Record<number, string> = {
  190: "token vencido ou errado: gere um token permanente (usuário do sistema) e troque no Railway",
  10: "o app não tem permissão para isso: confira as permissões do token",
  200: "o app não tem permissão para isso: confira as permissões do token",
  100: "algum dado do envio está errado (ex.: PHONE_NUMBER_ID ou o número do cliente)",
  368: "a conta foi bloqueada temporariamente pela Meta por violar regras",
  130429: "limite de envios por segundo da Meta: vai normalizar sozinho",
  131026: "o número do cliente não tem WhatsApp ou não aceita a mensagem",
  131031: "a conta do WhatsApp Business foi bloqueada pela Meta",
  131042: "problema de pagamento na conta da Meta: confira a forma de pagamento",
  131047: "passaram mais de 24h desde a última mensagem do cliente: só template aprovado",
  131049: "a Meta segurou a mensagem de marketing para não cansar o cliente",
  131051: "tipo de mensagem não suportado",
  131056: "muitas mensagens para o mesmo cliente em pouco tempo",
  132000: "a quantidade de variáveis não bate com o template aprovado",
  132001: "o template não existe ou ainda não foi aprovado nesse idioma",
  133010: "o número ainda não foi registrado na Cloud API",
  2018278: "passaram mais de 24h desde a última mensagem do cliente no Instagram",
};

/** "código 190: token vencido ou errado..." (ou só a mensagem da Meta, se o código for desconhecido). */
export function describeMetaError(error: any): string | null {
  if (!error || typeof error !== "object") return null;
  const code = Number(error.code);
  const hint = HINTS[Number(error.error_subcode)] ?? HINTS[code];
  const meta = error.error_data?.details ?? error.message ?? error.title;
  if (hint) return `código ${code}: ${hint}`;
  return meta ? `código ${Number.isFinite(code) ? code : "?"}: ${meta}` : null;
}
