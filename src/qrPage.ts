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


const icons = {
  whatsapp: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.4-.3Z"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4ZM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4ZM12 2c-2.7 0-3 0-4.1.1-4 .2-5.6 1.8-5.8 5.8C2 9 2 9.3 2 12s0 3 .1 4.1c.2 4 1.8 5.6 5.8 5.8 1.1.1 1.4.1 4.1.1s3 0 4.1-.1c4-.2 5.6-1.8 5.8-5.8.1-1.1.1-1.4.1-4.1s0-3-.1-4.1c-.2-4-1.8-5.6-5.8-5.8C15 2 14.7 2 12 2Zm0 1.8c2.7 0 3 0 4 .1 2.9.1 3.9 1.2 4.1 4.1.1 1 .1 1.3.1 4s0 3-.1 4c-.1 2.9-1.2 3.9-4.1 4.1-1 .1-1.3.1-4 .1s-3 0-4-.1c-2.9-.1-3.9-1.2-4.1-4.1-.1-1-.1-1.3-.1-4s0-3 .1-4c.1-2.9 1.2-3.9 4.1-4.1 1-.1 1.3-.1 4-.1Z"/></svg>`,
};

export interface QrPageOptions {
  name: string;
  whatsapp: string | null;
  instagram: string | null;
  /** Endereço e horários (vêm do parkConfig). */
  address?: string;
  hours?: string[];
}

/** "(47) 99999-8888" a partir do link do wa.me, para mostrar na página. */
export function whatsappLabel(link: string): string | null {
  const d = link.match(/wa\.me\/(\d+)/)?.[1];
  if (!d) return null;
  const n = d.startsWith("55") && d.length >= 12 ? d.slice(2) : d;
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return `+${d}`;
}

/** "@zind" a partir do link do Direct. */
export function instagramLabel(link: string): string | null {
  const u = link.match(/(?:ig\.me\/m|instagram\.com)\/([A-Za-z0-9._]+)/i)?.[1];
  return u ? `@${u}` : null;
}

const extraIcons = {
  pin: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 21s-7-6.1-7-11.5a7 7 0 1 1 14 0C19 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 7v5l3 2"/></svg>`,
  print: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/></svg>`,
};

export async function renderQrPage(o: QrPageOptions): Promise<string> {
  const card = async (
    kind: "whatsapp" | "instagram",
    title: string,
    label: string | null,
    hint: string,
    link: string | null,
    missing: string,
  ) => `
      <article class="card ${kind}">
        <div class="card-top">
          <span class="badge">${icons[kind]}</span>
          <div>
            <h3>${title}</h3>
            <span class="handle">${label ? esc(label) : "&nbsp;"}</span>
          </div>
        </div>
        ${
          link
            ? `<div class="qr" role="img" aria-label="QR Code do ${title}">${await qrSvg(link)}</div>
        <p>${hint}</p>
        <a class="btn" href="${esc(link)}" target="_blank" rel="noopener">${icons[kind]}Conversar pelo ${title}</a>`
            : `<div class="qr vazio">Falta configurar</div>
        <p class="aviso">${missing}</p>`
        }
      </article>`;

  const mapa = o.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.address)}` : null;
  const year = new Date().getFullYear();
  const desc = `Fale com o ${o.name} pelo WhatsApp ou Instagram. A gente responde na hora, 24 horas por dia.`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.name)} | Fale com a gente</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(o.name)} | Fale com a gente">
<meta property="og:description" content="${esc(desc)}">
<meta name="theme-color" content="#2a1446">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  :root {
    --ink: #2a1446; --ink-2: #5b4a72; --cream: #fff8f0; --white: #ffffff; --line: #efe4f5;
    --coral: #ff6b4a; --sun: #ffc23d; --violet: #7c4dff; --mint: #2ed3a6;
    --wa: #1faa55; --ig-1: #f9a03f; --ig-2: #e1306c; --ig-3: #833ab4;
    --radius: 28px; --shadow: 0 18px 50px -18px rgba(42, 20, 70, .28);
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { margin: 0; background: var(--cream); color: var(--ink); font: 400 17px/1.55 "Nunito", system-ui, sans-serif;
    -webkit-font-smoothing: antialiased; }
  h1, h2, h3, .logo { font-family: "Fredoka", "Nunito", system-ui, sans-serif; margin: 0; }
  a { color: inherit; }
  .wrap { max-width: 1040px; margin: 0 auto; padding: 0 20px; }

  /* Topo */
  .hero { position: relative; overflow: hidden; color: #fff; padding: 22px 0 120px;
    background: radial-gradient(120% 90% at 85% 0%, #5b2aa8 0%, transparent 60%),
                radial-gradient(90% 80% at 0% 100%, #b4306b 0%, transparent 55%), var(--ink); }
  .hero::after { content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 60px; background: var(--cream);
    clip-path: ellipse(75% 100% at 50% 100%); }
  .blob { position: absolute; border-radius: 50%; opacity: .9; filter: saturate(1.1); }
  .b1 { width: 120px; height: 120px; background: var(--sun); top: 70px; right: -30px; }
  .b2 { width: 54px; height: 54px; background: var(--coral); top: 210px; right: 14%; }
  .b3 { width: 22px; height: 22px; background: var(--mint); top: 110px; left: 8%; }
  .b4 { width: 14px; height: 14px; background: var(--sun); top: 300px; left: 18%; }
  .b5 { width: 80px; height: 80px; border: 10px solid var(--violet); background: none; bottom: 70px; left: -24px; }
  nav { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; }
  .logo { font-size: 2rem; font-weight: 700; letter-spacing: .01em; display: flex; align-items: center; gap: 10px; }
  .logo i { width: 14px; height: 14px; border-radius: 50%; background: var(--sun); box-shadow: 18px 0 0 var(--coral), 36px 0 0 var(--mint);
    margin-right: 36px; }
  .pill { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px;
    background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.18); font-weight: 700; font-size: .85rem; }
  .pill .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--mint); box-shadow: 0 0 0 4px rgba(46,211,166,.25); }
  .hero-body { position: relative; z-index: 1; max-width: 640px; margin: 64px auto 0; text-align: center; }
  .eyebrow { text-transform: uppercase; letter-spacing: .16em; font-size: .78rem; font-weight: 800; color: var(--sun); }
  .hero h1 { font-size: clamp(2.3rem, 7vw, 3.8rem); line-height: 1.05; margin: 14px 0 18px; font-weight: 700; }
  .hero h1 span { color: var(--sun); }
  .hero p { margin: 0 auto; max-width: 520px; font-size: 1.1rem; color: rgba(255,255,255,.86); }
  .cta { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-top: 30px; }
  .cta a { display: inline-flex; align-items: center; gap: 10px; padding: 14px 22px; border-radius: 999px; font-weight: 800;
    text-decoration: none; transition: transform .15s ease; }
  .cta a:hover { transform: translateY(-2px); }
  .cta svg { width: 20px; height: 20px; }
  .cta .wa { background: var(--wa); color: #fff; }
  .cta .ig { background: #fff; color: var(--ink); }

  /* Como funciona */
  section { padding: 56px 0; }
  .titulo { text-align: center; margin-bottom: 34px; }
  .titulo h2 { font-size: clamp(1.7rem, 4.5vw, 2.3rem); font-weight: 700; }
  .titulo p { margin: 8px auto 0; color: var(--ink-2); max-width: 520px; }
  .passos { list-style: none; margin: -70px 0 0; padding: 0; position: relative; z-index: 2;
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .passos li { background: var(--white); border-radius: 22px; padding: 18px 16px; box-shadow: var(--shadow); text-align: center; }
  .passos b { display: inline-flex; width: 38px; height: 38px; border-radius: 12px; align-items: center; justify-content: center;
    font: 700 1.1rem "Fredoka", sans-serif; color: #fff; margin-bottom: 8px; }
  .passos li:nth-child(1) b { background: var(--coral); }
  .passos li:nth-child(2) b { background: var(--violet); }
  .passos li:nth-child(3) b { background: var(--wa); }
  .passos strong { display: block; font-size: 1rem; }
  .passos span { color: var(--ink-2); font-size: .88rem; }

  /* QR Codes */
  .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .card { background: var(--white); border-radius: var(--radius); padding: 26px; box-shadow: var(--shadow); text-align: center;
    border: 1px solid var(--line); position: relative; overflow: hidden; }
  .card::before { content: ""; position: absolute; inset: 0 0 auto 0; height: 6px; }
  .whatsapp::before { background: var(--wa); }
  .instagram::before { background: linear-gradient(90deg, var(--ig-1), var(--ig-2), var(--ig-3)); }
  .card-top { display: flex; align-items: center; gap: 14px; text-align: left; margin-bottom: 22px; }
  .badge { width: 52px; height: 52px; border-radius: 16px; display: grid; place-items: center; color: #fff; flex: none; }
  .badge svg { width: 28px; height: 28px; }
  .whatsapp .badge, .whatsapp .btn { background: var(--wa); }
  .instagram .badge, .instagram .btn { background: linear-gradient(45deg, var(--ig-1), var(--ig-2) 55%, var(--ig-3)); }
  .card h3 { font-size: 1.45rem; font-weight: 600; line-height: 1.1; }
  .handle { color: var(--ink-2); font-weight: 700; font-size: .95rem; }
  .qr { width: 100%; max-width: 250px; margin: 0 auto 18px; padding: 14px; border-radius: 22px; background: #fff;
    border: 2px solid var(--line); }
  .qr svg { display: block; width: 100%; height: auto; }
  .qr.vazio { aspect-ratio: 1; display: grid; place-items: center; border-style: dashed; color: var(--ink-2); font-weight: 700; }
  .card p { margin: 0 0 18px; color: var(--ink-2); }
  .card .aviso { font-size: .9rem; }
  .btn { display: inline-flex; align-items: center; gap: 10px; padding: 13px 22px; border-radius: 999px; color: #fff;
    text-decoration: none; font-weight: 800; }
  .btn svg { width: 20px; height: 20px; }

  /* Assuntos */
  .assuntos { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; max-width: 720px; margin: 0 auto; }
  .assuntos span { background: var(--white); border: 1px solid var(--line); padding: 10px 16px; border-radius: 999px; font-weight: 700;
    font-size: .95rem; }

  /* Visite */
  .visite { background: var(--ink); color: #fff; border-radius: var(--radius); padding: 34px; display: grid;
    grid-template-columns: 1fr 1fr; gap: 26px; position: relative; overflow: hidden; }
  .visite::after { content: ""; position: absolute; width: 200px; height: 200px; border-radius: 50%; background: var(--violet);
    opacity: .35; right: -60px; top: -80px; }
  .info { display: flex; gap: 14px; position: relative; z-index: 1; }
  .info .ic { width: 46px; height: 46px; flex: none; border-radius: 14px; display: grid; place-items: center; background: rgba(255,255,255,.1);
    color: var(--sun); }
  .info .ic svg { width: 24px; height: 24px; }
  .info h3 { font-size: 1.15rem; font-weight: 600; margin-bottom: 4px; }
  .info p { margin: 0; color: rgba(255,255,255,.82); }
  .info a { color: var(--sun); font-weight: 800; text-decoration: none; display: inline-block; margin-top: 6px; }

  footer { text-align: center; padding: 30px 0 46px; color: var(--ink-2); font-size: .9rem; }
  footer .logo { font-size: 1.4rem; color: var(--ink); justify-content: center; margin-bottom: 6px; }
  .imprimir { margin-top: 14px; display: inline-flex; align-items: center; gap: 8px; background: none; border: 1px solid var(--line);
    padding: 9px 16px; border-radius: 999px; font: 700 .9rem "Nunito", sans-serif; color: var(--ink-2); cursor: pointer; }
  .imprimir svg { width: 18px; height: 18px; }

  @media (max-width: 760px) {
    body { font-size: 16px; }
    .hero { padding-bottom: 104px; }
    .hero-body { margin-top: 44px; }
    .pill { display: none; }
    .b1 { width: 70px; height: 70px; top: -20px; right: -20px; }
    .b2 { width: 26px; height: 26px; top: auto; bottom: 150px; right: 6%; }
    .b3 { top: 74px; left: auto; right: 30%; width: 14px; height: 14px; }
    .b4 { display: none; }
    .passos { gap: 8px; }
    .passos li { padding: 14px 8px; border-radius: 18px; }
    .passos span { display: none; }
    .passos strong { font-size: .88rem; }
    .cards, .visite { grid-template-columns: 1fr; }
    .visite { padding: 26px 22px; }
    section { padding: 44px 0; }
    .card { padding: 22px 20px; }
  }
  @media print {
    @page { margin: 12mm; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { background: #fff; }
    .cta, .btn, .imprimir, .assuntos-sec { display: none !important; }
    .hero { padding-bottom: 90px; }
    .card, .passos li { box-shadow: none; break-inside: avoid; }
    section { padding: 28px 0; }
  }
</style>
</head>
<body>
<header class="hero">
  <span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span><span class="blob b4"></span><span class="blob b5"></span>
  <div class="wrap">
    <nav>
      <div class="logo"><i></i>${esc(o.name)}</div>
      <span class="pill"><span class="dot"></span>Atendimento 24 horas</span>
    </nav>
    <div class="hero-body">
      <div class="eyebrow">Parque e festas · Fale com a gente</div>
      <h1>A diversão começa com um <span>oi</span>.</h1>
      <p>Tire suas dúvidas, confira horários e planeje a festa dos sonhos. A gente responde na hora, a qualquer hora.</p>
      <div class="cta">
        ${o.whatsapp ? `<a class="wa" href="${esc(o.whatsapp)}" target="_blank" rel="noopener">${icons.whatsapp}Chamar no WhatsApp</a>` : ""}
        ${o.instagram ? `<a class="ig" href="${esc(o.instagram)}" target="_blank" rel="noopener">${icons.instagram}Chamar no Instagram</a>` : ""}
      </div>
    </div>
  </div>
</header>

<main class="wrap">
  <ol class="passos" aria-label="Como funciona">
    <li><b>1</b><strong>Abra a câmera</strong><span>do seu celular</span></li>
    <li><b>2</b><strong>Aponte para o QR</strong><span>do canal que preferir</span></li>
    <li><b>3</b><strong>Mande um oi</strong><span>e a gente responde</span></li>
  </ol>

  <section id="qr">
    <div class="titulo">
      <h2>Escolha onde quer conversar</h2>
      <p>É só escanear o código. No WhatsApp ou no Direct, quem responde é a nossa equipe virtual, sempre pronta para ajudar.</p>
    </div>
    <div class="cards">${await card(
      "whatsapp",
      "WhatsApp",
      o.whatsapp ? whatsappLabel(o.whatsapp) : null,
      "A conversa já abre com a mensagem pronta. É só enviar!",
      o.whatsapp,
      "Coloque o número no ZIND_WHATSAPP_LINK do Railway.",
    )}${await card(
      "instagram",
      "Instagram",
      o.instagram ? instagramLabel(o.instagram) : null,
      "Abre direto no nosso Direct. Mande sua mensagem por lá.",
      o.instagram,
      "Coloque o @ do Instagram no ZIND_INSTAGRAM_LINK do Railway.",
    )}
    </div>
  </section>

  <section class="assuntos-sec">
    <div class="titulo">
      <h2>Pode perguntar à vontade</h2>
      <p>Alguns assuntos que a gente adora responder:</p>
    </div>
    <div class="assuntos">
      <span>🎂 Festas de aniversário</span><span>🕒 Horários</span><span>🎟️ Valores da entrada</span>
      <span>🧦 Meias</span><span>📍 Como chegar</span><span>♿ Acessibilidade</span><span>💳 Formas de pagamento</span>
    </div>
  </section>

  ${
    o.address || o.hours?.length
      ? `<section>
    <div class="visite">
      ${
        o.address
          ? `<div class="info"><span class="ic">${extraIcons.pin}</span><div><h3>Onde estamos</h3><p>${esc(o.address)}</p>${
              mapa ? `<a href="${esc(mapa)}" target="_blank" rel="noopener">Ver no mapa →</a>` : ""
            }</div></div>`
          : ""
      }
      ${
        o.hours?.length
          ? `<div class="info"><span class="ic">${extraIcons.clock}</span><div><h3>Horário do parque</h3>${o.hours
              .map((h) => `<p>${esc(h)}</p>`)
              .join("")}</div></div>`
          : ""
      }
    </div>
  </section>`
      : ""
  }
</main>

<footer>
  <div class="logo">${esc(o.name)}</div>
  <div>© ${year} ${esc(o.name)}. Feito com carinho para a sua família.</div>
  <button class="imprimir" type="button" onclick="window.print()">${extraIcons.print}Imprimir cartaz</button>
</footer>
</body>
</html>`;
}
