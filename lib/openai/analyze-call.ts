import type { CallAnalysisJson } from "@/types/domain";

import { getOpenAIClient } from "@/lib/openai/client";
import {
  ANALYSIS_FUNCTION_SCHEMA,
  MERGE_SYSTEM_PROMPT,
  SYSTEM_PROMPT,
} from "@/lib/openai/call-analysis-schema";

const CHUNK_THRESHOLD = 30_000;
const CHUNK_SIZE = 80_000;
const CHUNK_OVERLAP = 2_000;
const MAX_PARALLEL = 4;

export interface AnalyzeCallResult {
  nota: number;
  analysis: CallAnalysisJson;
  tokens_used: number;
}

function splitIntoChunks(text: string): string[] {
  if (text.length <= CHUNK_THRESHOLD) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length && chunks.length < MAX_PARALLEL) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    const num = chunks.length + 1;
    chunks.push(`[PARTE ${num} — chars ${start}–${end}]\n\n${text.slice(start, end)}`);
    if (end >= text.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

type OAIClient = ReturnType<typeof getOpenAIClient>;

async function analyzeChunk(
  openai: OAIClient,
  text: string,
  clientName: string | null,
): Promise<{ analysis: CallAnalysisJson; tokens: number }> {
  const clientHint = clientName ? `Nome do cliente identificado: ${clientName}.\n\n` : "";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `${clientHint}Transcrição:\n\n${text}` },
    ],
    tools: [{ type: "function", function: ANALYSIS_FUNCTION_SCHEMA }],
    tool_choice: { type: "function", function: { name: "report_analysis" } },
    temperature: 0.2,
  });

  const call = completion.choices[0]?.message?.tool_calls?.[0];
  if (!call || call.type !== "function") {
    throw new Error("analyzeChunk: modelo nao retornou function call");
  }

  const analysis = JSON.parse(call.function.arguments) as CallAnalysisJson;
  return { analysis, tokens: completion.usage?.total_tokens ?? 0 };
}

async function mergeChunks(
  openai: OAIClient,
  partials: CallAnalysisJson[],
): Promise<{ analysis: CallAnalysisJson; tokens: number }> {
  const partialsText = partials
    .map((p, i) => `--- ANÁLISE PARCIAL ${i + 1} ---\n${JSON.stringify(p, null, 2)}`)
    .join("\n\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: MERGE_SYSTEM_PROMPT },
      { role: "user", content: partialsText },
    ],
    tools: [{ type: "function", function: ANALYSIS_FUNCTION_SCHEMA }],
    tool_choice: { type: "function", function: { name: "report_analysis" } },
    temperature: 0.1,
  });

  const call = completion.choices[0]?.message?.tool_calls?.[0];
  if (!call || call.type !== "function") {
    throw new Error("mergeChunks: modelo nao retornou function call");
  }

  const analysis = JSON.parse(call.function.arguments) as CallAnalysisJson;
  return { analysis, tokens: completion.usage?.total_tokens ?? 0 };
}

export async function analyzeCall(args: {
  transcription: string;
  clientName: string | null;
}): Promise<AnalyzeCallResult> {
  const openai = getOpenAIClient();
  const chunks = splitIntoChunks(args.transcription);

  let analysis: CallAnalysisJson;
  let tokens_used = 0;

  if (chunks.length === 1) {
    const result = await analyzeChunk(openai, chunks[0]!, args.clientName);
    analysis = result.analysis;
    tokens_used = result.tokens;
  } else {
    const results = await Promise.all(
      chunks.map((chunk) => analyzeChunk(openai, chunk, args.clientName)),
    );
    tokens_used = results.reduce((sum, r) => sum + r.tokens, 0);
    const merged = await mergeChunks(
      openai,
      results.map((r) => r.analysis),
    );
    analysis = merged.analysis;
    tokens_used += merged.tokens;
  }

  const nota = Math.max(0, Math.min(10, Number(analysis.nota_geral) || 0));
  analysis.nota_geral = Math.round(nota * 10) / 10;

  return { nota: analysis.nota_geral, analysis, tokens_used };
}
