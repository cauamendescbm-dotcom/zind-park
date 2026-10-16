import QRCode from "qrcode";

/**
 * Página com os QR Codes do Zind (rota /qr): um abre o WhatsApp, o outro abre o Direct
 * do Instagram. Nos dois o agente responde. Os links vêm do .env:
 *   ZIND_WHATSAPP_LINK  = https://wa.me/5547999999999 (ou só o número)
 *   ZIND_INSTAGRAM_LINK = @zind (ou o link do perfil)
 */

const unfilled = (v: string | undefined) => !v || /PREENCHER|DDDNUMERO/i.test(v);

/** Aceita link do wa.me ou só o número (com DDI 55) e devolve o link com a mensagem pronta. */
export function whatsappQrLink(value: string | undefined, text: string): string | null {
  if (unfilled(value)) return null;
  const v = value!.trim();
  let url: URL;
  if (/^https?:\/\//i.test(v)) {
    url = new URL(v);
  } else {
    const digits = v.replace(/\D/g, "");
    if (digits.length < 10) return null;
    url = new URL(`https://wa.me/${digits.length <= 11 ? "55" + digits : digits}`);
  }
  if (text && /(^|\.)wa\.me$/i.test(url.hostname) && !url.searchParams.has("text")) {
    url.searchParams.set("text", text);
  }
  return url.toString();
}

/** Aceita @usuario, usuario ou o link do perfil e devolve o link que abre o Direct. */
export function instagramQrLink(value: string | undefined): string | null {
  if (unfilled(value)) return null;
  const v = value!.trim();
  const user = v.match(/^@?([A-Za-z0-9._]{1,30})$/)?.[1] ?? v.match(/instagram\.com\/([A-Za-z0-9._]{1,30})/i)?.[1];
  if (user) return `https://ig.me/m/${user}`;
  return /^https?:\/\//i.test(v) ? v : null;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const qrSvg = (link: string) => QRCode.toString(link, { type: "svg", errorCorrectionLevel: "M", margin: 1 });

export interface QrPageOptions {
  name: string;
  whatsapp: string | null;
  instagram: string | null;
  /** Rodapé: endereço e horários (vêm do parkConfig). */
  address?: string;
  hours?: string[];
}

const icons = {
  whatsapp: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.4-.3Z"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4ZM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4ZM12 2c-2.7 0-3 0-4.1.1-4 .2-5.6 1.8-5.8 5.8C2 9 2 9.3 2 12s0 3 .1 4.1c.2 4 1.8 5.6 5.8 5.8 1.1.1 1.4.1 4.1.1s3 0 4.1-.1c4-.2 5.6-1.8 5.8-5.8.1-1.1.1-1.4.1-4.1s0-3-.1-4.1c-.2-4-1.8-5.6-5.8-5.8C15 2 14.7 2 12 2Zm0 1.8c2.7 0 3 0 4 .1 2.9.1 3.9 1.2 4.1 4.1.1 1 .1 1.3.1 4s0 3-.1 4c-.1 2.9-1.2 3.9-4.1 4.1-1 .1-1.3.1-4 .1s-3 0-4-.1c-2.9-.1-3.9-1.2-4.1-4.1-.1-1-.1-1.3-.1-4s0-3 .1-4c.1-2.9 1.2-3.9 4.1-4.1 1-.1 1.3-.1 4-.1Z"/></svg>`,
};

export async function renderQrPage(o: QrPageOptions): Promise<string> {
  const card = async (kind: "whatsapp" | "instagram", title: string, hint: string, link: string | null, missing: string) => `
    <section class="card ${kind}">
      <div class="tag">${icons[kind]}<span>${title}</span></div>
      ${
        link
          ? `<div class="qr" role="img" aria-label="QR Code do ${title}">${await qrSvg(link)}</div>
      <p>${hint}</p>
      <a class="btn" href="${esc(link)}" target="_blank" rel="noopener">${icons[kind]}Abrir o ${title}</a>`
          : `<div class="qr vazio">Falta configurar</div>
      <p class="aviso">${missing}</p>`
      }
    </section>`;

  const footer =
    o.address || o.hours?.length
      ? `<footer>
    ${o.address ? `<p><strong>📍 ${esc(o.address)}</strong></p>` : ""}
    ${(o.hours ?? []).map((h) => `<p>${esc(h)}</p>`).join("\n    ")}
  </footer>`
      : "";

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fale com o ${esc(o.name)}</title>
<style>
  :root { --tinta: #2b2233; --suave: #6b6175; --fundo: #fff8f2; --cartao: #ffffff;
    --wa: #1fa855; --ig: #d62976; --destaque: #ff8a3d; --destaque2: #ff5fa2; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--fundo); color: var(--tinta);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; line-height: 1.45; }
  header { background: linear-gradient(135deg, var(--destaque), var(--destaque2)); color: #fff;
    text-align: center; padding: 36px 16px 64px; border-radius: 0 0 32px 32px; }
  .marca { font-size: 2.6rem; font-weight: 800; letter-spacing: .02em; margin: 0; }
  header p { margin: 6px auto 0; max-width: 360px; font-size: 1.05rem; color: #fff; }
  main { max-width: 440px; margin: -40px auto 0; padding: 0 16px 40px; text-align: center; }
  .passos { display: flex; gap: 8px; background: var(--cartao); border-radius: 18px; padding: 14px 10px;
    box-shadow: 0 4px 18px rgba(43, 34, 51, .08); margin-bottom: 24px; }
  .passo { flex: 1; font-size: .85rem; color: var(--suave); }
  .passo b { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; margin: 0 auto 4px;
    border-radius: 50%; background: var(--fundo); color: var(--destaque); font-size: .95rem; }
  .card { background: var(--cartao); border-radius: 22px; padding: 22px 20px 24px; margin-bottom: 22px;
    box-shadow: 0 4px 18px rgba(43, 34, 51, .08); }
  .tag { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 999px;
    color: #fff; font-weight: 700; font-size: 1.1rem; margin-bottom: 16px; }
  .tag svg, .btn svg { width: 20px; height: 20px; }
  .whatsapp .tag, .whatsapp .btn { background: var(--wa); }
  .instagram .tag, .instagram .btn { background: linear-gradient(45deg, #f9a03f, var(--ig) 55%, #7b3fe4); }
  .qr { width: 230px; max-width: 100%; margin: 0 auto 12px; padding: 10px; border-radius: 16px; border: 3px solid; }
  .whatsapp .qr { border-color: var(--wa); }
  .instagram .qr { border-color: var(--ig); }
  .qr svg { display: block; width: 100%; height: auto; }
  .qr.vazio { height: 230px; display: flex; align-items: center; justify-content: center;
    border: 2px dashed #d9cfe0; color: var(--suave); }
  p { margin: 0 0 16px; color: var(--suave); }
  .aviso { font-size: .9rem; }
  .btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 22px; border-radius: 999px;
    color: #fff; text-decoration: none; font-weight: 700; }
  footer { margin-top: 8px; }
  footer p { margin: 0 0 4px; font-size: .92rem; }
  footer strong { color: var(--tinta); }
  @media print {
    body { background: #fff; }
    header { border-radius: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .card, .passos { box-shadow: none; border: 1px solid #eee; break-inside: avoid; }
    .tag { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .btn { display: none; }
  }
</style>
</head>
<body>
<header>
  <h1 class="marca">${esc(o.name)}</h1>
  <p>Fale com a gente! Respondemos na hora, a qualquer hora 💛</p>
</header>
<main>
  <div class="passos">
    <div class="passo"><b>1</b>Abra a câmera</div>
    <div class="passo"><b>2</b>Aponte para o QR Code</div>
    <div class="passo"><b>3</b>Mande um oi</div>
  </div>
  ${await card(
    "whatsapp",
    "WhatsApp",
    "Festas, horários, valores: é só chamar!",
    o.whatsapp,
    "Coloque o número no ZIND_WHATSAPP_LINK do Railway.",
  )}
  ${await card(
    "instagram",
    "Instagram",
    "Prefere o Direct? A gente responde por lá também.",
    o.instagram,
    "Coloque o @ do Instagram no ZIND_INSTAGRAM_LINK do Railway.",
  )}
  ${footer}
</main>
</body>
</html>`;
}
