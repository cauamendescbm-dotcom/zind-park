import { isCloseWord, levenshtein, maxTypos } from "./similarity.js";

/** Abreviações comuns em mensagens. */
const ABBREVIATIONS: Record<string, string> = {
  vc: "voce", vcs: "voces", voceis: "voces", q: "que", oq: "o que", pq: "porque", tb: "tambem", tbm: "tambem",
  td: "tudo", hj: "hoje", amnh: "amanha", qto: "quanto", qnto: "quanto", qt: "quanto", qdo: "quando", qnd: "quando",
  msm: "mesmo", pra: "para", pro: "para o", p: "para", fds: "fim de semana", sab: "sabado", dom: "domingo",
  niver: "aniversario", aniver: "aniversario", aniv: "aniversario", info: "informacao", infos: "informacoes",
  obg: "obrigado", obgd: "obrigado", vlw: "valeu", blz: "beleza", tmj: "tamo junto", dnv: "de novo",
  n: "nao", naum: "nao", s: "sim", ss: "sim", aki: "aqui", eh: "e", cmg: "comigo",
  hr: "hora", hrs: "horas", h: "hora", end: "endereco", dps: "depois", agr: "agora", oii: "oi", oie: "oi",
};

/** Plural simples → singular (aplicado igual na mensagem e nas palavras-chave). */
function singular(token: string): string {
  if (token.length > 4 && token.endsWith("oes")) return token.slice(0, -3) + "ao";
  if (token.length > 4 && /[rzls]es$/.test(token)) return token.slice(0, -2); // valores -> valor, meses -> mes
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

/**
 * Normaliza a mensagem: minúsculas, sem acento, sem pontuação, abreviações expandidas
 * e plural virando singular.
 *
 *   normalizeText("Meu filho é autista, tem desconto?") === "meu filho e autista tem desconto"
 */
export function normalizeText(text: string): string {
  const base = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/(\d)\s*h\b/g, "$1h") // 15 h -> 15h
    .replace(/[^a-z0-9/\s]/g, " ")
    .replace(/([a-z])\1{2,}/g, "$1$1") // "oiiii" -> "oii" (números ficam como estão)
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((t) => (ABBREVIATIONS[t] ?? t).split(" "))
    .map(singular)
    .join(" ");
  return base;
}

export function tokenize(normalized: string): string[] {
  return normalized.split(" ").filter(Boolean);
}

/**
 * Corrige erros simples de digitação: troca a palavra pela mais próxima do vocabulário
 * do bot (ex.: "horaio" -> "horario", "endereso" -> "endereco"). Números ficam como estão.
 */
export function correctTypos(tokens: string[], vocabulary: Set<string>): string[] {
  const vocab = [...vocabulary];
  return tokens.map((t) => {
    if (vocabulary.has(t) || /\d/.test(t) || maxTypos(t) === 0) return t;
    let best: { word: string; dist: number } | null = null;
    for (const v of vocab) {
      if (!isCloseWord(t, v)) continue;
      const dist = levenshtein(t, v);
      if (!best || dist < best.dist) best = { word: v, dist };
    }
    return best?.word ?? t;
  });
}
