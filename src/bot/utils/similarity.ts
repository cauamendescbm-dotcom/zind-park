/** Distância de edição (Levenshtein): quantas letras trocar/inserir/apagar para ir de a até b. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Erro de digitação tolerado: 1 letra em palavras de 5 a 7 letras, 2 a partir de 8.
 * Palavras curtas só valem exatas ("mesa" não pode virar "meia").
 */
export function maxTypos(word: string): number {
  if (word.length >= 8) return 2;
  if (word.length >= 5) return 1;
  return 0;
}

export function isCloseWord(a: string, b: string): boolean {
  if (a === b) return true;
  const limit = Math.min(maxTypos(a), maxTypos(b));
  if (limit === 0 || Math.abs(a.length - b.length) > limit) return false;
  return levenshtein(a, b) <= limit;
}

/** Parecido entre duas listas de palavras (0 a 1), ignorando a ordem. */
export function tokenOverlap(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  const shared = [...new Set(a)].filter((t) => setB.has(t)).length;
  return shared / new Set([...a, ...b]).size;
}
