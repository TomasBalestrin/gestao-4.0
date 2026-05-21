# CHANGE | Framework de Análise de Calls + Show Password

> Falcão | 2026-05-21 | v1.0
> Tipo: feature
> Estimativa: 6 tasks, ~3-4h

## Contexto

1. **Show password**: adicionar ícone de olho no campo senha do login.
2. **Framework de análise**: substituir o prompt simples (5 campos) pelo framework
   completo de 4 produtos × 12 etapas × 6 checks com chunking paralelo para
   transcrições longas.

## Decisões

- `extract-client-name.ts` permanece (usado antes da análise pro match de lead).
- `call_score` no banco continua recebendo `nota_geral` do framework.
- `analysis_json` (JSONB) é flexível — sem migration necessária.
- Chunking: < 30k chars → direto; > 30k → chunks de 80k chars com overlap de
  2k, máximo 4 paralelos → merge numa segunda chamada OpenAI.
- Timeout: análise pode demorar 30-60s. Cron aguenta. Botão manual pode expirar
  no Vercel Pro (60s). Aceitável na primeira versão.
- UI: detail-dialog quebrada em sub-componentes (regra ≤ 200 linhas).

## Análise

### Arquivos a CRIAR

- `components/calls/call-analysis-etapa-card.tsx` — renderiza 1 etapa com todos
  os campos (aconteceu, nota, evidências, frase_melhor, etc.)
- `components/calls/call-analysis-checks.tsx` — renderiza os 6 checks de erros
  recorrentes
- `lib/openai/call-analysis-schema.ts` — definição do JSON schema OpenAI e do
  tipo TS para o output do framework (separado do execute pra manter tamanho)

### Arquivos a EDITAR

- `app/(auth)/login/page.tsx` — showPassword state + Eye/EyeOff toggle
- `lib/openai/analyze-call.ts` — rewrite: framework 4 produtos, 12 etapas, 6
  checks, chunking + merge
- `types/domain.ts` — expandir `CallAnalysisJson` pro schema completo
- `components/calls/call-analysis-detail-dialog.tsx` — rewrite: renderiza header
  + etapas + checks + acertos/erros + plano de ação

### NÃO TOCAR

- `lib/openai/extract-client-name.ts` (lógica de match inalterada)
- `lib/google/sync-engine.ts` (só chama `analyzeCall`, interface não muda)
- `supabase/migrations/*` (JSONB é flexível, sem migration)
- `app/api/call-analyses/*` (API inalterada)

---

## Tasks

### UPD-01 — Show password no login

**EDITAR**: `app/(auth)/login/page.tsx`

**LER**: arquivo já lido

**Steps**:
1. Adicionar `showPassword` state: `const [showPassword, setShowPassword] = useState(false)`
2. Envolver o `<Input type="password">` num `<div className="relative">`
3. Adicionar botão `<button type="button">` absoluto (right-2, top-1/2, -translate-y-1/2)
   com `Eye` / `EyeOff` do lucide-react (toggle `showPassword`)
4. Input: `type={showPassword ? "text" : "password"}`
5. `pr-9` no Input pra não sobrepor o ícone

**Critério**: toggle funciona, ícone muda ao clicar

---

### UPD-02 — Tipos do framework

**EDITAR**: `types/domain.ts`

**Steps**:
1. Substituir `CallAnalysisJson` pelo tipo completo:

```typescript
export type EtapaStatus = "sim" | "parcial" | "nao";
export type CheckStatus = "ok" | "parcial" | "falhou";
export type FrameworkNome =
  | "Elite Premium"
  | "Implementação de IA (NextTrack)"
  | "Mentoria Julia Ottoni"
  | "Programa de Implementação Comercial";

export interface CallEtapa {
  aconteceu: EtapaStatus;
  nota: number; // 0-10
  funcao_cumprida: string;
  evidencias: string[];
  ponto_forte: string;
  ponto_fraco: string;
  erro_de_execucao: string;
  impacto_no_lead: string;
  como_corrigir: string[];
  frase_melhor: { antes: string; depois: string };
  perguntas_de_aprofundamento: string[];
  seeds_prova_social: { usadas: string[]; faltaram: string[] };
  risco_principal: string;
  motivo_ausencia?: string;
}

export interface CallCheck {
  status: CheckStatus;
  evidencias: string[];
  correcao: string;
}

export interface CallAnalysisJson {
  // Identificação
  nome_lead: string | null;
  nome_closer: string | null;
  produto_ofertado: string | null;
  houve_venda: "sim" | "nao" | null;
  // Framework
  framework: { nome: FrameworkNome; confianca: number; motivo: string };
  // Etapas (12)
  etapas: {
    conexao_estrategica: CallEtapa;
    abertura: CallEtapa;
    mapeamento_empresa: CallEtapa;
    mapeamento_dor: CallEtapa;
    consultoria_estrategica: CallEtapa;
    problematizacao: CallEtapa;
    solucao_imaginada: CallEtapa;
    transicao: CallEtapa;
    pitch: CallEtapa;
    perguntas_compromisso: CallEtapa;
    fechamento: CallEtapa;
    quebra_objecoes: CallEtapa;
  };
  // Checks (6)
  checks: {
    A_abertura_ancoragem: CallCheck;
    B_profundidade: CallCheck;
    C_emocao_tensao: CallCheck;
    D_prova_social: CallCheck;
    E_objecao_real: CallCheck;
    F_negociacao: CallCheck;
  };
  // Nota geral com pesos
  nota_geral: number;
  pesos: {
    aderencia_processo: number;
    profundidade_dor: number;
    autoridade_conducao: number;
    emocao_urgencia: number;
    fechamento_objecoes: number;
  };
  // Acertos / Erros
  maiores_acertos: Array<{
    acerto: string; evidencia: string; porque_importa: string; como_repetir: string;
  }>;
  maiores_erros: Array<{
    erro: string; evidencia: string; impacto: string; como_corrigir: string;
    frase_melhor: { antes: string; depois: string };
  }>;
  // Ponto de perda
  ponto_perda?: { etapa: string; sinais: string[] };
  // Se vendeu
  motivos_compra?: Array<{ motivo: string; evidencia: string; gatilho: string }>;
  // Tomador de decisão
  tomador_decisao: { presente: boolean; houve_reagendamento: boolean; motivo?: string };
  // Plano de ação
  plano_acao: {
    ajuste_1: { diagnostico: string; o_que_fazer: string; script_30s: string };
    treino: { habilidade: string; como_treinar: string; meta: string };
    proxima_acao: { status: "fechado" | "follow-up" | "desqualificado"; passo: string; mensagem_whatsapp: string };
  };
  // Dados do lead extraídos
  dados_lead: {
    nicho?: string; modelo_venda?: string; ticket_medio?: string;
    faturamento_bruto?: string; equipe?: string; canais_aquisicao?: string[];
    dor_declarada?: string; dor_profunda?: string; objetivo_12m?: string;
    urgencia?: number; importancia?: number;
    objecoes?: Array<{ objecao: string; evidencia: string }>;
    motivo_compra_ou_nao?: string;
  };
}
```

**Critério**: typecheck passa com novos tipos

---

### UPD-03 — Schema OpenAI separado

**CRIAR**: `lib/openai/call-analysis-schema.ts`

**Steps**:
1. Exportar a constante `ANALYSIS_FUNCTION_SCHEMA` (o JSON schema completo do
   function call pro OpenAI) com todas as 12 etapas e 6 checks
2. Exportar `SYSTEM_PROMPT` (string) com as instruções do framework
3. Exportar `MERGE_SYSTEM_PROMPT` (string) para consolidação de chunks

O schema deve mapear 1:1 com `CallAnalysisJson`. Usar `additionalProperties: false`
em todos os objetos aninhados. Etapas são `required` mas campos opcionais como
`motivo_ausencia` podem ser `["string", "null"]`.

**Critério**: arquivo compila, schema cobre todos os campos de `CallAnalysisJson`

---

### UPD-04 — Analyze-call rewrite (chunking + framework)

**EDITAR**: `lib/openai/analyze-call.ts`

**LER**: `lib/openai/call-analysis-schema.ts` (criado na UPD-03)

**Steps**:
1. Constantes: `CHUNK_THRESHOLD = 30_000`, `CHUNK_SIZE = 80_000`,
   `CHUNK_OVERLAP = 2_000`, `MAX_PARALLEL = 4`
2. `splitIntoChunks(text: string): string[]`:
   - Se `text.length <= CHUNK_THRESHOLD` → retorna `[text]`
   - Senão: fatia em blocos de `CHUNK_SIZE` com `CHUNK_OVERLAP`, máximo
     `MAX_PARALLEL` blocos. Adiciona header em cada chunk:
     `[PARTE X de Y — trecho ${start}-${end} chars]`
3. `analyzeChunk(text, clientName, chunkInfo?)` → chama OpenAI com
   `SYSTEM_PROMPT` + schema + `temperature: 0.2`. Retorna `CallAnalysisJson`
   parcial + tokens.
4. `mergeChunks(partials: CallAnalysisJson[])` → segunda chamada OpenAI
   (gpt-4o) com `MERGE_SYSTEM_PROMPT`, recebe as N análises parciais em JSON,
   pede consolidação em uma análise final (mesma estrutura).
5. `analyzeCall({ transcription, clientName })`:
   - chunks = `splitIntoChunks(transcription)`
   - Se 1 chunk: `analyzeChunk` direto
   - Se N chunks: `Promise.all(chunks.map(analyzeChunk))` → `mergeChunks`
   - Retorna `{ nota: analysis.nota_geral, analysis, tokens_used }`
6. Manter `AnalyzeCallResult` com `nota: number` (pra manter contrato com
   sync-engine inalterado)

**Critério**: funciona com texto < 30k (direto) e > 30k (chunks)

---

### UPD-05 — Sub-componentes do detail dialog

**CRIAR**:
- `components/calls/call-analysis-etapa-card.tsx`
- `components/calls/call-analysis-checks.tsx`

**LER**: `components/calls/call-analysis-detail-dialog.tsx`

**Steps**:

`call-analysis-etapa-card.tsx`:
- Props: `{ nome: string; etapa: CallEtapa }`
- Exibe: badge aconteceu (sim=verde/parcial=amarelo/nao=vermelho) + nota + funcao_cumprida
- Collapsible (Accordion shadcn) com: evidências, ponto forte/fraco, erro de execução,
  impacto no lead, como corrigir, frase_melhor (antes → depois), perguntas de
  aprofundamento

`call-analysis-checks.tsx`:
- Props: `{ checks: CallAnalysisJson["checks"] }`
- Grid 2 colunas, 6 cards, cada um: badge status + evidências + correção

**Critério**: renderiza sem erro com dados mockados

---

### UPD-06 — Detail dialog rewrite

**EDITAR**: `components/calls/call-analysis-detail-dialog.tsx`

**LER**: `call-analysis-etapa-card.tsx`, `call-analysis-checks.tsx` (criados UPD-05)

**Steps**:
1. Seção header: nota_geral (grande), framework detectado, houve_venda badge,
   nome_lead + produto
2. Tabs shadcn: "Etapas" | "Checks" | "Acertos & Erros" | "Plano de Ação" |
   "Lead" | "Transcrição"
3. Tab Etapas: `<CallAnalysisEtapaCard>` × 12 (em Accordion)
4. Tab Checks: `<CallAnalysisChecks>`
5. Tab Acertos & Erros: top 3 acertos + top 3 erros com frase_melhor + ponto de
   perda (se houver)
6. Tab Plano de Ação: ajuste_1, treino, próxima ação + mensagem WhatsApp
   (copiável)
7. Tab Lead: dados_lead em grid + tomador de decisão
8. Tab Transcrição: texto colapsado (igual ao atual)
9. Guardar compatibilidade: se `analysis_json` ainda tem shape antigo (resumo/
   pontos_fortes), renderiza fallback com o layout simples

**Critério**: dialog abre, tabs funcionam, dados exibidos corretamente

---

## Validação final

- [ ] Build passa
- [ ] Typecheck passa
- [ ] Show password funciona no login
- [ ] Call com texto < 30k chars: análise direta com framework completo
- [ ] Call com texto > 30k chars: chunks paralelos + merge
- [ ] Dialog mostra 12 etapas expandíveis + 6 checks + plano de ação
- [ ] Fallback: análise antiga (5 campos) ainda renderiza sem crash

## Ordem de execução

```
UPD-01 (login) — paralelo com todo o resto (independente)

Cluster A (paralelo): UPD-02, UPD-03
↓
Cluster B (paralelo): UPD-04, UPD-05
↓
UPD-06 (depende de UPD-05)
↓
Validação
```
