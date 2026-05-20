import type { CallAnalysisJson } from "@/types/domain";

import { getOpenAIClient, truncateMiddle } from "@/lib/openai/client";

// gpt-4o tem context window grande; mas pra controlar custo, capamos em 100k chars.
const MAX_CHARS = 100000;

export interface AnalyzeCallResult {
  nota: number;
  analysis: CallAnalysisJson;
  tokens_used: number;
}

// Analise estruturada da call. Schema atual e simples (5 campos), pode ser
// trocado quando o Bethel colar o template do sistema antigo.
export async function analyzeCall(args: {
  transcription: string;
  clientName: string | null;
}): Promise<AnalyzeCallResult> {
  const openai = getOpenAIClient();
  const text = truncateMiddle(args.transcription, MAX_CHARS);

  const clientHint = args.clientName
    ? `Nome do cliente identificado: ${args.clientName}.\n\n`
    : "";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: [
          "Voce e um coach de vendas senior. Analise a transcricao de call abaixo e gere uma analise estruturada em PORTUGUES.",
          "",
          "Diretrizes:",
          "- Nota: 0.0 a 10.0 (uma casa decimal), considerando rapport, descoberta de dor, apresentacao, tratamento de objecoes, fechamento.",
          "- Resumo: 2-3 frases descrevendo o que aconteceu e desfecho.",
          "- Pontos fortes: 2-5 itens curtos do que o closer fez bem.",
          "- Pontos fracos: 2-5 itens curtos do que poderia melhorar.",
          "- Sugestoes: 2-5 acoes concretas pra proxima call (verbos no imperativo).",
          "",
          "Sempre retorne via function call. Seja honesto e construtivo, nao bajule.",
        ].join("\n"),
      },
      {
        role: "user",
        content: `${clientHint}Transcricao:\n\n${text}`,
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "report_analysis",
          description: "Reporta a analise estruturada da call.",
          parameters: {
            type: "object",
            properties: {
              nota: {
                type: "number",
                description: "Nota geral de 0.0 a 10.0",
                minimum: 0,
                maximum: 10,
              },
              resumo: { type: "string" },
              pontos_fortes: {
                type: "array",
                items: { type: "string" },
                minItems: 1,
              },
              pontos_fracos: {
                type: "array",
                items: { type: "string" },
                minItems: 1,
              },
              sugestoes: {
                type: "array",
                items: { type: "string" },
                minItems: 1,
              },
            },
            required: [
              "nota",
              "resumo",
              "pontos_fortes",
              "pontos_fracos",
              "sugestoes",
            ],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: {
      type: "function",
      function: { name: "report_analysis" },
    },
    temperature: 0.3,
  });

  const call = completion.choices[0]?.message?.tool_calls?.[0];
  if (!call || call.type !== "function") {
    throw new Error("analyzeCall: modelo nao retornou function call");
  }

  let parsed: {
    nota: number;
    resumo: string;
    pontos_fortes: string[];
    pontos_fracos: string[];
    sugestoes: string[];
  };
  try {
    parsed = JSON.parse(call.function.arguments);
  } catch (err) {
    throw new Error(
      `analyzeCall: parse JSON falhou: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const nota = Math.max(0, Math.min(10, Number(parsed.nota) || 0));
  const round = Math.round(nota * 10) / 10;

  return {
    nota: round,
    analysis: {
      resumo: parsed.resumo,
      pontos_fortes: parsed.pontos_fortes ?? [],
      pontos_fracos: parsed.pontos_fracos ?? [],
      sugestoes: parsed.sugestoes ?? [],
    },
    tokens_used: completion.usage?.total_tokens ?? 0,
  };
}
