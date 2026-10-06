/** Palavras que não ajudam a descobrir a intenção (usadas só na comparação com os exemplos). */
export const STOPWORDS = new Set([
  "a", "o", "as", "os", "um", "uma", "de", "da", "do", "das", "dos", "e", "que", "para", "com", "em", "no", "na",
  "nos", "nas", "por", "ai", "aqui", "voce", "voces", "eu", "me", "meu", "minha", "tem", "ter", "ser", "esta",
  "ta", "isso", "se", "ou", "ja", "mais", "muito", "bem", "sim", "nao", "la", "so", "pra", "pro", "qual", "quais",
  "oi", "ola", "bom", "boa", "dia", "tarde", "noite", "tudo", "ele", "ela", "gente", "favor", "por favor", "queria",
  "gostaria", "saber", "alguma", "algum", "coisa",
]);

export const contentTokens = (tokens: string[]) => tokens.filter((t) => !STOPWORDS.has(t));
