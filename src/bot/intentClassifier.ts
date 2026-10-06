import { synonyms as synonymGroups } from "./data/synonyms.js";
import type { Classification, Intent, IntentScope, IntentScore } from "./types.js";
import { correctTypos, normalizeText, tokenize } from "./utils/normalizeText.js";
import { tokenOverlap } from "./utils/similarity.js";
import { contentTokens } from "./utils/stopwords.js";

/** Pontos do score (seção 23 da especificação). */
export const SCORE = { keyword: 5, synonym: 3, example: 2, partial: 1, negative: -5, topic: 2 } as const;
/** Abaixo disso o bot não tem confiança: vai para o fallback. Um sinônimo sozinho já basta. */
export const MIN_SCORE = 3;
/** Diferença menor que esta entre as duas primeiras intenções: o bot pergunta. */
export const AMBIGUITY_GAP = 2;
const EXAMPLE_SIMILARITY = 0.5;

interface CompiledIntent {
  intent: Intent;
  keywords: string[][];
  synonymGroups: string[][][];
  examples: string[][];
  negatives: string[][];
}

export interface ClassifyContext {
  /** Assunto atual da conversa: mensagens curtas puxam para ele. */
  topic?: IntentScope | null;
}

export interface ClassificationDetail extends Classification {
  normalized: string;
  tokens: string[];
  greeting: boolean;
}

const phrase = (text: string) => tokenize(normalizeText(text));

/** Posição da frase dentro da mensagem (palavras inteiras), ou -1. */
function findPhrase(tokens: string[], p: string[]): number {
  if (!p.length || p.length > tokens.length) return -1;
  outer: for (let i = 0; i <= tokens.length - p.length; i++) {
    for (let j = 0; j < p.length; j++) if (tokens[i + j] !== p[j]) continue outer;
    return i;
  }
  return -1;
}

export const containsPhrase = (tokens: string[], text: string) => findPhrase(tokens, phrase(text)) >= 0;

export class IntentClassifier {
  private compiled: CompiledIntent[];
  readonly vocabulary: Set<string>;

  /** `extraVocabulary`: palavras que a correção de digitação não pode trocar (ex.: "fechar" não vira "fecha"). */
  constructor(intents: Intent[], extraVocabulary: string[] = []) {
    for (const i of intents) {
      for (const g of i.synonyms) if (!synonymGroups[g]) throw new Error(`Intenção ${i.id}: grupo de sinônimos "${g}" não existe`);
    }
    this.compiled = intents.map((intent) => ({
      intent,
      keywords: intent.keywords.map(phrase).filter((p) => p.length),
      synonymGroups: intent.synonyms.map((g) => synonymGroups[g].map(phrase).filter((p) => p.length)),
      examples: intent.examples.map((e) => contentTokens(phrase(e))),
      negatives: (intent.negativeKeywords ?? []).map(phrase),
    }));
    this.vocabulary = new Set(
      this.compiled.flatMap((c) => [
        ...c.keywords.flat(),
        ...c.synonymGroups.flat(2),
        ...c.examples.flat(),
        ...c.negatives.flat(),
        ...extraVocabulary.flatMap(phrase),
      ]),
    );
  }

  /** Normaliza e corrige erros de digitação usando o vocabulário das intenções. */
  prepare(text: string): { normalized: string; tokens: string[] } {
    const tokens = correctTypos(tokenize(normalizeText(text)), this.vocabulary);
    return { normalized: tokens.join(" "), tokens };
  }

  classify(text: string, ctx: ClassifyContext = {}): ClassificationDetail {
    const { normalized, tokens } = this.prepare(text);

    // 1. Palavras-chave exatas. Se uma frase está dentro de outra maior (de qualquer intenção),
    //    só a maior vale: "quanto custa uma festa" ganha de "quanto custa" e de "festa".
    const matches: { c: CompiledIntent; start: number; end: number }[] = [];
    for (const c of this.compiled) {
      for (const k of c.keywords) {
        const start = findPhrase(tokens, k);
        if (start >= 0) matches.push({ c, start, end: start + k.length });
      }
    }
    const kept = matches.filter(
      (m) => !matches.some((o) => o !== m && o.start <= m.start && o.end >= m.end && o.end - o.start > m.end - m.start),
    );

    const content = contentTokens(tokens);
    const scores: IntentScore[] = [];
    let greeting = false;
    for (const c of this.compiled) {
      let score = 0;
      const ownKeywords = kept.filter((m) => m.c === c).length;
      score += ownKeywords * SCORE.keyword;

      // 2. Sinônimos: +3 por grupo encontrado.
      for (const group of c.synonymGroups) if (group.some((v) => findPhrase(tokens, v) >= 0)) score += SCORE.synonym;

      // 3. Parecida com algum exemplo (só para mensagens com 2+ palavras de conteúdo).
      if (content.length >= 2 && c.examples.some((e) => tokenOverlap(content, e) >= EXAMPLE_SIMILARITY)) score += SCORE.example;

      // 4. Correspondência parcial: metade das palavras de uma palavra-chave composta.
      if (!ownKeywords) {
        const partial = c.keywords.some((k) => {
          const kc = contentTokens(k);
          if (kc.length < 2) return false;
          const hits = kc.filter((t) => tokens.includes(t)).length;
          return hits >= 1 && hits >= kc.length / 2;
        });
        if (partial) score += SCORE.partial;
      }

      if (score > 0 && c.negatives.some((n) => findPhrase(tokens, n) >= 0)) score += SCORE.negative;
      if (score > 0 && ctx.topic === "festa" && c.intent.scope === "festa" && content.length <= 6) score += SCORE.topic;

      if (c.intent.id === "SAUDACAO" && score >= MIN_SCORE) greeting = true;
      if (score > 0) scores.push({ intent: c.intent.id, score });
    }

    const byId = new Map(this.compiled.map((c) => [c.intent.id, c.intent]));
    const rank = (a: IntentScore, b: IntentScore) =>
      b.score - a.score ||
      Number(byId.get(a.intent)!.noClarify ?? false) - Number(byId.get(b.intent)!.noClarify ?? false) ||
      byId.get(b.intent)!.priority - byId.get(a.intent)!.priority;
    scores.sort(rank);

    // Saudação e agradecimento só valem se não houver outra pergunta na mensagem.
    const main = scores.filter((s) => s.score >= MIN_SCORE && !byId.get(s.intent)!.helper);
    const candidates = main.length ? main : scores.filter((s) => s.score >= MIN_SCORE);
    const best = candidates[0] ?? null;
    const second = candidates[1];
    const ambiguous =
      !!best &&
      !!second &&
      best.score - second.score < AMBIGUITY_GAP &&
      !byId.get(best.intent)!.noClarify &&
      !byId.get(second.intent)!.noClarify;

    return { best, second: second ?? null, scores, ambiguous, normalized, tokens, greeting };
  }
}
