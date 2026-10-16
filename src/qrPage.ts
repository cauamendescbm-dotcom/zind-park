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
}

export async function renderQrPage(o: QrPageOptions): Promise<string> {
  const card = async (kind: "whatsapp" | "instagram", title: string, hint: string, link: string | null, missing: string) => `
    <section class="card ${kind}">
      <h2>${title}</h2>
      ${
        link
          ? `<div class="qr" role="img" aria-label="QR Code do ${title}">${await qrSvg(link)}</div>
      <p>${hint}</p>
      <a class="btn" href="${esc(link)}" target="_blank" rel="noopener">Abrir no celular</a>`
          : `<div class="qr vazio">Falta configurar</div>
      <p class="aviso">${missing}</p>`
      }
    </section>`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fale com o ${esc(o.name)}</title>
<style>
  :root { --tinta: #2b2233; --suave: #6b6175; --fundo: #fff8f2; --cartao: #ffffff; --wa: #1fa855; --ig: #d62976; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--fundo); color: var(--tinta);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 440px; margin: 0 auto; padding: 32px 16px 48px; text-align: center; }
  h1 { font-size: 1.7rem; margin: 0 0 6px; }
  .sub { color: var(--suave); margin: 0 0 28px; }
  .card { background: var(--cartao); border-radius: 20px; padding: 24px 20px; margin-bottom: 24px;
    box-shadow: 0 4px 18px rgba(43, 34, 51, .08); border-top: 6px solid; }
  .card.whatsapp { border-color: var(--wa); }
  .card.instagram { border-color: var(--ig); }
  h2 { margin: 0 0 16px; font-size: 1.3rem; }
  .qr { width: 240px; max-width: 100%; margin: 0 auto 14px; }
  .qr svg { display: block; width: 100%; height: auto; }
  .qr.vazio { height: 240px; display: flex; align-items: center; justify-content: center;
    border: 2px dashed #d9cfe0; border-radius: 12px; color: var(--suave); }
  p { margin: 0 0 16px; color: var(--suave); }
  .aviso { font-size: .9rem; }
  .btn { display: inline-block; padding: 12px 22px; border-radius: 999px; color: #fff;
    text-decoration: none; font-weight: 600; }
  .whatsapp .btn { background: var(--wa); }
  .instagram .btn { background: var(--ig); }
  @media print {
    body { background: #fff; }
    .card { box-shadow: none; break-inside: avoid; }
    .btn { display: none; }
  }
</style>
</head>
<body>
<main>
  <h1>Fale com o ${esc(o.name)} 💛</h1>
  <p class="sub">Aponte a câmera do celular para o QR Code e mande um oi. A gente responde na hora, a qualquer hora!</p>
  ${await card(
    "whatsapp",
    "WhatsApp",
    "Abre a conversa com o Zind no WhatsApp.",
    o.whatsapp,
    "Coloque o número no ZIND_WHATSAPP_LINK do Railway.",
  )}
  ${await card(
    "instagram",
    "Instagram",
    "Abre o Direct do Zind no Instagram.",
    o.instagram,
    "Coloque o @ do Instagram no ZIND_INSTAGRAM_LINK do Railway.",
  )}
</main>
</body>
</html>`;
}
