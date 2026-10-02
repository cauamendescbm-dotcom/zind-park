import "dotenv/config";
import { z } from "zod";

const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const schema = z.object({
  PORT: z.coerce.number().default(3000),

  // Claude
  CLAUDE_MODEL: z.string().default("claude-opus-5-5"),
  CLAUDE_EFFORT: z.enum(["low", "medium", "high", "xhigh", "max"]).default("low"),

  // Persona
  AGENT_NAME: z.string().default("Ju"),

  // WhatsApp Cloud API
  WHATSAPP_TOKEN: optional,
  WHATSAPP_PHONE_NUMBER_ID: optional,
  WHATSAPP_VERIFY_TOKEN: optional,
  WHATSAPP_API_VERSION: z.string().default("v23.0"),
  META_APP_SECRET: optional,

  // Instagram (Messenger API para Instagram, conta profissional ligada a uma Página do Facebook)
  INSTAGRAM_PAGE_ID: optional,
  INSTAGRAM_PAGE_TOKEN: optional,
  INSTAGRAM_ACCOUNT_ID: optional,
  INSTAGRAM_VERIFY_TOKEN: optional,
  INSTAGRAM_API_BASE: z.string().default("https://graph.facebook.com"),
  // Link para onde o Instagram manda quem quer festa, ex.: https://wa.me/5541999999999
  ZIND_WHATSAPP_LINK: z.string().default("[PREENCHER link do WhatsApp do Zind]"),

  // Disparos: mensagens por segundo (a Meta aceita 80/s por número no começo)
  CAMPAIGN_RATE_PER_SECOND: z.coerce.number().positive().default(50),

  // Organizadora de festas (recebe leads e dúvidas sem resposta)
  ORGANIZADORA_WHATSAPP: optional,
  // Templates aprovados na Meta (ver docs/templates-meta.md). Sem eles, vai texto livre,
  // que só chega se a organizadora tiver falado com o número do Zind nas últimas 24h.
  ORGANIZADORA_TEMPLATE_LEAD: optional,
  ORGANIZADORA_TEMPLATE_DUVIDA: optional,
  ORGANIZADORA_TEMPLATE_LANG: z.string().default("pt_BR"),

  // Banco (sem DATABASE_URL usa memória, bom para testes)
  DATABASE_URL: optional,

  // Humanização
  TYPO_RATE: z.coerce.number().min(0).max(1).default(1 / 15),
  DEBOUNCE_MS: z.coerce.number().default(4000),
  HUMAN_DELAYS: z
    .string()
    .default("true")
    .transform((v) => v !== "false"),

  KNOWLEDGE_DIR: z.string().default("knowledge"),
  PROMPT_FILE: z.string().default("prompts/system-prompt.md"),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return schema.parse(env);
}
