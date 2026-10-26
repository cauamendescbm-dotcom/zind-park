import { parkConfig } from "./data/parkConfig.js";
import type { PartyPackage } from "./data/partyPackages.js";
import type { BotOptions, PartyLeadData, PartyLeadField } from "./types.js";
import { containsPhrase } from "./intentClassifier.js";

/**
 * Captura do lead de festa (seção 28): uma pergunta por vez, como conversa.
 * Os valores guardados são o que o cliente escreveu (sem inventar nada).
 */

export const LEAD_START = "Que legal! 🎉 Para eu te ajudar melhor, qual seria a data que você está pensando para a festa?";

const packageList = (packages: PartyPackage[]) => packages.map((p, i) => `${i + 1} — ${p.name}`).join("\n");

const QUESTIONS: Record<Exclude<PartyLeadField, "package">, string> = {
  date: "Qual seria a data que você está pensando para a festa?",
  guests: "E aproximadamente quantos convidados vocês imaginam?",
  time: "E qual horário vocês preferem para a festa?",
  birthdayAge: "Quantos anos o aniversariante vai fazer? 🎂",
  space: `Qual espaço combina mais com vocês: o ${parkConfig.partySpaces.lounge.name} (até ${parkConfig.partySpaces.lounge.maxPeople} pessoas) ou o Salão VIP, no 2º andar?`,
  theme: "E já pensou no tema da festa? 🎈",
  name: "Para eu passar tudo para a nossa organizadora, qual é o seu nome?",
  phone: "E qual o seu WhatsApp com DDD, para ela falar com você?",
};

const RETRY: Record<Exclude<PartyLeadField, "package">, string> = {
  date: 'Me conta a data que você imagina para a festa? Pode ser aproximada, tipo "15/11" ou "um sábado de novembro" 😊',
  guests: "Pode ser um número aproximado, tipo 20 ou 30 convidados 😊",
  time: 'Qual horário seria melhor? Pode ser algo como "15h" ou "à tarde" 😊',
  birthdayAge: "Quantos aninhos o aniversariante vai fazer? Se não for aniversário, é só me dizer 😊",
  space: 'É só me dizer "Lounge" ou "Salão VIP". Se ainda não souber, sem problema, a organizadora te ajuda a escolher 😊',
  theme: 'Qual seria o tema? Se ainda não decidiu, é só me dizer "ainda não sei" 😊',
  name: "Me diz só o seu nome, por favor? 😊",
  phone: "Me passa o número com DDD, por favor? Ex.: 47 99999-9999",
};

const ACKS = ["Anotado! ", "Perfeito! ", "Ótimo! ", "Maravilha! ", "Combinado! ", "Show! ", "Certinho! "];

const MONTHS = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const DATE_WORDS = [...MONTHS, "segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo", "amanha", "hoje", "semana", "mes", "fim de semana", "feriado", "dia"];
const UNKNOWN = ["nao sei", "ainda nao sei", "a definir", "nao decidi", "ainda nao", "tanto faz", "qualquer", "nao tenho", "nao pensei", "sem tema", "indiferente", "voce que sabe", "qual voce indica", "qual indica"];
const CANCEL = ["desisti", "deixa para la", "nao quero mais", "esquece", "outra hora", "depois eu vejo", "mudei de ideia", "nao vou fazer"];

type LeadOptions = Pick<BotOptions, "phoneKnown" | "packages">;

/**
 * Com os pacotes cadastrados, a festa é só: pacote, convidados e nome. O contato vem do WhatsApp
 * e a organizadora combina o resto (data, horário, tema) direto com o cliente.
 */
export function fieldOrder(o: LeadOptions): PartyLeadField[] {
  const order: PartyLeadField[] = o.packages.length
    ? ["package", "guests", "name"]
    : ["date", "guests", "time", "birthdayAge", "space", "theme", "name"];
  return o.phoneKnown ? order : [...order, "phone"];
}

export function nextField(lead: PartyLeadData, o: LeadOptions): PartyLeadField | null {
  return fieldOrder(o).find((f) => lead[f] === undefined && !lead.skipped?.includes(f)) ?? null;
}

export const questionFor = (field: PartyLeadField, packages: PartyPackage[] = []) =>
  field === "package" ? `Qual pacote você quer?\n${packageList(packages)}` : QUESTIONS[field];
export const retryFor = (field: PartyLeadField, packages: PartyPackage[] = []) =>
  field === "package" ? `É só me dizer o número ou o nome do pacote 😊\n${packageList(packages)}` : RETRY[field];

const ORDINALS = [["1", "primeiro", "um"], ["2", "segundo", "dois"], ["3", "terceiro", "tres"], ["4", "quarto", "quatro"]];

/** Pacote pelo nome ("classic", "zind experience") ou pela posição na lista ("2", "o segundo"). */
export function findPackage(tokens: string[], packages: PartyPackage[], byNumber = false): PartyPackage | undefined {
  const byName = packages.find((p) => containsPhrase(tokens, p.name) || containsPhrase(tokens, p.id.replace(/_/g, " ")));
  if (byName || !byNumber || tokens.length > 4) return byName;
  return packages.find((_, i) => ORDINALS[i]?.some((w) => tokens.includes(w)));
}
export const ackFor = (lead: PartyLeadData) =>
  ACKS[(Object.keys(lead).filter((k) => k !== "skipped").length + (lead.skipped?.length ?? 0)) % ACKS.length];

/** Palavras da coleta que a correção de digitação deve conhecer. */
export const LEAD_VOCABULARY = [...MONTHS, ...DATE_WORDS, ...UNKNOWN, ...CANCEL, "manha", "tarde", "noite", "lounge", "terreo", "salao", "vip", "andar"];

export const isCancel = (tokens: string[]) => CANCEL.some((c) => containsPhrase(tokens, c));
const isUnknown = (tokens: string[]) => UNKNOWN.some((u) => containsPhrase(tokens, u));

const clean = (raw: string, max: number) => raw.replace(/\s+/g, " ").trim().replace(/[.!]+$/, "").slice(0, max);
const NUMBER_WORDS: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
  onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18,
  dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80,
  noventa: 90, cem: 100, cento: 100,
};

/** Primeiro número da mensagem, em algarismos ("30") ou por extenso ("trinta e cinco"). */
export function firstNumber(raw: string): number | null {
  const m = raw.match(/\d+/);
  if (m) return Number(m[0]);
  const words = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z]+/);
  let total: number | null = null;
  for (let i = 0; i < words.length; i++) {
    const n = NUMBER_WORDS[words[i]];
    if (n !== undefined) total = (total ?? 0) + n;
    else if (total !== null && !(words[i] === "e" && NUMBER_WORDS[words[i + 1]] !== undefined)) break;
  }
  return total;
}

/** "meu nome é", "pode me chamar de"... antes do nome. */
export const NAME_PREFIX =
  /^((oi|ol[áa])[,!\s]+)?(meu nome (é|e)|me chamo|pode me chamar de|eu sou (o|a)|sou (o|a)|sou|aqui (é|e) (o|a)|é (o|a)|e (o|a))\s+/i;

export type ParseResult<T> = { ok: true; value: T } | { ok: false };
const no = { ok: false } as const;

/**
 * Tenta ler a resposta do cliente para o campo perguntado.
 * `raw` é o texto original (guardado como o cliente escreveu); `tokens` é o texto normalizado.
 */
export function parseField(field: PartyLeadField, raw: string, tokens: string[]): ParseResult<string | number> {
  const unknown = isUnknown(tokens);
  switch (field) {
    case "date":
      if (unknown) return { ok: true, value: "a definir" };
      if (/\d/.test(raw) || DATE_WORDS.some((w) => containsPhrase(tokens, w))) return { ok: true, value: clean(raw, 80) };
      return no;
    case "guests": {
      // "minha filha de 3 anos paga" é pergunta de idade, não 3 convidados.
      if (["ano", "anos", "mes", "meses", "paga", "pagar", "idade"].some((w) => tokens.includes(w))) return no;
      // Número por extenso só em resposta curta ("trinta"): "quero falar com uma pessoa" não é 1 convidado.
      const n = /\d/.test(raw) || tokens.length <= 3 ? firstNumber(raw) : null;
      return n && n > 0 && n <= 2000 ? { ok: true, value: n } : no;
    }
    case "time":
      if (unknown) return { ok: true, value: "a definir" };
      if (/\d/.test(raw) || ["manha", "tarde", "noite", "almoco", "meio dia", "fim da tarde", "comeco da tarde"].some((w) => containsPhrase(tokens, w))) {
        return { ok: true, value: clean(raw, 60) };
      }
      return no;
    case "birthdayAge": {
      if (containsPhrase(tokens, "nao e aniversario") || containsPhrase(tokens, "nao tem aniversariante")) {
        return { ok: true, value: "não é aniversário" };
      }
      const n = firstNumber(raw);
      if (n !== null && n >= 0 && n <= 120) {
        if (containsPhrase(tokens, "mes")) return { ok: true, value: n === 1 ? "1 mês" : `${n} meses` };
        const half = containsPhrase(tokens, "meio") ? " e meio" : "";
        return { ok: true, value: `${n} ${n === 1 ? "ano" : "anos"}${half}` };
      }
      return no;
    }
    case "space":
      if (["lounge", "terreo", "termo", "primeiro", "1", "de baixo", "embaixo"].some((w) => containsPhrase(tokens, w))) {
        return { ok: true, value: parkConfig.partySpaces.lounge.name };
      }
      if (["vip", "salao", "segundo", "2", "2o andar", "de cima", "em cima", "andar"].some((w) => containsPhrase(tokens, w))) {
        return { ok: true, value: parkConfig.partySpaces.vip.name };
      }
      if (unknown) return { ok: true, value: "a definir" };
      return no;
    case "theme":
      if (unknown) return { ok: true, value: "a definir" };
      if (raw.includes("?") || tokens.length === 0) return no;
      return { ok: true, value: clean(raw, 60) };
    case "package":
      return no; // lido em findPackage, que conhece a lista de pacotes
    case "name": {
      if (raw.includes("?")) return no;
      const name = clean(raw, 60)
        .replace(NAME_PREFIX, "")
        .trim();
      const words = name.split(/\s+/).filter(Boolean);
      if (!words.length || words.length > 5 || /\d/.test(name) || firstNumber(name) !== null) return no; // "vinte" não é nome
      return { ok: true, value: words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") };
    }
    case "phone": {
      const digits = raw.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 13 ? { ok: true, value: digits } : no;
    }
  }
}

/** Mensagem final, quando os dados já foram repassados para a organizadora. */
export function leadDoneMessage(lead: PartyLeadData, packages: PartyPackage[] = []): string {
  const first = lead.name?.split(" ")[0];
  const pkg = packages.find((p) => p.id === lead.package);
  if (pkg) {
    return (
      `Prontinho${first ? `, ${first}` : ""}! 💛 Já passei o ${pkg.name} para a nossa organizadora de festas.\n` +
      "Ela vai falar com você aqui no WhatsApp para passar o orçamento e combinar a data. 🎉"
    );
  }
  return (
    `Prontinho${first ? `, ${first}` : ""}! 💛 Já passei tudo para a nossa organizadora de festas.\n` +
    "Ela vai falar com você para apresentar os pacotes e confirmar a disponibilidade da data. 🎉"
  );
}

/** Observação quando o número de convidados não cabe no pacote escolhido. */
export function packageNote(lead: PartyLeadData, packages: PartyPackage[]): string {
  const pkg = packages.find((p) => p.id === lead.package);
  if (!pkg || lead.guests === undefined) return "";
  if (lead.guests > pkg.guests || (pkg.minGuests && lead.guests < pkg.minGuests)) {
    const range = pkg.minGuests ? `de ${pkg.minGuests} a ${pkg.guests}` : `até ${pkg.guests}`;
    return `Só um detalhe: o ${pkg.name} é para ${range} convidados, a organizadora vai ver com você a melhor opção 😊\n\n`;
  }
  return "";
}

/** Observação quando o cliente escolhe o Lounge para mais pessoas do que ele comporta. */
export function spaceNote(lead: PartyLeadData): string {
  const max = parkConfig.partySpaces.lounge.maxPeople;
  if (lead.space === parkConfig.partySpaces.lounge.name && (lead.guests ?? 0) > max) {
    return `Só um detalhe: o ${parkConfig.partySpaces.lounge.name} é para até ${max} pessoas, a organizadora vai ver com você a melhor opção 😊\n\n`;
  }
  return "";
}
