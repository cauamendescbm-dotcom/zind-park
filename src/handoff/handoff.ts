import { formatPrice, type PartyPackage } from "../agent/knowledge.js";
import type { StaffAlertKind, StaffNotifier } from "../channels/types.js";
import type { Lead, PartyData } from "../store/types.js";

export const REQUIRED_FIELDS: { key: keyof PartyData; label: string }[] = [
  { key: "customerName", label: "nome" },
  { key: "customerContact", label: "contato" },
  { key: "desiredDate", label: "data desejada" },
  { key: "guests", label: "número de convidados" },
  { key: "theme", label: "tema" },
  { key: "packageId", label: "pacote" },
];

export function missingFields(lead: PartyData | null): string[] {
  return REQUIRED_FIELDS.filter((f) => !lead || lead[f.key] === null || lead[f.key] === "").map((f) => f.label);
}

/** Mensagem que a organizadora recebe quando uma festa é repassada. */
export function formatLeadForOrganizer(lead: Lead, pkg: PartyPackage | undefined, channelLabel: string): string {
  return [
    "🎉 Novo lead de festa (Zind)",
    "",
    `Cliente: ${lead.customerName}`,
    `Contato: ${lead.customerContact}`,
    `Data desejada: ${lead.desiredDate}`,
    `Convidados: ${lead.guests}`,
    `Tema: ${lead.theme}`,
    `Pacote: ${pkg?.nome ?? lead.packageId}`,
    `Valor: ${formatPrice(pkg?.valor ?? null)}`,
    `Canal: ${channelLabel}`,
    "",
    "O agente já avisou o cliente que você vai entrar em contato.",
  ].join("\n");
}

/** Parâmetros na ordem do template `novo_lead_festa` (ver docs/templates-meta.md). */
export function leadTemplateParams(lead: Lead, pkg: PartyPackage | undefined): string[] {
  return [
    String(lead.customerName),
    String(lead.customerContact),
    String(lead.desiredDate),
    String(lead.guests),
    String(lead.theme),
    pkg?.nome ?? String(lead.packageId),
    formatPrice(pkg?.valor ?? null),
  ];
}

export function formatHumanRequest(reason: string, customerName: string | null, contact: string): string {
  return [
    "❓ Cliente precisa de ajuda (Zind)",
    "",
    `Cliente: ${customerName ?? "sem nome"}`,
    `Contato: ${contact}`,
    `Motivo: ${reason}`,
    "",
    "O agente disse que vai confirmar e retornar. Responda o cliente direto, por favor.",
  ].join("\n");
}

export function humanRequestTemplateParams(reason: string, customerName: string | null, contact: string): string[] {
  return [customerName ?? "sem nome", contact, reason];
}

export async function notifySafely(
  notifier: StaffNotifier,
  kind: StaffAlertKind,
  message: string,
  params: string[],
) {
  try {
    await notifier.notifyOrganizer(kind, message, params);
    return true;
  } catch (err) {
    console.error("[handoff] falha ao avisar a organizadora:", err);
    return false;
  }
}
