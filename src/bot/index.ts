/**
 * Chatbot de intenções da Zind.
 *
 *   WhatsApp/Instagram → webhook → adaptador do canal → motor (src/core/engine.ts)
 *     → handleMessage (este módulo: contexto, classificador, respostas) → adaptador → cliente
 */
export { handleMessage } from "./conversationManager.js";
export { IntentClassifier, MIN_SCORE, AMBIGUITY_GAP, SCORE } from "./intentClassifier.js";
export { allIntents, intentById } from "./intents/index.js";
export { parkConfig } from "./data/parkConfig.js";
export { partyPackageSchema, type PartyPackage } from "./data/partyPackages.js";
export { buildLog, consoleSink, sanitize, type LogSink } from "./utils/logger.js";
export { officialAnswersText } from "./knowledgeExport.js";
export { replies } from "./data/faq.js";
export * from "./types.js";
