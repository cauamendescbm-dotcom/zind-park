import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

const packageSchema = z.object({
  id: z.string(),
  nome: z.string(),
  valor: z.number().nullable(),
  resumo: z.string().default(""),
});
export type PartyPackage = z.infer<typeof packageSchema>;

export interface Knowledge {
  /** Texto de todos os .md/.txt de /knowledge, já concatenado. */
  text: string;
  packages: PartyPackage[];
  /** Quantos [PREENCHER] ainda existem (só para aviso no log). */
  missingCount: number;
  warnings: string[];
}

export function loadKnowledge(dir: string): Knowledge {
  const warnings: string[] = [];
  if (!existsSync(dir)) {
    return { text: "", packages: [], missingCount: 0, warnings: [`Pasta ${dir} não existe`] };
  }
  const files = readdirSync(dir).sort();
  const parts: string[] = [];
  for (const file of files) {
    if (file.toLowerCase() === "readme.md") continue;
    if (!/\.(md|txt)$/i.test(file)) continue;
    const content = readFileSync(path.join(dir, file), "utf8").trim();
    parts.push(`<arquivo nome="${file}">\n${content}\n</arquivo>`);
  }

  for (const pdf of files.filter((f) => /\.pdf$/i.test(f))) {
    const md = pdf.replace(/\.pdf$/i, ".md");
    if (!files.includes(md)) {
      warnings.push(`${pdf} ainda não foi convertido para ${md}; o agente não lê PDF direto`);
    }
  }

  let packages: PartyPackage[] = [];
  const pkgFile = path.join(dir, "pacotes.json");
  if (existsSync(pkgFile)) {
    packages = z.array(packageSchema).parse(JSON.parse(readFileSync(pkgFile, "utf8")));
    const lines = packages.map(
      (p) => `- ${p.id}: ${p.nome}, valor ${formatPrice(p.valor)}. ${p.resumo}`,
    );
    parts.push(`<arquivo nome="pacotes.json">\n${lines.join("\n")}\n</arquivo>`);
  } else {
    warnings.push("pacotes.json não encontrado");
  }

  const text = parts.join("\n\n");
  const missingCount = (text.match(/\[PREENCHER/g) ?? []).length;
  if (missingCount > 0) warnings.push(`${missingCount} campos [PREENCHER] ainda vazios em /knowledge`);
  return { text, packages, missingCount, warnings };
}

export function formatPrice(valor: number | null): string {
  if (valor === null) return "[PREENCHER]";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
