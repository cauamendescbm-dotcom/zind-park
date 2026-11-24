/**
 * Página inicial (/): site simples do parque, com os dados públicos da empresa.
 * A Meta confere esse site na verificação da empresa. Não coloque dados pessoais (CPF, sócios) aqui.
 */
import { parkConfig } from "./bot/data/parkConfig.js";

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function sitePage(park = parkConfig): string {
  const { legal, openingHours } = park;
  const e = escape;
  const tel = legal.phone.replace(/[^\d+]/g, "");
  const mapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(park.addressFull)}`;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(legal.tradeName)} - Parque infantil em Balneário Camboriú</title>
<meta name="description" content="${e(legal.tradeName)}: parque infantil e festas em Balneário Camboriú, SC. Endereço, horários e contato.">
<style>
  body { margin: 0; font-family: system-ui, sans-serif; line-height: 1.6; color: #23303d; background: #fff; }
  header { background: #12505b; color: #fff; padding: 56px 16px; }
  header div, main, footer div { max-width: 720px; margin: 0 auto; }
  h1 { font-size: 2.4rem; line-height: 1.1; margin: 0 0 12px; } h2 { font-size: 1.2rem; margin: 32px 0 8px; }
  header p { margin: 0; font-size: 1.1rem; }
  main { padding: 8px 16px 40px; }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 4px 20px; margin: 0; } dt { font-weight: 600; } dd { margin: 0; }
  a { color: #12505b; overflow-wrap: anywhere; }
  footer { background: #eef4f4; padding: 24px 16px; font-size: .9rem; }
  footer p { margin: 0 0 4px; }
</style>
</head>
<body>
<header><div>
<h1>${e(legal.tradeName)}</h1>
<p>Parque infantil e espaço para festas em Balneário Camboriú.</p>
</div></header>
<main>
<h2>Horários</h2>
<dl>
<dt>Segunda</dt><dd>${e(openingHours.monday)}</dd>
<dt>Terça a sexta</dt><dd>${e(openingHours.tuesdayToFriday)}</dd>
<dt>Sábado e domingo</dt><dd>${e(openingHours.saturdaySunday)}</dd>
</dl>
<h2>Onde fica</h2>
<p>${e(park.addressFull)}<br><a href="${e(mapa)}">Ver no mapa</a></p>
<h2>Contato</h2>
<p>Telefone: <a href="tel:${e(tel)}">${e(legal.phone)}</a><br>
Email: <a href="mailto:${e(legal.email)}">${e(legal.email)}</a></p>
</main>
<footer><div>
<p><strong>${e(legal.companyName)}</strong> - CNPJ ${e(legal.cnpj)}</p>
<p>${e(legal.registeredAddress)}</p>
<p><a href="/privacidade">Política de privacidade</a></p>
</div></footer>
</body>
</html>
`;
}
