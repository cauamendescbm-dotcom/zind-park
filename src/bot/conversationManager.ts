import { replies } from "./data/faq.js";
import { holidayAnswer } from "./data/holidays.js";
import { parkConfig } from "./data/parkConfig.js";
import { describePackage } from "./data/partyPackages.js";
import { handleFallback } from "./fallbackHandler.js";
import { containsPhrase, IntentClassifier, MIN_SCORE, SCORE, type ClassificationDetail } from "./intentClassifier.js";
import { allIntents, intentById } from "./intents/index.js";
import {
  ackFor,
  isCancel,
  LEAD_VOCABULARY,
  LEAD_START,
  NAME_PREFIX,
  leadDoneMessage,
  nextField,
  parseField,
  questionFor,
  retryFor,
  spaceNote,
} from "./partyLead.js";
import { render, renderIntent } from "./responseGenerator.js";
import { emptyBotState, type BotOptions, type BotState, type BotTurn, type IntentId, type PartyLeadField } from "./types.js";
import { contentTokens } from "./utils/stopwords.js";

const YES = ["sim", "quero", "pode", "claro", "isso", "bora", "aham", "uhum", "com certeza", "por favor", "pode ser", "manda", "gostaria", "tenho interesse", "vamos", "ok", "quero sim", "opa"];
const NO = ["nao", "agora nao", "depois", "so isso", "por enquanto nao", "nao precisa", "obrigado", "obrigada"];
const BOOKING_VERBS = /\b(quero|queria|gostaria de|vou|posso|como faco para|da para|tem como) (fechar|contratar|reservar|agendar|marcar)\b/;
const AVAILABILITY = ["data disponivel", "tem data", "disponibilidade", "tem vaga", "esta livre"];
const PARTY_WORDS = ["festa", "festinha", "aniversario", "evento", "salao", "lounge", "espaco", "pacote", "comemorar"];
/** Palavras que deixam claro que o assunto é festa (sem "aniversario", que também é a visita do aniversariante). */
const PARTY_ONLY_WORDS = ["festa", "festinha", "evento", "salao", "lounge", "pacote", "comemorar", "convidado"];
const PARK_WORDS = ["parque", "brincar", "ingresso", "entrada", "visita", "por hora", "a hora"];
const QUESTION_WORDS = ["quanto", "qual", "como", "onde", "quando", "porque", "pode", "tem"];
/** Palavras comuns que a correção de digitação não pode trocar ("perto" não é "certo"). */
const COMMON_WORDS = ["perto", "longe", "cancelar", "shopping", "praia", "centro", "estudante", "irmao", "gestante", "natal", "mensal", "internet", "organizadora", "tempo", "verdade", "certo", "entendi", "chamar", "nome"];
const WEEKEND_WORDS = ["fim", "final", "semana", "sabado", "domingo", "segunda", "terca", "quarta", "quinta", "sexta", "feriado", "hoje", "amanha", "no", "na", "de", "e"];

/** Mensagens curtas e simples ganham resposta curta nestas intenções (seção 25). */
const PREFER_SHORT = new Set<IntentId>(["HORARIO_FUNCIONAMENTO", "PRECO_PARQUE", "PAGAMENTO", "LOCALIZACAO"]);

/** Com o assunto "festa", estas perguntas são sobre a festa e não sobre o parque (seção 20). */
const PARTY_CONTEXT_REDIRECT: Partial<Record<IntentId, IntentId>> = {
  IDADE_PAGAMENTO: "POLITICAS_FESTA",
  PRECO_PARQUE: "PACOTES_FESTA",
  // Valor de adulto em festa não foi informado: a equipe responde.
  ADULTO_PAGA: "INFO_INDISPONIVEL",
};

/** Depois destas respostas, "E eu?" quer dizer "e o adulto que acompanha?" (seção 21). */
const CHILD_PRICE_INTENTS = new Set<IntentId>(["IDADE_PAGAMENTO", "PRECO_PARQUE", "COMO_FUNCIONA", "ADULTO_BRINCAR"]);

const classifier = new IntentClassifier(allIntents, [
  ...YES,
  ...NO,
  ...AVAILABILITY,
  ...PARTY_WORDS,
  ...LEAD_VOCABULARY,
  ...COMMON_WORDS,
  ...PARK_WORDS,
  "fechar", "contratar", "reservar", "agendar", "marcar", "queria", "gostaria", "primeiro", "segundo", "duvida", "pergunta", "normal",
]);

const has = (tokens: string[], words: string[]) => words.some((w) => containsPhrase(tokens, w));
const isNo = (tokens: string[]) => tokens.length <= 5 && has(tokens, NO);
const isYes = (tokens: string[]) => tokens.length <= 6 && !isNo(tokens) && !tokens.includes("nao") && has(tokens, YES);
/** Nenhuma intenção forte na mensagem (só um "ok", "quero", "pode ser"...). */
const weak = (c: ClassificationDetail) => !c.best || c.best.intent === "AGRADECIMENTO" || c.best.score < SCORE.keyword;

/** Com assunto festa, "quanto custa?" e "bebê paga?" são sobre a festa, a não ser que a pessoa fale do parque. */
function partyRedirect(id: IntentId, tokens: string[], state: BotState): IntentId {
  const target = PARTY_CONTEXT_REDIRECT[id];
  if (!target) return id;
  if (has(tokens, PARTY_ONLY_WORDS) || (state.topic === "festa" && !has(tokens, PARK_WORDS))) return target;
  return id;
}

/**
 * Cérebro do bot. Recebe o texto do cliente e o estado da conversa e devolve a resposta.
 * Não sabe nada de WhatsApp ou Instagram: quem envia e guarda é o motor (src/core/engine.ts).
 *
 * Fluxo: normaliza → resolve o que estava pendente (pergunta de festa, "1/2", "sim/não")
 *        → contexto ("E eu?") → classifica por score → responde → sugere próximo passo.
 */
export function handleMessage(text: string, previous: BotState | null, o: BotOptions): BotTurn {
  const state: BotState = structuredClone(previous ?? emptyBotState());
  if (o.newSession) {
    Object.assign(state, { ...emptyBotState(), lead: state.lead, leadStatus: state.leadStatus === "collecting" ? "none" : state.leadStatus });
  }
  const turn = (t: Partial<BotTurn>): BotTurn => ({
    reply: null,
    intent: null,
    score: 0,
    fallback: false,
    needsHuman: false,
    deferToAgent: false,
    leadComplete: null,
    ...t,
    state,
  });
  const defer = () => turn({ deferToAgent: true });

  // Foto, áudio etc. (o canal transforma em "[o cliente enviou um áudio]").
  if (/^\[o cliente (enviou|compartilhou|mencionou)/.test(text.trim())) {
    return o.deferUnknownToAgent ? defer() : turn({ reply: replies.attachment });
  }

  const c = classifier.classify(text, { topic: state.topic });
  const { tokens } = c;
  const pending = state.pending;
  state.pending = null;

  // 1. Coletando os dados da festa.
  if (pending?.type === "lead" && state.leadStatus === "collecting") {
    return continueLead(text, c, pending.field, pending.retries);
  }

  // "não quero festa, só brincar": volta para o parque.
  if (state.topic === "festa" && /\b(nao quero|sem) festa\b|\bso (ir )?brincar\b/.test(tokens.join(" "))) {
    state.topic = null;
    const r = answer("COMO_FUNCIONA", 0, true);
    return { ...r, reply: `${replies.noParty} ${r.reply}` };
  }

  // Capacidade do lounge é informação oficial (parkConfig); a do Salão VIP não.
  if (o.partyFlow && has(tokens, ["lounge"]) && has(tokens, ["capacidade", "cabe", "quanta pessoa", "quanto convidado", "comporta"])) {
    state.topic = "festa";
    return turn({ reply: replies.loungeCapacity(parkConfig.partySpaces.lounge.maxPeople), intent: "FESTAS_EVENTOS" });
  }

  // Feriado cadastrado em knowledge/feriados.json: responde o horário combinado.
  const holiday = holidayAnswer(tokens, o.holidays ?? []);
  if (holiday && !(o.partyFlow && isBookingRequest(tokens, state))) {
    remember("HORARIO_FUNCIONAMENTO");
    return turn({ reply: holiday, intent: "HORARIO_FUNCIONAMENTO" });
  }

  // 2. Quer fechar/reservar uma festa: coleta os dados para a organizadora (vale também logo depois do menu 1/2).
  if (o.partyFlow && isBookingRequest(tokens, state)) {
    if (state.leadStatus === "done") return turn({ reply: replies.partyAlreadyHandedOff, intent: "FESTAS_EVENTOS" });
    return startLead(text);
  }

  // 3. Respostas para o que o bot tinha perguntado.
  if (pending?.type === "partyMenu") {
    if (tokens[0] === "1" || has(tokens, ["pacote", "quero conhecer", "conhecer"]) || (isYes(tokens) && weak(c))) {
      return answer("PACOTES_FESTA", 0);
    }
    if (tokens[0] === "2" || has(tokens, ["duvida", "pergunta"])) {
      state.topic = "festa";
      return turn({ reply: replies.partyDoubt, intent: "FESTAS_EVENTOS" });
    }
  }
  if (pending?.type === "clarify") {
    const chosen = resolveClarify(pending.options, c);
    if (chosen) return answer(chosen, c.scores.find((s) => s.intent === chosen)?.score ?? 0);
  }
  if (pending?.type === "suggestion" || pending?.type === "leadOffer") {
    // "ok" e "pode ser" também são agradecimento; aqui valem como "sim".
    if (isYes(tokens) && weak(c)) {
      return pending.type === "leadOffer" ? startLead(text) : answer(pending.intent, 0);
    }
    if (isNo(tokens) && (!c.best || c.best.intent === "AGRADECIMENTO")) {
      return turn({ reply: replies.suggestionDeclined, intent: "AGRADECIMENTO" });
    }
  }

  // 3. Contexto: "E eu?" depois de perguntar se a criança paga.
  if (
    tokens[0] === "e" &&
    tokens.length <= 4 &&
    has(tokens, ["eu", "adulto", "acompanhante", "responsavel", "mae", "pai", "eu pago"]) &&
    state.lastIntent &&
    CHILD_PRICE_INTENTS.has(state.lastIntent)
  ) {
    return answer("ADULTO_PAGA", SCORE.keyword);
  }

  // "Quanto custa?" → "E no fim de semana?": o valor é o mesmo, responde o valor de novo (curto).
  if (tokens[0] === "e" && state.lastIntent === "PRECO_PARQUE" && tokens.length <= 5 && tokens.every((t) => WEEKEND_WORDS.includes(t))) {
    return answer("PRECO_PARQUE", SCORE.keyword);
  }

  // 5. Classificação por score.
  // Duas perguntas numa mensagem só ("qual o horário e o valor?"): responde as duas, na versão curta.
  if (c.best && c.second && state.topic !== "festa" && isTwoQuestions(text, c)) {
    const first = answer(c.best.intent, c.best.score, true);
    const secondId = c.second.intent;
    const second = renderIntent(intentById.get(secondId)!, { short: true, partyFlow: o.partyFlow, whatsappLink: o.whatsappLink, packages: o.packages });
    remember(secondId);
    return { ...first, reply: `${first.reply}\n\n${second}` };
  }
  if (c.ambiguous && c.best && c.second) {
    // A própria mensagem já diz se é festa ou parque ("na festa, bebê paga?").
    const byWords = resolveParkOrParty([c.best.intent, c.second.intent], tokens);
    if (byWords) return answer(partyRedirect(byWords, tokens, state), c.best.score);
    const options: [IntentId, IntentId] = [c.best.intent, c.second.intent];
    state.pending = { type: "clarify", options };
    return turn({ reply: clarifyQuestion(options), intent: null, score: c.best.score });
  }
  if (!c.best) {
    if (o.deferUnknownToAgent) return defer();
    const f = handleFallback(state);
    return turn({ reply: f.reply, fallback: true, needsHuman: f.needsHuman, humanReason: f.needsHuman ? `O bot não entendeu o cliente. Última mensagem: "${text}"` : undefined });
  }
  const intentId = partyRedirect(c.best.intent, tokens, state);
  if (intentId === "INFO_INDISPONIVEL" && o.deferUnknownToAgent) return defer();
  return answer(intentId, c.best.score);

  // ---------------------------------------------------------------------------------------

  function remember(id: IntentId) {
    const intent = intentById.get(id)!;
    state.lastIntent = id;
    state.fallbackCount = 0;
    for (const covered of [id, ...(intent.covers ?? [])]) if (!state.answered.includes(covered)) state.answered.push(covered);
    if (intent.scope !== "geral") state.topic = intent.scope;
  }

  function answer(id: IntentId, score: number, forceShort = false): BotTurn {
    const intent = intentById.get(id)!;
    const alreadyAnswered = state.answered.includes(id);
    const content = contentTokens(tokens);
    const followUpQuestion = tokens[0] === "e" && tokens.length <= 6;
    // "aniversariante paga?": o "É claro que sim!" da resposta completa soaria como "sim, paga".
    const askedIfPays = id === "ANIVERSARIANTE" && has(tokens, ["paga", "pagar", "gratis", "de graca"]);
    const short = forceShort || askedIfPays || alreadyAnswered || followUpQuestion || (PREFER_SHORT.has(id) && content.length <= 2);

    // Pacote específico (quando o PDF já estiver cadastrado).
    if (id === "PACOTES_FESTA" && o.partyFlow) {
      const pkg = o.packages.find((p) => containsPhrase(tokens, p.name) || containsPhrase(tokens, p.id.replace(/_/g, " ")));
      if (pkg) {
        remember(id);
        state.pending = { type: "leadOffer" };
        return turn({ reply: `${describePackage(pkg)}\n\nQuer que eu já anote os dados da sua festa para a nossa organizadora? 😊`, intent: id, score });
      }
    }

    if (id === "FESTAS_EVENTOS" && state.leadStatus === "done" && o.partyFlow) {
      remember(id);
      return turn({ reply: replies.partyAlreadyHandedOff, intent: id, score });
    }

    let reply = renderIntent(intent, { short, partyFlow: o.partyFlow, whatsappLink: o.whatsappLink, packages: o.packages });
    if (c.greeting && !state.lastIntent && intent.id !== "SAUDACAO" && !/^(ol[áa]|oi)/i.test(reply)) reply = `Oi! ${reply}`;

    // Próximo passo, de vez em quando (seção 30): no máximo uma sugestão por conversa.
    if (
      !short &&
      intent.followUp &&
      state.suggestionsMade.length === 0 &&
      !state.answered.includes(intent.followUp.intent)
    ) {
      reply += `\n\n${intent.followUp.question}`;
      state.suggestionsMade.push(intent.followUp.intent);
      state.pending = { type: "suggestion", intent: intent.followUp.intent };
    }
    if (o.partyFlow && id === "FESTAS_EVENTOS") {
      state.pending = short ? { type: "suggestion", intent: "PACOTES_FESTA" } : { type: "partyMenu" };
    }
    if (o.partyFlow && id === "PACOTES_FESTA" && state.leadStatus !== "done") {
      state.pending = { type: "leadOffer" };
    }

    remember(id);
    return turn({
      reply,
      intent: id,
      score,
      needsHuman: !!intent.handoff,
      humanReason: intent.handoff ? `${intent.handoff} Mensagem do cliente: "${text}"` : undefined,
    });
  }

  function startLead(raw: string): BotTurn {
    state.leadStatus = "collecting";
    state.topic = "festa";
    state.lastIntent = "FESTAS_EVENTOS";
    // "quero fazer dia 20/11": já guarda a data.
    const dateMatch = raw.match(/\bdia \d{1,2}(\/\d{1,2})?|\b\d{1,2}\/\d{1,2}(\/\d{2,4})?/i);
    if (dateMatch && state.lead.date === undefined) state.lead.date = dateMatch[0];
    const field = nextField(state.lead, o);
    if (!field) return finishLead("");
    state.pending = { type: "lead", field, retries: 0 };
    const reply = field === "date" ? LEAD_START : `Que legal! 🎉 ${dateMatch ? `Anotei o ${dateMatch[0]}. ` : ""}${questionFor(field)}`;
    return turn({ reply, intent: "FESTAS_EVENTOS", score: SCORE.keyword });
  }

  function continueLead(raw: string, cls: ClassificationDetail, field: PartyLeadField, retries: number): BotTurn {
    if (isCancel(cls.tokens)) {
      state.leadStatus = "cancelled";
      return turn({ reply: "Tudo bem! 💛 Se mudar de ideia, é só me chamar que a gente monta a festa juntos.", intent: "FESTAS_EVENTOS" });
    }

    // Uma pergunta no meio da coleta ("tem estacionamento?"): responde e volta para a festa.
    const best = cls.best && !cls.ambiguous ? cls.best : null;
    let questionId =
      best && best.score >= SCORE.keyword && !intentById.get(best.intent)!.helper && best.intent !== "FESTAS_EVENTOS"
        ? partyRedirect(best.intent, cls.tokens, state)
        : null;
    const questionReply = () => {
      const intent = intentById.get(questionId!)!;
      return renderIntent(intent, { short: true, partyFlow: o.partyFlow, whatsappLink: o.whatsappLink, packages: o.packages });
    };
    const handoff = () => {
      const intent = questionId ? intentById.get(questionId)! : null;
      return intent?.handoff ? { needsHuman: true, humanReason: `${intent.handoff} Mensagem do cliente: "${raw}"` } : {};
    };

    const parsed = parseLeadAnswer(field, raw, cls, questionId !== null);
    // Resposta simples ("3 anos") não é pergunta, mesmo que lembre uma intenção.
    const asked = raw.includes("?") || has(cls.tokens.slice(0, 1), QUESTION_WORDS);
    if (parsed.ok && !asked) questionId = null;
    if (parsed.ok) {
      (state.lead as Record<string, unknown>)[field] = parsed.value;
      const next = nextField(state.lead, o);
      const note = field === "space" ? spaceNote(state.lead) : "";
      if (!next) {
        const done = finishLead(note);
        return questionId ? { ...done, reply: `${questionReply()}\n\n${done.reply}`, ...handoff() } : done;
      }
      state.pending = { type: "lead", field: next, retries: 0 };
      const ask = questionId
        ? `${questionReply()}\n\n${note}E voltando para a festa: ${questionFor(next)}`
        : `${note}${ackFor(state.lead)}${questionFor(next)}`;
      return turn({ reply: ask, intent: questionId ?? "FESTAS_EVENTOS", score: SCORE.keyword, ...handoff() });
    }

    if (questionId) {
      state.pending = { type: "lead", field, retries };
      return turn({
        reply: `${questionReply()}\n\nE voltando para a festa: ${questionFor(field)}`,
        intent: questionId,
        score: cls.best!.score,
        ...handoff(),
      });
    }

    if (retries + 1 >= 2) {
      // Não conseguiu responder duas vezes: segue sem esse dado (a organizadora pergunta depois).
      state.lead.skipped = [...(state.lead.skipped ?? []), field];
      const next = nextField(state.lead, o);
      if (!next) return finishLead("");
      state.pending = { type: "lead", field: next, retries: 0 };
      return turn({ reply: `Sem problemas, a organizadora vê isso com você 😊\n${questionFor(next)}`, intent: "FESTAS_EVENTOS" });
    }
    state.pending = { type: "lead", field, retries: retries + 1 };
    return turn({ reply: retryFor(field), intent: "FESTAS_EVENTOS" });
  }

  function finishLead(note: string): BotTurn {
    state.leadStatus = "done";
    state.pending = null;
    return turn({ reply: `${note}${leadDoneMessage(state.lead)}`, intent: "FESTAS_EVENTOS", score: SCORE.keyword, leadComplete: { ...state.lead } });
  }
}

/**
 * Lê a resposta do cliente para o dado da festa. Dados com formato (data, número, espaço) são procurados
 * em cada pedaço da mensagem ("dia 10/12, quanto fica?" guarda "dia 10/12"). Nome e tema são texto livre:
 * não valem se a mensagem for uma pergunta, um "ok" ou falar de outro assunto.
 */
function parseLeadAnswer(field: PartyLeadField, raw: string, c: ClassificationDetail, strongIntent: boolean) {
  const no = { ok: false } as const;
  const startsAsQuestion = (tokens: string[]) => has(tokens.slice(0, 1), QUESTION_WORDS);
  if (field === "name" || field === "theme") {
    const answer = field === "name" ? raw.replace(NAME_PREFIX, "") : raw;
    const a = answer === raw ? c : classifier.classify(answer);
    const notAnAnswer =
      raw.includes("?") ||
      (strongIntent && answer === raw) ||
      isYes(a.tokens) ||
      isNo(a.tokens) ||
      a.best?.intent === "AGRADECIMENTO" ||
      startsAsQuestion(a.tokens) ||
      (field === "name" && !!a.best);
    return notAnAnswer ? no : parseField(field, raw, c.tokens);
  }
  const isQuestion = raw.includes("?") || startsAsQuestion(c.tokens);
  const segments = isQuestion ? raw.split(/[,;?!]/).map((p) => p.trim()).filter(Boolean) : [raw];
  for (const segment of segments) {
    const tokens = classifier.prepare(segment).tokens;
    if (isQuestion && startsAsQuestion(tokens)) continue;
    const r = parseField(field, segment, tokens);
    if (r.ok) return r;
  }
  return no;
}

/** Duas perguntas do parque ligadas por "e" na mesma mensagem. */
function isTwoQuestions(text: string, c: ClassificationDetail): boolean {
  // "e" no meio da frase ("qual o horário e o valor?"), não no começo ("E criança paga?").
  if (!/\S\s(e|tambem)\s/i.test(`${text.trim().toLowerCase()} `) || !c.best || !c.second) return false;
  const a = intentById.get(c.best.intent)!;
  const b = intentById.get(c.second.intent)!;
  if (a.helper || b.helper || a.noClarify || b.noClarify) return false;
  if (a.scope !== "parque" || b.scope !== "parque") return false;
  if (a.covers?.includes(b.id) || b.covers?.includes(a.id)) return false;
  return c.second.score >= 4;
}

/** Ambíguo entre parque e festa, mas a mensagem diz qual: "festa", "salão"... ou "parque", "brincar". */
function resolveParkOrParty(options: IntentId[], tokens: string[]): IntentId | null {
  const party = options.find((id) => intentById.get(id)!.scope === "festa");
  const park = options.find((id) => intentById.get(id)!.scope !== "festa");
  if (!party || !park) return null;
  if (has(tokens, PARTY_ONLY_WORDS)) return party;
  if (has(tokens, PARK_WORDS)) return park;
  return null;
}

function isBookingRequest(tokens: string[], state: BotState): boolean {
  const normalized = tokens.join(" ");
  const partyContext = state.topic === "festa" || has(tokens, PARTY_WORDS);
  if (!partyContext) return false;
  // "quero fazer dia 20" só é pedido de festa quando já se está falando de festa.
  if (state.topic === "festa" && /\b(quero|queria|vou|gostaria de) (fazer|fechar)\b/.test(normalized) && !has(tokens, ["duvida"])) return true;
  return BOOKING_VERBS.test(normalized) || has(tokens, AVAILABILITY);
}

function resolveClarify(options: IntentId[], c: ClassificationDetail): IntentId | null {
  const { tokens } = c;
  if (tokens[0] === "1" || has(tokens, ["primeiro", "primeira"])) return options[0];
  if (tokens[0] === "2" || has(tokens, ["segundo", "segunda opcao"])) return options[1];
  const party = options.find((id) => intentById.get(id)!.scope === "festa");
  const park = options.find((id) => intentById.get(id)!.scope !== "festa");
  if (party && park) {
    if (has(tokens, ["festa", "festinha", "evento", "comemorar", "comemoracao", "fazer"])) return party;
    if (has(tokens, ["parque", "uso normal", "normal", "visita", "brincar", "eu", "meu", "aniversariante", "hoje", "cortesia"])) return park;
  }
  const scored = options
    .map((id) => ({ id, score: c.scores.find((s) => s.intent === id)?.score ?? 0 }))
    .sort((a, b) => b.score - a.score);
  return scored[0].score >= MIN_SCORE && scored[0].score > scored[1].score ? scored[0].id : null;
}

function clarifyQuestion([a, b]: [IntentId, IntentId]): string {
  const ia = intentById.get(a)!;
  const ib = intentById.get(b)!;
  if ((ia.scope === "festa") !== (ib.scope === "festa")) return replies.clarifyParkOrParty;
  return replies.clarify(ia.name, ib.name);
}
