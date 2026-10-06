/**
 * Regras de humanização que ficam no código (e não no modelo), para serem garantidas:
 * - no máximo 3 linhas por balão;
 * - tempo de "digitando" proporcional ao texto;
 * - errinho de digitação ocasional, corrigido no balão seguinte, nunca em dado importante.
 */

export type Rng = () => number;

/** Cerca de 3 linhas na tela do celular. */
export const MAX_CHARS_PER_BUBBLE = 180;
export const MAX_LINES_PER_BUBBLE = 3;

export function splitIntoBubbles(
  text: string,
  maxChars = MAX_CHARS_PER_BUBBLE,
  maxLines = MAX_LINES_PER_BUBBLE,
): string[] {
  const chunks = text
    .replace(/\r/g, "")
    .split(/\n\s*-{3,}\s*\n|\n\s*\n/)
    .map((c) => c.trim())
    .filter(Boolean);

  const bubbles: string[] = [];
  for (const chunk of chunks) {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    let current: string[] = [];
    const flush = () => {
      if (current.length) bubbles.push(current.join("\n"));
      current = [];
    };
    for (const line of lines) {
      for (const piece of splitLongLine(line, maxChars)) {
        const candidate = [...current, piece];
        if (candidate.length > maxLines || candidate.join("\n").length > maxChars) flush();
        current.push(piece);
      }
    }
    flush();
  }
  return bubbles;
}

/** Quebra uma linha longa por frases, depois por vírgulas e, se ainda precisar, por palavras. */
function splitLongLine(line: string, maxChars: number): string[] {
  if (line.length <= maxChars) return [line];
  const sentences = line
    .split(/(?<=[.!?…])\s+/)
    .flatMap((s) => (s.length > maxChars ? s.split(/(?<=,)\s+/) : [s]));
  const out: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    for (const part of sentence.length > maxChars ? splitByWords(sentence, maxChars) : [sentence]) {
      if (current && (current + " " + part).length > maxChars) {
        out.push(current);
        current = part;
      } else {
        current = current ? current + " " + part : part;
      }
    }
  }
  if (current) out.push(current);
  return out;
}

function splitByWords(text: string, maxChars: number): string[] {
  const out: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    if (current && (current + " " + word).length > maxChars) {
      out.push(current);
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current) out.push(current);
  return out;
}

/** Tempo de "digitando" antes de cada balão: ~1,5s a 7s, com variação. */
export function typingDelayMs(text: string, rng: Rng = Math.random): number {
  const base = 1200 + text.length * 35;
  const jitter = 0.8 + rng() * 0.4;
  return Math.round(Math.min(7000, Math.max(1500, base * jitter)));
}

/** Palavras que nunca recebem errinho, mesmo sem número por perto. */
const PROTECTED_WORDS = new Set([
  "janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto",
  "setembro", "outubro", "novembro", "dezembro",
  "segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo",
  "feira", "reais", "real", "horas", "hora", "minutos", "pacote", "pacotes",
  "convidados", "endereço", "ingresso", "ingressos", "valor", "preço",
  "manhã", "tarde", "noite", "hoje", "amanhã", "zind",
]);

/** Balões com dados importantes nunca recebem errinho. */
function bubbleIsSafeForTypo(bubble: string): boolean {
  if (/\d/.test(bubble)) return false; // preços, datas, horários, telefones
  if (/R\$|@|https?:|www\.|\.com/i.test(bubble)) return false;
  return true;
}

function candidateWords(bubble: string, extraProtected: Set<string>): string[] {
  const words = bubble.match(/\p{L}+/gu) ?? [];
  return words.filter((w) => {
    if (w.length < 5) return false;
    if (w !== w.toLowerCase()) return false; // nomes próprios e início de frase
    const lower = w.toLowerCase();
    return !PROTECTED_WORDS.has(lower) && !extraProtected.has(lower);
  });
}

/** Troca duas letras vizinhas do meio da palavra (ex.: festa -> fetsa). */
export function makeTypo(word: string, rng: Rng = Math.random): string | null {
  const positions: number[] = [];
  for (let i = 1; i < word.length - 1; i++) {
    if (word[i] !== word[i + 1]) positions.push(i);
  }
  if (positions.length === 0) return null;
  const i = positions[Math.floor(rng() * positions.length)];
  return word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2);
}

export interface OutgoingBubble {
  /** Texto enviado ao cliente. */
  text: string;
  /** O que o agente quis dizer (difere de `text` só no balão com errinho). */
  intended: string;
  isTypoFix: boolean;
}

export interface TypoResult {
  bubbles: OutgoingBubble[];
  typo: { original: string; wrong: string } | null;
}

/**
 * Talvez coloca um errinho em um dos balões e adiciona a correção ("*festa") logo depois.
 * `rate` é a chance por balão elegível (padrão ~1 a cada 15).
 */
export function maybeAddTypo(
  bubbles: string[],
  opts: { enabled: boolean; rate: number; rng?: Rng; protectedWords?: string[] },
): TypoResult {
  const rng = opts.rng ?? Math.random;
  const plain = bubbles.map((b) => ({ text: b, intended: b, isTypoFix: false }));
  if (!opts.enabled || opts.rate <= 0) return { bubbles: plain, typo: null };

  const extra = new Set((opts.protectedWords ?? []).map((w) => w.toLowerCase()));
  for (let b = 0; b < bubbles.length; b++) {
    if (rng() >= opts.rate) continue;
    const bubble = bubbles[b];
    if (!bubbleIsSafeForTypo(bubble)) continue;
    const words = candidateWords(bubble, extra);
    if (words.length === 0) continue;
    const original = words[Math.floor(rng() * words.length)];
    const wrong = makeTypo(original, rng);
    if (!wrong) continue;

    const re = new RegExp(`(?<!\\p{L})${original}(?!\\p{L})`, "u");
    const out = [...plain];
    out[b] = { text: bubble.replace(re, wrong), intended: bubble, isTypoFix: false };
    out.splice(b + 1, 0, { text: `*${original}`, intended: "", isTypoFix: true });
    return { bubbles: out, typo: { original, wrong } };
  }
  return { bubbles: plain, typo: null };
}
