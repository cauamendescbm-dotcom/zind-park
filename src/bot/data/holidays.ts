import { z } from "zod";
import { normalizeText, tokenize } from "../utils/normalizeText.js";

/**
 * Feriados com o horário que a Zind definiu (`knowledge/feriados.json`).
 * Servem para o atendimento responder "abre no feriado?" e para o disparo de aviso (`npm run disparo-feriado`).
 */
export const holidaySchema = z.object({
  /** AAAA-MM-DD */
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data no formato AAAA-MM-DD"),
  nome: z.string().min(1),
  /** "das 10h às 22h" ou "fechado" */
  horario: z.string().min(1),
});
export type Holiday = z.infer<typeof holidaySchema>;

export const isClosed = (h: Holiday) => /^fechad/i.test(h.horario.trim());

/** "12/10" */
export const shortDate = (h: Holiday) => `${h.data.slice(8, 10)}/${h.data.slice(5, 7)}`;

/** "vamos abrir das 10h às 22h" ou "o parque vai estar fechado" */
export const holidayHours = (h: Holiday) => (isClosed(h) ? "o parque vai estar fechado" : `vamos abrir ${h.horario.trim()}`);

/** Uma linha: "No dia 12/10 (Dia das Crianças), vamos abrir das 10h às 22h." */
export const holidayLine = (h: Holiday) => `No dia ${shortDate(h)} (${h.nome}), ${holidayHours(h)}.`;

/** Mensagem do disparo (Instagram). `{{nome}}` vira o primeiro nome do cliente. */
export const holidayMessage = (h: Holiday) =>
  `Oi, {{nome}}! 💛\n${holidayLine(h)}${isClosed(h) ? "" : " 🎉"}\nQualquer dúvida, é só responder esta mensagem.`;

/** Variáveis do template `aviso_feriado` do WhatsApp (ver docs/templates-meta.md). */
export const holidayTemplateParams = (h: Holiday) => ["{{nome}}", shortDate(h), h.nome, holidayHours(h)];

/** Data de hoje em Balneário Camboriú (AAAA-MM-DD). */
export const todayInBrazil = (now: Date) => now.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

/** Feriados de hoje em diante, em ordem. */
export const upcomingHolidays = (list: Holiday[], now: Date) =>
  list.filter((h) => h.data >= todayInBrazil(now)).sort((a, b) => a.data.localeCompare(b.data));

/**
 * Resposta para quem pergunta de feriado, só com o que está cadastrado.
 * Retorna null se a mensagem não fala de um feriado cadastrado (aí vale a resposta de sempre).
 */
export function holidayAnswer(tokens: string[], upcoming: Holiday[]): string | null {
  if (!upcoming.length) return null;
  const text = ` ${tokens.join(" ")} `;
  const named = upcoming.filter((h) => {
    const name = tokenize(normalizeText(h.nome)).join(" ");
    const [, m, d] = h.data.split("-").map(Number);
    return text.includes(` ${name} `) || new RegExp(` (dia )?0?${d} ?(\\/|de )(0?${m}|${MONTHS[m - 1]}) `).test(text);
  });
  if (named.length) return named.map(holidayLine).join("\n");
  if (!tokens.includes("feriado")) return null;
  return `Nos próximos feriados funciona assim: 😊\n${upcoming.slice(0, 3).map(holidayLine).join("\n")}`;
}

const MONTHS = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
