import { getOpenAIClient, truncateMiddle } from "@/lib/openai/client";

// Limite seguro pro modelo mini com contexto pra prompt + resposta.
const MAX_CHARS = 30000;

export interface ExtractClientNameResult {
  client_name: string | null;
  confidence: number;
  tokens_used: number;
}

// Le a transcricao e retorna o nome do cliente (nao do vendedor) usando
// gpt-4o-mini com function calling.
export async function extractClientName(
  transcription: string
): Promise<ExtractClientNameResult> {
  const openai = getOpenAIClient();
  const text = truncateMiddle(transcription, MAX_CHARS);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Voce analisa transcricoes de calls de vendas em portugues. Sua tarefa: identificar o NOME COMPLETO do CLIENTE (o lead, prospect, comprador), nao o vendedor (closer). Em uma call de vendas tipica, o vendedor se apresenta primeiro e pergunta o nome do cliente. Foque em quem esta sendo atendido. Se nao conseguir identificar com confianca alta, retorne null e confidence baixo. Sempre retorne via function call.",
      },
      {
        role: "user",
        content: `Transcricao da call:\n\n${text}`,
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "report_client_name",
          description: "Reporta o nome do cliente identificado na transcricao.",
          parameters: {
            type: "object",
            properties: {
              client_name: {
                type: ["string", "null"],
                description:
                  "Nome completo do cliente (lead/prospect/comprador). Use o nome falado mais completo. Null se nao conseguir identificar.",
              },
              confidence: {
                type: "number",
                description: "Confianca de 0.0 a 1.0",
              },
            },
            required: ["client_name", "confidence"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: {
      type: "function",
      function: { name: "report_client_name" },
    },
    temperature: 0.1,
  });

  const call = completion.choices[0]?.message?.tool_calls?.[0];
  if (!call || call.type !== "function") {
    return {
      client_name: null,
      confidence: 0,
      tokens_used: completion.usage?.total_tokens ?? 0,
    };
  }

  let parsed: { client_name: string | null; confidence: number };
  try {
    parsed = JSON.parse(call.function.arguments) as {
      client_name: string | null;
      confidence: number;
    };
  } catch {
    return {
      client_name: null,
      confidence: 0,
      tokens_used: completion.usage?.total_tokens ?? 0,
    };
  }

  const name =
    typeof parsed.client_name === "string" && parsed.client_name.trim().length > 0
      ? parsed.client_name.trim()
      : null;
  const confidence =
    typeof parsed.confidence === "number"
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0;

  return {
    client_name: name,
    confidence,
    tokens_used: completion.usage?.total_tokens ?? 0,
  };
}
