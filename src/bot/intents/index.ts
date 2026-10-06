import type { Intent } from "../types.js";
import { accessibilityIntents } from "./accessibility.js";
import { birthdayIntents } from "./birthday.js";
import { conversationIntents } from "./conversation.js";
import { foodIntents } from "./food.js";
import { locationIntents } from "./location.js";
import { parkIntents } from "./park.js";
import { partyIntents } from "./party.js";
import { paymentIntents } from "./payment.js";
import { policyIntents } from "./policies.js";
import { pricingIntents } from "./pricing.js";

/** Todas as intenções do bot. Para criar uma nova, veja o README (seção "Como adicionar uma intenção"). */
export const allIntents: Intent[] = [
  ...parkIntents,
  ...pricingIntents,
  ...paymentIntents,
  ...policyIntents,
  ...accessibilityIntents,
  ...birthdayIntents,
  ...foodIntents,
  ...locationIntents,
  ...partyIntents,
  ...conversationIntents,
];

export const intentById = new Map(allIntents.map((i) => [i.id, i]));
