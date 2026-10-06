import type { PartyPackage } from "../src/bot/index.js";

export const pkg = (id: string, name: string, price: number): PartyPackage => ({
  id,
  name,
  price,
  guests: 30,
  description: "",
  includedFood: [],
  decoration: [],
  includedServices: [],
  additionalItems: [],
  observations: [],
});

/** Todos os dados que o agente com IA precisa para repassar uma festa. */
export const fullParty = {
  customerName: "M",
  desiredDate: "1/1",
  desiredTime: "15h",
  birthdayAge: "5 anos",
  guests: 10,
  space: "Lounge Térreo",
  theme: "t",
  packageId: "pacote_1",
};
