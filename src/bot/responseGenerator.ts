import { renderTemplate } from "./data/parkConfig.js";
import { describePackages, type PartyPackage } from "./data/partyPackages.js";
import type { Intent } from "./types.js";

export interface RenderOptions {
  /** Usa a versão curta (pergunta simples ou assunto já explicado). */
  short: boolean;
  partyFlow: boolean;
  whatsappLink: string;
  packages: PartyPackage[];
}

/** Monta o texto da resposta de uma intenção, com os dados do parkConfig. */
export function renderIntent(intent: Intent, o: RenderOptions): string {
  const vars = { linkWhatsapp: o.whatsappLink };
  if (intent.id === "PACOTES_FESTA" && o.packages.length && o.partyFlow) {
    return describePackages(o.packages);
  }
  let template = intent.response;
  if (!o.partyFlow && intent.responseWithoutPartyFlow) template = intent.responseWithoutPartyFlow;
  else if (o.short && intent.shortResponse) template = intent.shortResponse;
  return renderTemplate(template, vars);
}

export const render = (text: string, whatsappLink: string) => renderTemplate(text, { linkWhatsapp: whatsappLink });
