import { timingSafeEqual } from "node:crypto";

/**
 * Página /conectar: o cliente liga o WhatsApp dele no robô pelo cadastro oficial da Meta
 * (Embedded Signup). Nada de QR Code de WhatsApp Web, que não é oficial e pode banir o número.
 * Se o número já está no app WhatsApp Business, a própria Meta mostra um QR Code para escanear no app.
 */
export interface ConnectPageOptions {
  appId: string;
  configId: string;
  apiVersion: string;
  /** A chave do link, devolvida ao servidor junto com o resultado. */
  key: string;
  /** Número que já está ligado, para mostrar na página. */
  connected: { displayPhone: string | null; verifiedName: string | null } | null;
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

export function renderConnectPage(o: ConnectPageOptions): string {
  const atual = o.connected
    ? `<p class="atual">Conectado agora: <b>${esc(o.connected.verifiedName ?? "")} ${esc(o.connected.displayPhone ?? "")}</b>.<br>Conectar de novo troca pelo número novo.</p>`
    : "";
  const settings = JSON.stringify({ appId: o.appId, configId: o.configId, version: o.apiVersion, key: o.key }).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Conectar WhatsApp</title>
<style>
  :root { --verde: #1fa855; --texto: #1d2420; --suave: #5b6660; --fundo: #f4f7f5; --cartao: #fff; --borda: #dfe6e2; }
  @media (prefers-color-scheme: dark) {
    :root { --texto: #e8eeea; --suave: #a3b0a8; --fundo: #121614; --cartao: #1b211e; --borda: #2c3530; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: var(--fundo); color: var(--texto); }
  main { max-width: 520px; margin: 0 auto; padding: 32px 16px 48px; }
  h1 { font-size: 1.6rem; margin: 0 0 8px; }
  p { line-height: 1.5; color: var(--suave); }
  .cartao { background: var(--cartao); border: 1px solid var(--borda); border-radius: 16px; padding: 20px; margin-top: 16px; }
  .cartao h2 { font-size: 1.05rem; margin: 0 0 6px; }
  .cartao p { margin: 0 0 14px; }
  button { width: 100%; border: 0; border-radius: 12px; padding: 14px; font-size: 1rem; font-weight: 600; cursor: pointer; background: var(--verde); color: #fff; }
  button.secundario { background: transparent; color: var(--verde); border: 2px solid var(--verde); }
  button:disabled { opacity: .5; cursor: wait; }
  ol { padding-left: 20px; color: var(--suave); line-height: 1.6; }
  .atual { background: var(--cartao); border: 1px solid var(--borda); border-radius: 12px; padding: 12px 14px; }
  #status { margin-top: 20px; font-weight: 600; min-height: 1.5em; }
  #status.ok { color: var(--verde); }
  #status.erro { color: #d64545; }
</style>
</head>
<body>
<main>
  <h1>Conectar seu WhatsApp</h1>
  <p>Ligue o seu número no atendente automático. É pelo cadastro oficial da Meta, então o número fica seguro.</p>
  ${atual}

  <div class="cartao">
    <h2>Meu número já está no app WhatsApp Business</h2>
    <p>Você continua usando o app normalmente. No fim, a Meta mostra um QR Code: abra o WhatsApp Business no celular e escaneie.</p>
    <button id="btn-app">Conectar com QR Code</button>
  </div>

  <div class="cartao">
    <h2>Número novo, que não está em nenhum app</h2>
    <p>A Meta manda um código por SMS ou ligação para confirmar o número.</p>
    <button id="btn-novo" class="secundario">Conectar número novo</button>
  </div>

  <div id="status" role="status"></div>

  <div class="cartao">
    <h2>Como funciona</h2>
    <ol>
      <li>Clique no botão e entre com o seu Facebook.</li>
      <li>Escolha (ou crie) a sua empresa e o número do WhatsApp.</li>
      <li>Siga as telas da Meta até o fim, sem fechar a janela.</li>
      <li>Pronto: o atendente começa a responder nesse número.</li>
    </ol>
  </div>
</main>
<script>
  const cfg = ${settings};
  const status = document.getElementById("status");
  const botoes = [document.getElementById("btn-app"), document.getElementById("btn-novo")];
  const mostrar = (texto, tipo) => { status.textContent = texto; status.className = tipo || ""; };
  let sessao = null, code = null, coexistencia = false, enviado = false;

  // A janela da Meta avisa aqui qual conta e número o cliente escolheu.
  window.addEventListener("message", (ev) => {
    if (!/^https:\\/\\/([a-z0-9-]+\\.)*facebook\\.com$/.test(ev.origin)) return;
    let d; try { d = JSON.parse(ev.data); } catch { return; }
    if (d.type !== "WA_EMBEDDED_SIGNUP") return;
    if (d.event === "CANCEL") { mostrar("A conexão foi cancelada antes do fim. Pode tentar de novo.", "erro"); botoes.forEach((b) => b.disabled = false); return; }
    if (String(d.event).startsWith("FINISH")) { sessao = d.data || {}; terminar(); }
  });

  async function terminar() {
    if (!sessao || !code || enviado) return;
    enviado = true;
    mostrar("Quase lá, ligando o atendente no seu número...");
    try {
      const res = await fetch("/conectar/finalizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chave: cfg.key, code, waba_id: sessao.waba_id, phone_number_id: sessao.phone_number_id || null, coexistencia }),
      });
      const r = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(r.erro || "erro " + res.status);
      mostrar("Pronto! " + (r.numero ? "O número " + r.numero + " está" : "Seu número está") + " ligado no atendente. Pode fechar esta página.", "ok");
    } catch (e) {
      enviado = false;
      mostrar("Não deu certo: " + e.message + ". Tente de novo ou fale com quem te mandou o link.", "erro");
      botoes.forEach((b) => b.disabled = false);
    }
  }

  function conectar(app) {
    if (!window.FB) return mostrar("A página da Meta ainda está carregando. Espere uns segundos e tente de novo.", "erro");
    coexistencia = app; sessao = null; code = null;
    botoes.forEach((b) => b.disabled = true);
    mostrar("Abrindo a janela da Meta...");
    FB.login((resp) => {
      if (resp.authResponse && resp.authResponse.code) { code = resp.authResponse.code; terminar(); }
      else if (!sessao) { mostrar("A janela foi fechada antes do fim. Pode tentar de novo.", "erro"); botoes.forEach((b) => b.disabled = false); }
    }, {
      config_id: cfg.configId,
      response_type: "code",
      override_default_response_type: true,
      extras: { setup: {}, featureType: app ? "whatsapp_business_app_onboarding" : "", sessionInfoVersion: "3" },
    });
  }
  botoes[0].onclick = () => conectar(true);
  botoes[1].onclick = () => conectar(false);

  window.fbAsyncInit = () => FB.init({ appId: cfg.appId, autoLogAppEvents: true, xfbml: false, version: cfg.version });
</script>
<script async defer crossorigin="anonymous" src="https://connect.facebook.net/pt_BR/sdk.js"></script>
</body>
</html>`;
}
