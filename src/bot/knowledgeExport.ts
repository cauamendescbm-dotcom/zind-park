import { replies } from "./data/faq.js";
import { renderTemplate } from "./data/parkConfig.js";
import { allIntents } from "./intents/index.js";

/**
 * As respostas oficiais em texto, para o agente com IA (modo híbrido) usar as mesmas
 * informações do bot. Assim existe uma fonte só: os arquivos de src/bot.
 */
export function officialAnswersText(): string {
  const blocks = allIntents
    .filter((i) => i.scope !== "geral")
    .map((i) => `## ${i.description}\n${renderTemplate(i.response, { linkWhatsapp: "(link do WhatsApp)" })}`);
  return [
    "Respostas oficiais da Zind. Use estas informações e este jeito de falar. Não existe nenhuma outra informação oficial além destas e dos outros arquivos.",
    ...blocks,
    `## Quando não houver a informação\n${replies.missingInfo}`,
  ].join("\n\n");
}
