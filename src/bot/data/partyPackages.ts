import { z } from "zod";

/**
 * Pacotes de festa. Ficam em knowledge/pacotes.json e só são preenchidos com o PDF oficial.
 * Enquanto a lista estiver vazia, o bot NÃO fala valores de festa (responde que estão sendo finalizados).
 * Pacote sem `price` (null) também não tem valor falado: o orçamento fica com a organizadora.
 */
export const partyPackageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.number().positive().nullable().default(null),
  description: z.string().default(""),
  includedFood: z.array(z.string()).default([]),
  decoration: z.array(z.string()).default([]),
  includedServices: z.array(z.string()).default([]),
  /** Máximo de convidados. */
  guests: z.number().int().positive(),
  /** Mínimo de convidados, quando o pacote é só para festas maiores. */
  minGuests: z.number().int().positive().optional(),
  space: z.string().default(""),
  additionalItems: z.array(z.string()).default([]),
  observations: z.array(z.string()).default([]),
});

export type PartyPackage = z.infer<typeof partyPackageSchema>;

export const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/\s/g, " ");

/** "Zind Classic: R$ 1.000,00, até 50 convidados, no Salão Deck" (sem valor quando o pacote não tem preço). */
function headline(p: PartyPackage): string {
  const guests = p.minGuests ? `de ${p.minGuests} a ${p.guests} convidados` : `até ${p.guests} convidados`;
  const parts = [p.price != null ? formatBRL(p.price) : null, guests, p.space || null].filter(Boolean);
  return `🎈 ${p.name}: ${parts.join(", ")}`;
}

/** Resumo de todos os pacotes (resposta de PACOTES_FESTA quando o PDF já foi cadastrado). */
export function describePackages(packages: PartyPackage[]): string {
  const lines = packages.map(headline);
  const budget = packages.some((p) => p.price == null)
    ? "\n\nO orçamento a nossa organizadora te passa certinho, de acordo com a sua festa. 💛"
    : "";
  return `Temos ${packages.length} opções de pacotes:\n\n${lines.join("\n")}${budget}\n\nQuer que eu te conte os detalhes de algum deles? 😊`;
}

/** Detalhes de um pacote (quando o cliente pergunta por um específico). */
export function describePackage(p: PartyPackage): string {
  const parts = [headline(p)];
  if (p.description) parts.push(p.description);
  const list = (title: string, items: string[]) => `${title}\n${items.map((i) => `• ${i}`).join("\n")}`;
  if (p.includedFood.length) parts.push(list("Comida:", p.includedFood));
  if (p.decoration.length) parts.push(list("Decoração:", p.decoration));
  if (p.includedServices.length) parts.push(list("Serviços:", p.includedServices));
  if (p.additionalItems.length) parts.push(list("Adicionais:", p.additionalItems));
  if (p.observations.length) parts.push(p.observations.join(" "));
  return parts.join("\n\n");
}
