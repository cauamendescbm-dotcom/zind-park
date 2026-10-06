import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaMessageParam,
  BetaTool,
  BetaToolResultBlockParam,
  BetaToolUseBlock,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { z } from "zod";
import type { PartyPackage } from "./knowledge.js";

/** Ações que o agente pode pedir. Quem executa (e valida) é o código. */
export interface AgentActions {
  saveParty(data: {
    customerName?: string;
    customerContact?: string;
    desiredDate?: string;
    desiredTime?: string;
    birthdayAge?: string;
    guests?: number;
    space?: string;
    theme?: string;
    packageId?: string;
  }): Promise<string>;
  completeParty(): Promise<string>;
  callHuman(reason: string): Promise<string>;
  optOut(): Promise<string>;
}

export interface AgentInput {
  /** Turnos anteriores, já em ordem (user/assistant alternados). */
  history: BetaMessageParam[];
  /** Estado atual da conversa (vai em um bloco separado do system, fora do cache). */
  stateText: string;
  actions: AgentActions;
}

export type AgentRunner = (input: AgentInput) => Promise<string>;

export const FALLBACK_REPLY =
  "Deixa eu confirmar isso certinho com a equipe e já te retorno 💛";

const MAX_TOOL_ROUNDS = 6;

export function buildTools(packages: PartyPackage[], opts: { party: boolean } = { party: true }): BetaTool[] {
  const packageIds = packages.map((p) => p.id);
  const partyTools: BetaTool[] = [
    {
      name: "salvar_dados_festa",
      description:
        "Salva os dados da festa que o cliente já informou. Chame sempre que descobrir um dado novo; envie só os campos que mudaram.",
      input_schema: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome do cliente responsável pela festa" },
          contato: { type: "string", description: "Telefone ou outro contato preferido do cliente" },
          data_desejada: { type: "string", description: "Data desejada, como o cliente falou (ex.: 15/11, sábado dia 20)" },
          horario: { type: "string", description: "Horário desejado, como o cliente falou (ex.: 15h, à tarde)" },
          idade_aniversariante: { type: "string", description: "Idade que o aniversariante vai fazer (ex.: 5 anos)" },
          convidados: { type: "integer", description: "Número aproximado de convidados" },
          espaco: { type: "string", enum: ["Lounge Térreo", "Salão VIP (2º andar)", "a definir"], description: "Espaço de interesse" },
          tema: { type: "string", description: "Tema da festa" },
          ...(packageIds.length
            ? { pacote: { type: "string", enum: packageIds, description: "Id do pacote de interesse (opcional)" } }
            : {}),
        },
        additionalProperties: false,
      },
    },
    {
      name: "concluir_coleta_e_repassar",
      description:
        "Repassa a festa para a organizadora. Use só depois de ter nome, contato, data, horário, idade do aniversariante, convidados, espaço e tema, e de o cliente confirmar o resumo. Depois disso o agente não conduz mais a venda.",
      input_schema: { type: "object", properties: {}, additionalProperties: false },
    },
  ];
  const commonTools: BetaTool[] = [
    {
      name: "chamar_humano",
      description:
        "Avisa a equipe quando você não sabe a resposta, o cliente pede uma pessoa, ou há reclamação séria.",
      input_schema: {
        type: "object",
        properties: {
          motivo: { type: "string", description: "A pergunta do cliente ou o motivo, em uma frase" },
        },
        required: ["motivo"],
        additionalProperties: false,
      },
    },
    {
      name: "registrar_opt_out",
      description: "O cliente pediu para não receber mais mensagens de campanhas.",
      input_schema: { type: "object", properties: {}, additionalProperties: false },
    },
  ];
  return opts.party ? [...partyTools, ...commonTools] : commonTools;
}

const saveSchema = z.object({
  nome: z.string().min(1).optional(),
  contato: z.string().min(1).optional(),
  data_desejada: z.string().min(1).optional(),
  horario: z.string().min(1).optional(),
  idade_aniversariante: z.string().min(1).optional(),
  convidados: z.number().int().positive().optional(),
  espaco: z.string().min(1).optional(),
  tema: z.string().min(1).optional(),
  pacote: z.string().min(1).optional(),
});
const humanSchema = z.object({ motivo: z.string().min(1) });

async function runTool(block: BetaToolUseBlock, actions: AgentActions): Promise<BetaToolResultBlockParam> {
  try {
    let content: string;
    switch (block.name) {
      case "salvar_dados_festa": {
        const i = saveSchema.parse(block.input);
        content = await actions.saveParty({
          customerName: i.nome,
          customerContact: i.contato,
          desiredDate: i.data_desejada,
          desiredTime: i.horario,
          birthdayAge: i.idade_aniversariante,
          guests: i.convidados,
          space: i.espaco,
          theme: i.tema,
          packageId: i.pacote,
        });
        break;
      }
      case "concluir_coleta_e_repassar":
        content = await actions.completeParty();
        break;
      case "chamar_humano":
        content = await actions.callHuman(humanSchema.parse(block.input).motivo);
        break;
      case "registrar_opt_out":
        content = await actions.optOut();
        break;
      default:
        throw new Error(`Ferramenta desconhecida: ${block.name}`);
    }
    return { type: "tool_result", tool_use_id: block.id, content };
  } catch (err) {
    return {
      type: "tool_result",
      tool_use_id: block.id,
      content: `Erro: ${err instanceof Error ? err.message : String(err)}`,
      is_error: true,
    };
  }
}

export interface ClaudeAgentOptions {
  client: Anthropic;
  model: string;
  effort: "low" | "medium" | "high" | "xhigh" | "max";
  /** Prompt + conhecimento: estável, vai para o cache. */
  systemPrompt: string;
  tools: BetaTool[];
}

/** Agente com Claude: laço de ferramentas até ter a resposta final para o cliente. */
export function createClaudeAgent(opts: ClaudeAgentOptions): AgentRunner {
  return async ({ history, stateText, actions }) => {
    const messages: BetaMessageParam[] = [...history];
    const texts: string[] = [];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await opts.client.beta.messages.create({
        model: opts.model,
        max_tokens: 4000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: opts.effort },
        system: [
          { type: "text", text: opts.systemPrompt, cache_control: { type: "ephemeral" } },
          { type: "text", text: stateText },
        ],
        tools: opts.tools,
        messages,
      });

      if (response.stop_reason === "refusal") {
        await actions.callHuman("O modelo recusou responder esta conversa; verificar manualmente.");
        return FALLBACK_REPLY;
      }

      for (const block of response.content) {
        if (block.type === "text" && block.text.trim()) texts.push(block.text.trim());
      }

      const toolUses = response.content.filter(
        (b): b is BetaToolUseBlock => b.type === "tool_use",
      );
      if (response.stop_reason !== "tool_use" || toolUses.length === 0) break;

      // Histórico append-only: a resposta volta inteira (inclui blocos de thinking).
      messages.push({ role: "assistant", content: response.content });
      const results = await Promise.all(
        toolUses.map((b) => runTool(b, actions)),
      );
      messages.push({ role: "user", content: results });
    }

    if (texts.length === 0) {
      // Nunca diga "vou confirmar com a equipe" sem a equipe ser avisada de verdade.
      await actions.callHuman("O agente não conseguiu montar uma resposta; verificar a conversa.");
      return FALLBACK_REPLY;
    }
    return texts.join("\n---\n");
  };
}
