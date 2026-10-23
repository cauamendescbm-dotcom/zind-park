import { timingSafeEqual } from "node:crypto";
import QRCode from "qrcode";

/**
 * Página /conectar: o cliente liga o WhatsApp e o Instagram da empresa no robô pelo login oficial da
 * Meta. Nada de QR Code de WhatsApp Web, que não é oficial e pode banir o número. Se o número já está
 * no app WhatsApp Business, a própria Meta mostra um QR Code para escanear no app.
 * Depois de conectar, a página mostra os QR Codes que levam os clientes para o WhatsApp e o Direct.
 */
export interface ConnectPageOptions {
  appId: string;
  /** Configuração do "Cadastro incorporado do WhatsApp" (vazio = sem o cartão do WhatsApp). */
  whatsappConfigId: string | null;
  /** Configuração do Login para Empresas com as permissões do Instagram (vazio = sem o cartão do Instagram). */
  instagramConfigId: string | null;
  apiVersion: string;
  /** A chave do link, devolvida ao servidor junto com o resultado. */
  key: string;
  /** Nome da atendente (AGENT_NAME), usado na conversa de exemplo. */
  agentName: string;
  /** Número que já está ligado, para mostrar na página. */
  connected: { displayPhone: string | null; verifiedName: string | null } | null;
  /** Instagram que já está ligado. */
  instagram: { username: string | null; pageName: string | null } | null;
  /** QR Codes prontos (buildQrCodes), que aparecem depois de conectar. */
  qr: QrCodes;
}

export interface QrCodes {
  whatsapp: { link: string; svg: string } | null;
  instagram: { link: string; svg: string } | null;
}

/** QR Codes que levam os clientes da empresa para a conversa: wa.me (WhatsApp) e ig.me (Direct). */
export async function buildQrCodes(displayPhone: string | null | undefined, igUsername: string | null | undefined): Promise<QrCodes> {
  const svg = (link: string) => QRCode.toString(link, { type: "svg", errorCorrectionLevel: "M", margin: 1 });
  const digits = displayPhone?.replace(/\D/g, "");
  const wa = digits ? `https://wa.me/${digits}` : null;
  const ig = igUsername ? `https://ig.me/m/${encodeURIComponent(igUsername)}` : null;
  return {
    whatsapp: wa ? { link: wa, svg: await svg(wa) } : null,
    instagram: ig ? { link: ig, svg: await svg(ig) } : null,
  };
}

/** Confere a chave do link sem vazar o tamanho/conteúdo pelo tempo de resposta. */
export function keyMatches(given: unknown, expected: string | undefined): boolean {
  if (!expected || typeof given !== "string") return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const ICONS: Record<string, string> = {
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  coracao: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  balao: '<path d="M4 5h16v11H8l-4 4z"/><path d="M8 10h8M8 13h5"/>',
  prancheta: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM8.5 12l2 2 4-4"/>',
  pessoa: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/>',
  sino: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  megafone: '<path d="M4 10v4h3l8 4V6l-8 4z"/><path d="M18 9.5a3 3 0 0 1 0 5"/>',
  camera: '<rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.5"/><circle cx="16.8" cy="7.2" r=".6"/>',
  escudo: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  qr: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/>',
  celular: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
};
const icon = (name: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

const FEATURES: [string, string, string][] = [
  ["relogio", "Responde 24 horas", "De madrugada, no domingo, no feriado. Ninguém fica sem resposta."],
  ["coracao", "Jeito de gente", "Conversa com carinho, em balões curtos, digita como pessoa e até corrige um errinho."],
  ["balao", "Sabe tudo do seu negócio", "Horários, preços, endereço, regras: responde com os textos oficiais da sua empresa."],
  ["prancheta", "Anota os pedidos", "Pergunta os dados um por vez e manda tudo prontinho para a sua equipe fechar."],
  ["pessoa", "Sua equipe assume quando quiser", "Respondeu pelo celular? O robô fica quieto naquela conversa."],
  ["sino", "Lembra quem disse \"vou pensar\"", "Volta a chamar no dia seguinte, no horário certo, sem ser chato."],
  ["megafone", "Promoções para a lista", "Avisos de promoção e feriado para quem aceitou receber, com os modelos aprovados da Meta."],
  ["camera", "Instagram também", "Responde o Direct e os comentários com palavra-chave, e leva o cliente para o WhatsApp."],
];

const STEPS: [string, string][] = [
  ["Clique em conectar", "Entre com o Facebook da sua empresa. É a tela oficial da Meta."],
  ["Escolha o número", "Selecione a empresa e o número do WhatsApp que o robô vai atender."],
  ["Escaneie o QR Code", "Abra o WhatsApp Business no celular e aponte para o código que aparece."],
  ["Ligue o Instagram", "Um clique: autorize a Página do Facebook ligada ao seu Instagram profissional."],
  ["Pronto!", "O robô já responde. Imprima os seus QR Codes e espalhe para os clientes."],
];

const FAQ: [string, string][] = [
  ["Vou perder minhas conversas?", "Não. No modo QR Code o número continua no app WhatsApp Business, com os contatos e as conversas de sempre."],
  ["Meu número pode ser bloqueado?", "Não por causa da conexão: ela é feita pelo cadastro oficial da Meta, não por um WhatsApp Web \"pirata\"."],
  ["Preciso do WhatsApp Business?", "Para o QR Code, sim. É grátis e dá para passar o seu número do WhatsApp comum para ele sem perder nada."],
  ["E se eu quiser responder eu mesmo?", "É só responder pelo celular. O robô percebe e fica quieto naquela conversa por um tempo."],
  ["Por que o Instagram pede o Facebook?", "Porque é assim que a Meta libera o Direct para atendimento: a conta precisa ser profissional e estar ligada a uma Página do Facebook."],
  ["Para que servem os QR Codes?", "Seus clientes apontam a câmera e caem direto na conversa com você, no WhatsApp ou no Direct. Coloque no balcão, no cardápio, no cartão."],
  ["Posso desconectar?", "Pode, a qualquer momento. É só falar com quem te mandou o link."],
];

export function renderConnectPage(o: ConnectPageOptions): string {
  const waAtual = o.connected
    ? `<div class="atual">${icon("escudo")}<div><b>Conectado:</b> ${esc(o.connected.verifiedName ?? "")} ${esc(o.connected.displayPhone ?? "")}<br><small>Conectar de novo troca pelo número novo.</small></div></div>`
    : "";
  const igAtual = o.instagram
    ? `<div class="atual">${icon("escudo")}<div><b>Conectado:</b> ${o.instagram.username ? "@" + esc(o.instagram.username) : esc(o.instagram.pageName ?? "")}<br><small>Conectar de novo troca pela conta nova.</small></div></div>`
    : "";
  const nome = esc(o.agentName);
  const settings = JSON.stringify({
    appId: o.appId,
    waConfigId: o.whatsappConfigId,
    igConfigId: o.instagramConfigId,
    version: o.apiVersion,
    key: o.key,
  }).replace(/</g, "\\u003c");
  const qrCard = (tipo: "whatsapp" | "instagram", titulo: string, ico: string, qr: { link: string; svg: string } | null, falta: string) => `
        <div class="qr-card ${tipo}">
          <div class="qr-topo"><span class="ico">${icon(ico)}</span><div><h3>${titulo}</h3><small>${qr ? esc(qr.link.replace("https://", "")) : falta}</small></div></div>
          ${qr ? `<div class="qr" role="img" aria-label="QR Code do ${titulo}">${qr.svg}</div><a class="abrir" href="${esc(qr.link)}" target="_blank" rel="noopener">Testar o link</a>` : `<div class="qr vazio">${icon("qr")}<span>Aparece aqui quando você conectar</span></div>`}
        </div>`;
  const temQr = !!(o.qr.whatsapp || o.qr.instagram);
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Conectar WhatsApp</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root {
    --verde: #16a34a; --verde-forte: #15803d; --verde-claro: #dcfce7; --tinta: #0f1f17; --texto: #1f2a24; --suave: #5d6b63;
    --fundo: #f6f8f7; --cartao: #ffffff; --borda: #e3e9e5; --hero1: #052e16; --hero2: #0b4a2a; --sombra: 0 20px 50px -24px rgba(5, 46, 22, .35);
    --bolha-in: #ffffff; --bolha-out: #d9fdd3; --chat: #efeae2;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --verde-claro: #12351f; --tinta: #eef4f0; --texto: #e2e9e5; --suave: #a1b0a7; --fundo: #0b110e; --cartao: #131b16; --borda: #223029;
      --hero1: #03170b; --hero2: #0a3a20; --sombra: 0 20px 50px -24px rgba(0, 0, 0, .7); --bolha-in: #1f2c33; --bolha-out: #005c4b; --chat: #0b141a;
    }
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { margin: 0; font-family: "Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: var(--fundo); color: var(--texto); -webkit-font-smoothing: antialiased; }
  svg { width: 24px; height: 24px; flex: none; }
  .wrap { max-width: 1120px; margin: 0 auto; padding: 0 16px; }

  /* Topo */
  .hero { background: radial-gradient(1200px 500px at 80% -10%, #22c55e33, transparent 60%), linear-gradient(160deg, var(--hero1), var(--hero2)); color: #ecfdf3; padding: 20px 0 72px; overflow: hidden; }
  .nav { display: flex; align-items: center; gap: 10px; font-weight: 700; letter-spacing: -.01em; }
  .logo { width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center; background: #22c55e; color: #052e16; }
  .logo svg { width: 20px; height: 20px; }
  .selo { margin-left: auto; font-size: .78rem; font-weight: 600; padding: 6px 12px; border-radius: 999px; background: #ffffff14; border: 1px solid #ffffff26; display: inline-flex; gap: 6px; align-items: center; }
  .selo svg { width: 15px; height: 15px; }
  .hero-grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: 48px; align-items: center; margin-top: 48px; }
  .hero h1 { font-size: clamp(2rem, 4.6vw, 3.3rem); line-height: 1.07; letter-spacing: -.03em; margin: 0 0 16px; font-weight: 800; }
  .hero h1 span { color: #4ade80; }
  .hero p.lead { font-size: 1.1rem; line-height: 1.6; color: #c6e9d3; margin: 0 0 28px; max-width: 34em; }

  /* Cartão de conectar */
  .conectar { background: var(--cartao); color: var(--texto); border-radius: 22px; padding: 22px; box-shadow: var(--sombra); max-width: 520px; }
  .conectar h2 { margin: 0 0 4px; font-size: 1.1rem; color: var(--tinta); }
  .conectar > p { margin: 0 0 16px; color: var(--suave); font-size: .95rem; }
  .btn { width: 100%; display: flex; align-items: center; gap: 14px; text-align: left; border: 0; border-radius: 16px; padding: 16px 18px; font: inherit; cursor: pointer; transition: transform .15s, box-shadow .15s, background .15s; }
  .btn b { display: block; font-size: 1.02rem; }
  .btn small { display: block; font-size: .84rem; opacity: .85; margin-top: 2px; font-weight: 500; }
  .btn .ico { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; flex: none; }
  .btn-principal { background: var(--verde); color: #fff; box-shadow: 0 10px 24px -10px #16a34a; }
  .btn-principal .ico { background: #ffffff26; }
  .btn-principal:hover { background: var(--verde-forte); transform: translateY(-1px); }
  .btn-outro { background: transparent; color: var(--texto); border: 1.5px solid var(--borda); margin-top: 10px; }
  .btn-outro .ico { background: var(--verde-claro); color: var(--verde); }
  .btn-outro:hover { border-color: var(--verde); }
  .btn:disabled { opacity: .55; cursor: wait; transform: none; }
  #status { margin-top: 14px; font-weight: 600; font-size: .95rem; min-height: 1.4em; }
  #status.ok { color: var(--verde); }
  #status.erro { color: #dc2626; }
  .atual { display: flex; gap: 10px; align-items: flex-start; background: var(--verde-claro); color: var(--texto); border-radius: 14px; padding: 12px 14px; margin-bottom: 14px; font-size: .92rem; }
  .atual svg { color: var(--verde); }
  .atual small { color: var(--suave); }

  /* Celular com conversa de exemplo */
  .celular { justify-self: center; width: 300px; border-radius: 40px; padding: 12px; background: #0a0f0c; box-shadow: 0 40px 80px -30px #000, inset 0 0 0 2px #ffffff1a; transform: rotate(2deg); }
  .tela { border-radius: 30px; overflow: hidden; background: var(--chat); height: 540px; display: flex; flex-direction: column; }
  .tela-topo { background: #075e54; color: #fff; padding: 14px 16px; display: flex; gap: 10px; align-items: center; }
  .avatar { width: 34px; height: 34px; border-radius: 50%; background: #4ade80; color: #052e16; display: grid; place-items: center; font-weight: 800; }
  .tela-topo b { display: block; font-size: .95rem; }
  .tela-topo small { font-size: .75rem; color: #c8f2d8; }
  .msgs { padding: 14px 12px; display: flex; flex-direction: column; gap: 6px; font-size: .86rem; line-height: 1.4; }
  .m { max-width: 82%; padding: 7px 10px 8px; border-radius: 10px; color: var(--texto); box-shadow: 0 1px 1px #0000001a; opacity: 0; animation: entra .4s forwards; }
  .m.in { background: var(--bolha-in); align-self: flex-start; border-top-left-radius: 2px; }
  .m.out { background: var(--bolha-out); align-self: flex-end; border-top-right-radius: 2px; }
  .m:nth-child(1) { animation-delay: .3s } .m:nth-child(2) { animation-delay: 1.1s } .m:nth-child(3) { animation-delay: 1.7s }
  .m:nth-child(4) { animation-delay: 2.6s } .m:nth-child(5) { animation-delay: 3.3s } .m:nth-child(6) { animation-delay: 4s }
  .digitando { align-self: flex-start; background: var(--bolha-in); border-radius: 10px; padding: 9px 12px; display: flex; gap: 4px; opacity: 0; animation: entra .3s 4.6s forwards; }
  .digitando i { width: 6px; height: 6px; border-radius: 50%; background: var(--suave); animation: pula 1s infinite; }
  .digitando i:nth-child(2) { animation-delay: .15s } .digitando i:nth-child(3) { animation-delay: .3s }
  @keyframes entra { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
  @keyframes pula { 0%, 60%, 100% { transform: none } 30% { transform: translateY(-4px) } }
  @media (prefers-reduced-motion: reduce) { .m, .digitando { animation: none; opacity: 1; } .digitando i { animation: none; } }

  /* Seções */
  section { padding: 72px 0; }
  .titulo { text-align: center; max-width: 640px; margin: 0 auto 40px; }
  .titulo .tag { display: inline-block; font-size: .78rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--verde); margin-bottom: 10px; }
  .titulo h2 { font-size: clamp(1.6rem, 3.4vw, 2.3rem); letter-spacing: -.02em; margin: 0 0 10px; color: var(--tinta); }
  .titulo p { color: var(--suave); line-height: 1.6; margin: 0; }
  .passos { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; counter-reset: passo; }
  .passo { background: var(--cartao); border: 1px solid var(--borda); border-radius: 20px; padding: 22px; position: relative; }
  .passo::before { counter-increment: passo; content: counter(passo); display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; background: var(--verde); color: #fff; font-weight: 800; margin-bottom: 14px; }
  .passo h3, .recurso h3 { margin: 0 0 6px; font-size: 1.02rem; color: var(--tinta); }
  .passo p, .recurso p { margin: 0; color: var(--suave); line-height: 1.55; font-size: .94rem; }
  .recursos { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .recurso { background: var(--cartao); border: 1px solid var(--borda); border-radius: 20px; padding: 22px; transition: transform .2s, box-shadow .2s; }
  .recurso:hover { transform: translateY(-3px); box-shadow: var(--sombra); }
  .recurso .ico { width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center; background: var(--verde-claro); color: var(--verde); margin-bottom: 14px; }
  .faixa { background: var(--cartao); border-top: 1px solid var(--borda); border-bottom: 1px solid var(--borda); }
  .seguro { display: grid; grid-template-columns: auto 1fr; gap: 20px; align-items: center; max-width: 820px; margin: 0 auto; }
  .seguro .ico { width: 64px; height: 64px; border-radius: 20px; display: grid; place-items: center; background: var(--verde); color: #fff; }
  .seguro .ico svg { width: 32px; height: 32px; }
  .seguro h2 { margin: 0 0 6px; color: var(--tinta); font-size: 1.4rem; }
  .seguro p { margin: 0; color: var(--suave); line-height: 1.6; }
  .faq { max-width: 760px; margin: 0 auto; display: grid; gap: 10px; }
  details { background: var(--cartao); border: 1px solid var(--borda); border-radius: 16px; padding: 4px 18px; }
  summary { cursor: pointer; font-weight: 700; padding: 14px 0; list-style: none; display: flex; justify-content: space-between; gap: 12px; color: var(--tinta); }
  summary::-webkit-details-marker { display: none; }
  summary::after { content: "+"; font-size: 1.3rem; line-height: 1; color: var(--verde); }
  details[open] summary::after { content: "–"; }
  details p { margin: 0 0 16px; color: var(--suave); line-height: 1.6; }
  .final { text-align: center; }
  .final a { display: inline-flex; gap: 10px; align-items: center; background: var(--verde); color: #fff; text-decoration: none; font-weight: 700; padding: 16px 26px; border-radius: 999px; box-shadow: 0 10px 24px -10px #16a34a; }
  footer { text-align: center; color: var(--suave); font-size: .85rem; padding: 0 16px 40px; }

  .canal + .canal { margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--borda); }
  .conectar h2 { display: flex; align-items: center; gap: 8px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
  .dot.wa { background: #25d366; }
  .dot.ig, .btn-ig, .qr-card.instagram .ico { background: linear-gradient(45deg, #f58529, #dd2a7b 55%, #8134af); }
  .btn-ig { color: #fff; box-shadow: 0 10px 24px -12px #dd2a7b; }
  .btn-ig .ico { background: #ffffff2e; }
  .btn-ig:hover { transform: translateY(-1px); filter: brightness(1.05); }
  .qrs { display: grid; grid-template-columns: repeat(2, minmax(0, 340px)); justify-content: center; gap: 20px; }
  .qr-card { background: var(--cartao); border: 1px solid var(--borda); border-radius: 24px; padding: 22px; text-align: center; box-shadow: var(--sombra); }
  .qr-topo { display: flex; gap: 12px; align-items: center; text-align: left; margin-bottom: 18px; }
  .qr-topo .ico { width: 44px; height: 44px; border-radius: 13px; display: grid; place-items: center; color: #fff; flex: none; }
  .qr-card.whatsapp .ico { background: #25d366; }
  .qr-topo h3 { margin: 0; color: var(--tinta); font-size: 1.05rem; }
  .qr-topo small { color: var(--suave); word-break: break-all; }
  .qr { background: #fff; border-radius: 18px; padding: 14px; border: 1px solid var(--borda); }
  .qr svg { display: block; width: 100%; height: auto; }
  .qr.vazio { aspect-ratio: 1; display: grid; place-content: center; justify-items: center; gap: 10px; background: transparent; border: 2px dashed var(--borda); color: var(--suave); font-weight: 600; padding: 24px; }
  .qr.vazio svg { width: 48px; height: 48px; opacity: .6; }
  .abrir { display: inline-block; margin-top: 14px; color: var(--verde); font-weight: 700; text-decoration: none; }
  .imprimir { text-align: center; margin-top: 24px; }
  .btn-imprimir { font: inherit; font-weight: 700; border: 1.5px solid var(--verde); color: var(--verde); background: transparent; padding: 12px 22px; border-radius: 999px; cursor: pointer; }
  @media print {
    body { background: #fff; }
    .hero, main > section:not(#qrcodes), footer, .imprimir, .abrir, #qrcodes .titulo p { display: none !important; }
    .qr-card { box-shadow: none; break-inside: avoid; }
  }
  @media (max-width: 960px) {
    .hero-grid { grid-template-columns: 1fr; gap: 40px; margin-top: 32px; }
    .celular { transform: none; width: 270px; }
    .tela { height: 470px; }
    .passos, .recursos { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 720px) { .qrs { grid-template-columns: minmax(0, 360px); } }
  @media (max-width: 560px) {
    .hero { padding-bottom: 48px; }
    .selo span { display: none; }
    .passos, .recursos { grid-template-columns: 1fr; }
    section { padding: 52px 0; }
    .seguro { grid-template-columns: 1fr; text-align: center; justify-items: center; }
  }
</style>
</head>
<body>
<header class="hero">
  <div class="wrap">
    <div class="nav"><span class="logo">${icon("balao")}</span>Atendente 24h <span class="selo">${icon("escudo")}<span>Conexão oficial da Meta</span></span></div>
    <div class="hero-grid">
      <div>
        <h1>Seu WhatsApp e Instagram atendendo <span>sozinhos</span>, 24 horas por dia.</h1>
        <p class="lead">Conecte as contas da sua empresa em poucos minutos. O robô responde seus clientes com carinho, tira dúvidas, anota pedidos e chama a sua equipe quando precisa.</p>
        <div class="conectar" id="conectar">
          ${o.whatsappConfigId ? `
          <div class="canal">
            <h2><span class="dot wa"></span>WhatsApp da empresa</h2>
            ${waAtual}
            <p>Escolha como o seu número está hoje:</p>
            <button id="btn-app" class="btn btn-principal"><span class="ico">${icon("qr")}</span><span><b>Conectar com QR Code</b><small>Meu número já está no app WhatsApp Business</small></span></button>
            <button id="btn-novo" class="btn btn-outro"><span class="ico">${icon("celular")}</span><span><b>Conectar número novo</b><small>Número que não está em nenhum app (confirma por SMS)</small></span></button>
          </div>` : ""}
          ${o.instagramConfigId ? `
          <div class="canal">
            <h2><span class="dot ig"></span>Instagram da empresa</h2>
            ${igAtual}
            <p>Conta profissional ligada a uma Página do Facebook.</p>
            <button id="btn-ig" class="btn btn-ig"><span class="ico">${icon("camera")}</span><span><b>Conectar Instagram</b><small>Entrar com o Facebook e autorizar a Página</small></span></button>
          </div>` : ""}
          <div id="status" role="status"></div>
        </div>
      </div>
      <div class="celular" aria-hidden="true">
        <div class="tela">
          <div class="tela-topo"><span class="avatar">${nome.slice(0, 1)}</span><div><b>${nome}</b><small>online</small></div></div>
          <div class="msgs">
            <div class="m out">Oi! Vocês abrem no domingo? 😊</div>
            <div class="m in">Oii, tudo bem? Aqui é a ${nome}! 💚</div>
            <div class="m in">Abrimos sim! Quer que eu já te passe os horários e os valores?</div>
            <div class="m out">Quero sim! E dá pra fazer festa aí?</div>
            <div class="m in">Dá simm! Me conta: é aniversário de quem? 🎉</div>
            <div class="m out">Da minha filha, vai fazer 5</div>
            <div class="digitando"><i></i><i></i><i></i></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</header>

<main>
  <section id="qrcodes">
    <div class="wrap">
      <div class="titulo"><span class="tag">Seus QR Codes</span><h2>Leve seus clientes direto para a conversa</h2><p>${temQr ? "Prontos para imprimir: o cliente aponta a câmera e já cai no seu WhatsApp ou no seu Direct, onde o robô atende." : "Assim que você conectar, aparecem aqui os QR Codes do seu WhatsApp e do seu Instagram, prontos para imprimir."}</p></div>
      <div class="qrs">
        ${qrCard("whatsapp", "WhatsApp", "balao", o.qr.whatsapp, "Conecte o WhatsApp acima")}
        ${qrCard("instagram", "Instagram", "camera", o.qr.instagram, "Conecte o Instagram acima")}
      </div>
      ${temQr ? `<div class="imprimir"><button class="btn-imprimir" onclick="window.print()">Imprimir os QR Codes</button></div>` : ""}
    </div>
  </section>

  <section id="como-funciona" class="faixa">
    <div class="wrap">
      <div class="titulo"><span class="tag">Como funciona</span><h2>Cinco passos e pronto</h2><p>Sem instalar nada, sem copiar código. Leva menos tempo que um café.</p></div>
      <div class="passos">
        ${STEPS.map(([t, d]) => `<div class="passo"><h3>${t}</h3><p>${d}</p></div>`).join("")}
      </div>
    </div>
  </section>

  <section>
    <div class="wrap">
      <div class="titulo"><span class="tag">O que o robô faz</span><h2>Um atendente que não tira folga</h2><p>Tudo o que a sua equipe faz no WhatsApp, só que a qualquer hora e sem deixar ninguém esperando.</p></div>
      <div class="recursos">
        ${FEATURES.map(([i, t, d]) => `<div class="recurso"><span class="ico">${icon(i)}</span><h3>${t}</h3><p>${d}</p></div>`).join("")}
      </div>
    </div>
  </section>

  <section class="faixa">
    <div class="wrap">
      <div class="seguro"><span class="ico">${icon("escudo")}</span><div><h2>Seguro de verdade</h2><p>A conexão é feita pelo login oficial da Meta, a dona do WhatsApp e do Instagram. Nada de WhatsApp Web "pirata", que pode bloquear o número. Você continua com os apps no celular, com todos os contatos e conversas.</p></div></div>
    </div>
  </section>

  <section>
    <div class="wrap">
      <div class="titulo"><span class="tag">Dúvidas</span><h2>Perguntas frequentes</h2></div>
      <div class="faq">
        ${FAQ.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}
      </div>
    </div>
  </section>

  <section class="final">
    <div class="wrap">
      <div class="titulo"><h2>Bora deixar o WhatsApp no automático?</h2></div>
      <a href="#conectar">${icon("qr")} Conectar agora</a>
    </div>
  </section>
</main>
<footer>Conexão pelo login oficial da Meta (WhatsApp Business Platform e Instagram).</footer>
<script>
  const cfg = ${settings};
  const status = document.getElementById("status");
  const botoes = [...document.querySelectorAll("#conectar button")];
  const mostrar = (texto, tipo) => { status.textContent = texto; status.className = tipo || ""; };
  const liberar = () => botoes.forEach((b) => b.disabled = false);
  let sessao = null, code = null, coexistencia = false, enviado = false;

  async function enviar(caminho, dados, ok) {
    const res = await fetch(caminho, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chave: cfg.key, ...dados }) });
    const r = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(r.erro || "erro " + res.status);
    mostrar(ok(r) + " Mostrando seus QR Codes...", "ok");
    setTimeout(() => location.reload(), 2500);
  }
  const falhou = (e) => { mostrar("Não deu certo: " + e.message + ". Tente de novo ou fale com quem te mandou o link.", "erro"); liberar(); };

  // A janela da Meta avisa aqui qual conta e número do WhatsApp o cliente escolheu.
  window.addEventListener("message", (ev) => {
    if (!/^https:\\/\\/([a-z0-9-]+\\.)*facebook\\.com$/.test(ev.origin)) return;
    let d; try { d = JSON.parse(ev.data); } catch { return; }
    if (d.type !== "WA_EMBEDDED_SIGNUP") return;
    if (d.event === "CANCEL") { mostrar("A conexão foi cancelada antes do fim. Pode tentar de novo.", "erro"); liberar(); return; }
    if (String(d.event).startsWith("FINISH")) { sessao = d.data || {}; terminarWhatsApp(); }
  });

  async function terminarWhatsApp() {
    if (!sessao || !code || enviado) return;
    enviado = true;
    mostrar("Quase lá, ligando o atendente no seu número...");
    try {
      await enviar("/conectar/finalizar", { code, waba_id: sessao.waba_id, phone_number_id: sessao.phone_number_id || null, coexistencia },
        (r) => "Pronto! " + (r.numero ? "O número " + r.numero + " está" : "Seu número está") + " ligado no atendente.");
    } catch (e) { enviado = false; falhou(e); }
  }

  function abrirMeta(configId, extras, aoVoltar) {
    if (!window.FB) return mostrar("A página da Meta ainda está carregando. Espere uns segundos e tente de novo.", "erro");
    botoes.forEach((b) => b.disabled = true);
    mostrar("Abrindo a janela da Meta...");
    FB.login(aoVoltar, { config_id: configId, response_type: "code", override_default_response_type: true, ...(extras ? { extras } : {}) });
  }

  function conectarWhatsApp(app) {
    coexistencia = app; sessao = null; code = null;
    abrirMeta(cfg.waConfigId, { setup: {}, featureType: app ? "whatsapp_business_app_onboarding" : "", sessionInfoVersion: "3" }, (resp) => {
      if (resp.authResponse && resp.authResponse.code) { code = resp.authResponse.code; terminarWhatsApp(); }
      else if (!sessao) { mostrar("A janela foi fechada antes do fim. Pode tentar de novo.", "erro"); liberar(); }
    });
  }

  function conectarInstagram() {
    abrirMeta(cfg.igConfigId, null, (resp) => {
      if (!resp.authResponse || !resp.authResponse.code) { mostrar("A janela foi fechada antes do fim. Pode tentar de novo.", "erro"); liberar(); return; }
      mostrar("Quase lá, ligando o atendente no seu Instagram...");
      enviar("/conectar/instagram", { code: resp.authResponse.code },
        (r) => "Pronto! " + (r.usuario ? "O @" + r.usuario + " está" : "Seu Instagram está") + " ligado no atendente.").catch(falhou);
    });
  }

  const ligar = (id, fn) => { const b = document.getElementById(id); if (b) b.onclick = fn; };
  ligar("btn-app", () => conectarWhatsApp(true));
  ligar("btn-novo", () => conectarWhatsApp(false));
  ligar("btn-ig", conectarInstagram);

  window.fbAsyncInit = () => FB.init({ appId: cfg.appId, autoLogAppEvents: true, xfbml: false, version: cfg.version });
</script>
<script async defer crossorigin="anonymous" src="https://connect.facebook.net/pt_BR/sdk.js"></script>
</body>
</html>`;
}
