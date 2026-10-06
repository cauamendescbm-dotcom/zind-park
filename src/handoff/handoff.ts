import { formatPrice, type PartyPackage } from "../agent/knowledge.js";
import type { StaffAlertKind, StaffNotifier } from "../channels/types.js";
import type { Lead, PartyData } from "../store/types.js";

/** Dados que o agente com IA precisa coletar antes de repassar a festa. */
export const REQUIRED_FIELDS: { key: keyof PartyData; label: string }[] = [
  { key: "customerName", label: "nome" },
  { key: "customerContact", label: "contato" },
  { key: "desiredDate", label: "data desejada" },
  { key: "desiredTime", label: "horário" },
  { key: "birthdayAge", label: "idade do aniversariante" },
  { key: "guests", label: "número de convidados" },
  { key: "space", label: "espaço" },
  { key: "theme", label: "tema" },
];

export function missingFields(lead: PartyData | null): string[] {
  return REQUIRED_FIELDS.filter((f) => !lead || lead[f.key] === null || lead[f.key] === "").map((f) => f.label);
}

const show = (v: string | number | null | undefined) => (v === null || v === undefined || v === "" ? "não informado" : String(v));

/** Mensagem que a organizadora recebe quando uma festa é repassada. */
export function formatLeadForOrganizer(lead: Lead, pkg: PartyPackage | undefined, channelLabel: string): string {
  const lines = [
    "🎉 Novo lead de festa (Zind)",
    "",
    `Cliente: ${show(lead.customerName)}`,
    `Contato: ${show(lead.customerContact)}`,
    `Data desejada: ${show(lead.desiredDate)}`,
    `Horário: ${show(lead.desiredTime)}`,
    `Aniversariante: ${show(lead.birthdayAge)}`,
    `Convidados: ${show(lead.guests)}`,
    `Espaço: ${show(lead.space)}`,
    `Tema: ${show(lead.theme)}`,
  ];
  if (pkg || lead.packageId) {
    lines.push(`Pacote: ${pkg?.name ?? lead.packageId}`, `Valor: ${formatPrice(pkg?.price)}`);
  }
  lines.push(`Canal: ${channelLabel}`, "", "O cliente já foi avisado que você vai entrar em contato.");
  return lines.join("\n");
}

/** Parâmetros na ordem do template `novo_lead_festa` (ver docs/templates-meta.md). */
export function leadTemplateParams(lead: Lead, pkg: PartyPackage | undefined): string[] {
  return [
    show(lead.customerName),
    show(lead.customerContact),
    show(lead.desiredDate),
    show(lead.desiredTime),
    show(lead.birthdayAge),
    show(lead.guests),
    show(lead.space),
    show(lead.theme),
    pkg ? `${pkg.name} (${formatPrice(pkg.price)})` : "a definir",
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
    "O cliente foi avisado que a equipe vai responder. Fale com ele direto, por favor.",
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
