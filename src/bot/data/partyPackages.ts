import { z } from "zod";

/**
 * Pacotes de festa. Ficam em knowledge/pacotes.json e só são preenchidos com o PDF oficial.
 * Enquanto a lista estiver vazia, o bot NÃO fala valores de festa (responde que estão sendo finalizados).
 */
export const partyPackageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.number().positive(),
  description: z.string().default(""),
  includedFood: z.array(z.string()).default([]),
  decoration: z.array(z.string()).default([]),
  includedServices: z.array(z.string()).default([]),
  guests: z.number().int().positive(),
  additionalItems: z.array(z.string()).default([]),
  observations: z.array(z.string()).default([]),
});

export type PartyPackage = z.infer<typeof partyPackageSchema>;

export const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/\s/g, " ");

/** Resumo de todos os pacotes (resposta de PACOTES_FESTA quando o PDF já foi cadastrado). */
export function describePackages(packages: PartyPackage[]): string {
  const lines = packages.map((p) => `🎈 ${p.name}: ${formatBRL(p.price)}, até ${p.guests} convidados`);
  return `Temos ${packages.length} opções de pacotes:\n\n${lines.join("\n")}\n\nQuer que eu te conte os detalhes de algum deles? 😊`;
}

/** Detalhes de um pacote (quando o cliente pergunta por um específico). */
export function describePackage(p: PartyPackage): string {
  const parts = [`🎈 ${p.name}: ${formatBRL(p.price)}, até ${p.guests} convidados`];
  if (p.description) parts.push(p.description);
  if (p.includedFood.length) parts.push(`Comida: ${p.includedFood.join(", ")}`);
  if (p.decoration.length) parts.push(`Decoração: ${p.decoration.join(", ")}`);
  if (p.includedServices.length) parts.push(`Serviços: ${p.includedServices.join(", ")}`);
  if (p.additionalItems.length) parts.push(`Adicionais: ${p.additionalItems.join(", ")}`);
  if (p.observations.length) parts.push(`Observações: ${p.observations.join(" ")}`);
  return parts.join("\n\n");
}
