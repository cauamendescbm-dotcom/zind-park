/**
 * Informações comerciais da Zind. Mudou preço, horário ou endereço? Altere só aqui:
 * todas as respostas usam estes valores pelas {{variaveis}}.
 */
export const parkConfig = {
  name: "Zind",
  address: "Rua Chile, 85, Bairro Nações, Balneário Camboriú",
  addressFull: "Rua Chile, 85, Bairro Nações, Balneário Camboriú - SC",
  pricePerHour: 80,
  sockPrice: 25,
  /** Abaixo desta idade a criança precisa de um adulto responsável (que não paga). */
  companionRequiredUnderAge: 5,
  pcdDiscountPercent: 50,
  openingHours: {
    tuesdayToFriday: "das 15h às 22h",
    saturdaySunday: "das 14h às 22h",
  },
  paymentMethods: ["Cartão de crédito", "Cartão de débito", "Pix", "Dinheiro"],
  partySpaces: {
    lounge: { name: "Lounge Térreo", maxPeople: 25 },
    vip: { name: "Salão VIP (2º andar)" },
  },
} as const;

// toLocaleString usa espaço não separável depois do "R$"; trocamos por espaço normal.
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/\s/g, " ");

/** Variáveis disponíveis nas respostas: {{precoHora}}, {{endereco}} etc. */
export const responseVars: Record<string, string> = {
  nome: parkConfig.name,
  endereco: parkConfig.address,
  enderecoCompleto: parkConfig.addressFull,
  precoHora: brl(parkConfig.pricePerHour),
  precoHoraCurto: `R$ ${parkConfig.pricePerHour}`,
  precoMeia: brl(parkConfig.sockPrice),
  idadeAcompanhante: String(parkConfig.companionRequiredUnderAge),
  descontoPcd: `${parkConfig.pcdDiscountPercent}%`,
  horarioSemana: parkConfig.openingHours.tuesdayToFriday,
  horarioFimDeSemana: parkConfig.openingHours.saturdaySunday,
  loungeMax: String(parkConfig.partySpaces.lounge.maxPeople),
};

export function renderTemplate(template: string, extra: Record<string, string> = {}): string {
  const vars = { ...responseVars, ...extra };
  return template.replace(/\{\{(\w+)\}\}/g, (m, key) => vars[key] ?? m);
}
