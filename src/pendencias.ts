import { resolveBotMode, type Config } from "./config.js";
import type { Knowledge } from "./agent/knowledge.js";
import type { Channel } from "./store/types.js";

export interface EstadoDoServidor {
  config: Config;
  knowledge: Pick<Knowledge, "packages" | "missingCount">;
  canais: Channel[];
  /** "ok", "memoria" ou "erro: ..." (o mesmo do /health). */
  banco: string;
}

/**
 * O que ainda falta para o robô atender sozinho, em frases curtas para quem não programa.
 * Aparece no /health como "faltando". Nunca mostra o valor de nenhuma chave.
 */
export function pendenciasDeEntrega({ config, knowledge, canais, banco }: EstadoDoServidor): string[] {
  const falta: string[] = [];
  const whatsapp = canais.includes("whatsapp");
  const instagram = canais.includes("instagram");

  if (banco === "memoria") falta.push("DATABASE_URL vazio: as conversas se perdem quando o servidor reinicia");
  if (!whatsapp) falta.push("WhatsApp desligado: falta WHATSAPP_TOKEN e PHONE_NUMBER_ID (ou conectar pela página /conectar)");
  if (!instagram) falta.push("Instagram desligado: falta INSTAGRAM_PAGE_ID e INSTAGRAM_TOKEN (ou conectar pela página /conectar)");
  if (!config.META_APP_SECRET) falta.push("APP_SECRET vazio: o robô aceita webhook de qualquer um");
  if (!config.ORGANIZADORA_WHATSAPP) {
    falta.push("ORGANIZADORA_WHATSAPP vazio: festas e dúvidas não chegam para ninguém");
  } else if (!config.ORGANIZADORA_TEMPLATE_LEAD || !config.ORGANIZADORA_TEMPLATE_DUVIDA) {
    falta.push(
      "ORGANIZADORA_TEMPLATE_LEAD/DUVIDA vazios: a organizadora só recebe os avisos se falou com o robô nas últimas 24h",
    );
  }
  if (config.ZIND_WHATSAPP_LINK.includes("PREENCHER")) {
    falta.push("ZIND_WHATSAPP_LINK vazio: no Instagram, quem pergunta de festa fica sem o link do WhatsApp");
  }
  if (knowledge.packages.length === 0) falta.push("knowledge/pacotes.json vazio: o robô não apresenta os pacotes de festa");
  if (knowledge.missingCount > 0) falta.push(`${knowledge.missingCount} campos [PREENCHER] ainda vazios em knowledge/`);
  if (resolveBotMode(config) === "intents") {
    falta.push("ANTHROPIC_API_KEY vazio: sem IA, o que o robô não entende vai para a equipe");
  }
  return falta;
}
