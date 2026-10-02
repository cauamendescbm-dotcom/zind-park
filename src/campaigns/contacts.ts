import type { ImportedContact } from "../store/types.js";

/** Normaliza telefone brasileiro para o formato do WhatsApp (ex.: 5541999999999). */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) return digits;
  return null;
}

const TRUE_VALUES = new Set(["sim", "s", "yes", "y", "true", "1", "x"]);

function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') (cur += '"'), i++;
      else quoted = !quoted;
    } else if (ch === sep && !quoted) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/**
 * Lê um CSV com cabeçalho: telefone, nome, tags, opt_in
 * (vírgula ou ponto e vírgula; tags separadas por "|"). Só `telefone` é obrigatório.
 */
export function parseContactsCsv(csv: string, source: string): { contacts: ImportedContact[]; invalid: string[] } {
  const lines = csv.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { contacts: [], invalid: [] };
  const sep = lines[0].includes(";") ? ";" : ",";
  const header = splitLine(lines[0], sep).map((h) => h.toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const iPhone = col("telefone");
  if (iPhone < 0) throw new Error('O CSV precisa de uma coluna "telefone"');

  const contacts: ImportedContact[] = [];
  const invalid: string[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitLine(line, sep);
    const phone = normalizePhone(cells[iPhone] ?? "");
    if (!phone) {
      invalid.push(cells[iPhone] ?? line);
      continue;
    }
    const get = (name: string) => (col(name) >= 0 ? (cells[col(name)] ?? "").trim() : "");
    contacts.push({
      whatsappId: phone,
      name: get("nome") || null,
      tags: get("tags").split("|").map((t) => t.trim().toLowerCase()).filter(Boolean),
      optIn: col("opt_in") < 0 ? false : TRUE_VALUES.has(get("opt_in").toLowerCase()),
      optInSource: source,
    });
  }
  return { contacts, invalid };
}
