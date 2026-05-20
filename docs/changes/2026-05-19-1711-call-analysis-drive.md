# CHANGE | Análise de Calls via Google Drive + OpenAI

> 🦅 Falcão | 2026-05-19 | v1.0
> Tipo: feature
> Estimativa: 14 tasks, ~6-8h de execução

## Contexto

Closers gravam calls (Google Meet) que ficam salvas no Google Drive em pasta dedicada. O Meet/Gemini gera automaticamente uma transcrição em texto como Google Doc na mesma pasta. Hoje essa transcrição não é aproveitada.

A feature traz essa transcrição pro sistema, faz a AI da OpenAI analisar (extrair nome do cliente, gerar nota e análise), tenta vincular ao lead correto do closer e expõe o resultado em 2 lugares: módulo na sidebar + nova aba "Análise de Call" no modal do card.

## Decisões já aprovadas

- **AI Provider**: OpenAI (GPT-4o-mini pra extração, gpt-4o pra análise final)
- **Sync trigger**: Cron Vercel (3x/dia: 09h, 14h, 19h) + botão manual "Sincronizar agora"
- **Match falho do nome do cliente**: análise vai pra "caixa de não-vinculados" no módulo da sidebar, closer vincula manualmente
- **Permissões**: closer vê próprias, admin vê todas, líder vê do funil dele (NÃO inclui SDR nem social_selling nem financeiro)
- **Estrutura da análise**: schema flexível JSONB (Bethel vai colar template do sistema antigo depois). Por ora: `{ nota: number 0-10, resumo: string, pontos_fortes: string[], pontos_fracos: string[], sugestoes: string[] }`
- **Tipo de arquivo**: Google Docs apenas (Meet salva auto como Doc). Sistema filtra por palavra-chave no título (ex: "Transcrição", "Transcript", "Notes by Gemini") configurável por closer

## Análise

### Arquivos a CRIAR

**Backend - Google OAuth (espelho de `lib/instagram/oauth.ts`):**
- `lib/google/env.ts` — valida `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`
- `lib/google/oauth.ts` — `buildAuthUrl()`, `exchangeCodeForToken()`, `refreshAccessToken()`, `revokeToken()`
- `lib/google/drive-client.ts` — wrapper `googleapis` (list files, get file content, get Doc as text)
- `app/api/google/oauth/start/route.ts` — gera CSRF state, redireciona pro Google Consent
- `app/api/google/oauth/callback/route.ts` — valida state, troca code, salva tokens
- `app/api/google/oauth/disconnect/route.ts` — revoga + marca disconnected
- `app/api/google/integrations/me/route.ts` — GET config do closer logado, PATCH config (folder, keywords)
- `app/api/google/folders/route.ts` — lista pastas do Drive do closer pra UI selecionar
- `app/api/cron/google-drive-refresh-tokens/route.ts` — refresh proativo (espelho `instagram-refresh-tokens`)

**Backend - Sync + Análise:**
- `lib/google/sync-engine.ts` — orquestra: list new files → filter by keyword → process each
- `lib/openai/client.ts` — singleton OpenAI client
- `lib/openai/extract-client-name.ts` — prompt + function call pra extrair nome do cliente da transcrição
- `lib/openai/analyze-call.ts` — prompt + function call pra gerar análise estruturada
- `lib/calls/lead-matcher.ts` — match nome extraído com leads do closer (match exato primeiro, depois normalizado/case-insensitive; se múltiplos matches → unmatched)
- `app/api/calls/sync/route.ts` — POST: dispara sync manual pro closer logado
- `app/api/cron/google-drive-sync/route.ts` — GET protegido por CRON_SECRET, sync de todos closers conectados
- `app/api/call-analyses/route.ts` — GET (list, paginado + filtros: closer_id, lead_id, status)
- `app/api/call-analyses/[id]/route.ts` — GET (detalhe), DELETE (soft delete, admin only)
- `app/api/call-analyses/[id]/link-lead/route.ts` — PATCH: vincula análise não-vinculada a um lead

**Database:**
- `supabase/migrations/0024_call_analyses.sql` — 2 tabelas + enums + RLS + indices

**Frontend - Módulo Sidebar:**
- `app/(dashboard)/calls/page.tsx` — listagem geral (server component)
- `app/(dashboard)/calls/[id]/page.tsx` — detalhe (opcional, se preferir modal pode pular)
- `components/calls/call-analyses-list.tsx` — tabela/cards com filtros
- `components/calls/call-analyses-filters.tsx` — filtros (status, closer se admin/lider, periodo, search)
- `components/calls/call-analysis-detail.tsx` — render da análise (nota, resumo, pontos, sugestões)
- `components/calls/call-analysis-link-lead-dialog.tsx` — dialog pra vincular análise não-vinculada a lead
- `components/calls/call-sync-button.tsx` — botão "Sincronizar agora" com TanStack mutation

**Frontend - Conexão Google Drive (perfil do closer):**
- `app/(dashboard)/perfil/google-drive/page.tsx` — página de configuração (conectar/desconectar, escolher pasta, definir keywords)
- `components/calls/google-drive-config.tsx` — UI de conexão (Conectar button → OAuth) + config form
- `components/calls/google-drive-folder-picker.tsx` — combobox/select de pastas do Drive
- `components/calls/google-drive-keywords-input.tsx` — input tag de keywords

**Frontend - Aba no Card Modal:**
- `components/kanban/kanban-card-modal-call-analysis.tsx` — nova pane que lista análises vinculadas ao lead do card

**Hooks (TanStack Query):**
- `hooks/useGoogleDriveIntegration.ts` — GET/PATCH config + connect/disconnect
- `hooks/useGoogleDriveFolders.ts` — list folders
- `hooks/useCallAnalyses.ts` — list com filtros
- `hooks/useCallAnalysis.ts` — single by id (com transcrição)
- `hooks/useCallAnalysesByLead.ts` — análises de 1 lead (pro card modal)
- `hooks/useSyncCalls.ts` — mutation pro botão de sync
- `hooks/useLinkCallAnalysisToLead.ts` — mutation pro link-lead

**Schemas Zod:**
- `lib/schemas/google-drive.ts` — `googleDriveConfigSchema` (folder_id, file_keywords, file_types)
- `lib/schemas/call-analysis.ts` — `callAnalysisListQuerySchema`, `linkCallAnalysisToLeadSchema`

**Util/Permissions:**
- `lib/utils/permissions.ts` — adicionar `canAccessCallAnalyses(role)`, `canRecordCalls(role)`, `canViewAllCalls(role)`, `canViewTeamCalls(role)`

### Arquivos a EDITAR

- `components/kanban/kanban-card-modal-sidebar.tsx` — adiciona `"call_analysis"` em `CardModalPane` + item na lista (icon: `Phone` ou `BarChart3` do lucide)
- `components/kanban/kanban-card-modal.tsx` — render condicional do novo pane
- `components/layout/sidebar.tsx` — adiciona link "Análises de Calls" pros 3 roles (admin/lider em main, closer em `CloserNav`)
- `types/domain.ts` — adiciona tipos `GoogleDriveIntegration`, `CallAnalysis`, `CallAnalysisStatus`
- `package.json` — adiciona `googleapis`, `openai` (deps)
- `SETUP.md` (se existir) ou `.env.local.example` — adiciona novas env vars
- `lib/audit/logger.ts` — adiciona event types: `call_analysis_created`, `call_analysis_linked`, `call_analysis_deleted`, `google_drive_connected`, `google_drive_disconnected`, `google_drive_token_refreshed`

### NÃO TOCAR

- `lib/instagram/*` (padrão de referência, não modificar)
- `app/api/instagram/*` (ídem)
- `app/api/cards/*` (não relacionado)
- Schemas/RLS de tabelas existentes (apenas adiciona, não altera)
- `lib/automation/*` (não relacionado)

### Dependências Novas (npm)

```json
"googleapis": "^144.0.0",
"openai": "^4.77.0"
```

### Variáveis de ambiente Novas

```
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=https://<dominio>/api/google/oauth/callback
OPENAI_API_KEY=
# CRON_SECRET já existe (Instagram)
```

### Schema SQL completo (preview)

```sql
-- Migration: 0024_call_analyses.sql

-- ============================================================
-- 1. Google Drive Integration (1 por closer)
-- ============================================================

CREATE TYPE google_drive_status AS ENUM (
  'pending', 'connected', 'disconnected', 'expired_token'
);

CREATE TABLE google_drive_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  google_email TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  folder_id TEXT,             -- pasta do Drive monitorada
  folder_name TEXT,           -- display label
  file_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],  -- ex: ['Transcrição','Transcript','Notes by Gemini']
  file_types TEXT[] DEFAULT ARRAY['application/vnd.google-apps.document']::TEXT[],
  status google_drive_status NOT NULL DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ,
  last_refreshed_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gdi_status ON google_drive_integrations(status);
CREATE INDEX idx_gdi_token_expires ON google_drive_integrations(token_expires_at) WHERE status='connected';

CREATE TRIGGER set_updated_at_gdi
  BEFORE UPDATE ON google_drive_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 2. Call Analyses
-- ============================================================

CREATE TYPE call_analysis_status AS ENUM (
  'pending',      -- na fila pra processar
  'processing',   -- AI rodando
  'unmatched',    -- processada mas sem lead vinculado (caixa especial)
  'matched',      -- vinculada a lead
  'failed'        -- erro irrecuperável
);

CREATE TABLE call_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  google_file_id TEXT NOT NULL,            -- ID único do Doc no Drive
  google_file_name TEXT NOT NULL,
  google_file_modified_at TIMESTAMPTZ,
  transcription_text TEXT,                  -- texto bruto da call
  client_name_extracted TEXT,               -- nome detectado pela AI
  call_score NUMERIC(3,1),                  -- 0.0 a 10.0
  analysis_json JSONB,                      -- { resumo, pontos_fortes, pontos_fracos, sugestoes, ... }
  status call_analysis_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  tokens_used INT,                          -- tracking de custo OpenAI
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  -- Idempotência: 1 análise por arquivo do Drive
  UNIQUE (closer_id, google_file_id)
);

CREATE INDEX idx_ca_closer ON call_analyses(closer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ca_lead ON call_analyses(lead_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ca_status ON call_analyses(status);
CREATE INDEX idx_ca_created ON call_analyses(created_at DESC);

CREATE TRIGGER set_updated_at_ca
  BEFORE UPDATE ON call_analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 3. RLS
-- ============================================================

ALTER TABLE google_drive_integrations ENABLE ROW LEVEL SECURITY;

-- closer/admin/líder veem sua própria integration (admin pode ver tudo)
CREATE POLICY gdi_select ON google_drive_integrations
  FOR SELECT USING (
    is_admin() OR user_id = auth.uid()
  );

-- Apenas owner pode inserir/update (callback OAuth usa admin client; refresh cron usa admin client)
CREATE POLICY gdi_insert_self ON google_drive_integrations
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY gdi_update_self ON google_drive_integrations
  FOR UPDATE USING (user_id = auth.uid() OR is_admin());
CREATE POLICY gdi_delete_self ON google_drive_integrations
  FOR DELETE USING (user_id = auth.uid() OR is_admin());

ALTER TABLE call_analyses ENABLE ROW LEVEL SECURITY;

-- SELECT: admin tudo; closer só as próprias; líder vê dos closers que estão nos funis dele
CREATE POLICY ca_select_admin_or_owner ON call_analyses
  FOR SELECT USING (
    is_admin()
    OR closer_id = auth.uid()
    OR (
      -- líder vê análise se compartilha algum funil com o closer
      (SELECT role FROM users WHERE id = auth.uid()) = 'lider'
      AND EXISTS (
        SELECT 1 FROM user_funis uf_lider
        JOIN user_funis uf_closer ON uf_closer.funil_id = uf_lider.funil_id
        WHERE uf_lider.user_id = auth.uid()
          AND uf_closer.user_id = call_analyses.closer_id
      )
    )
  );

-- INSERT/UPDATE/DELETE só via admin client (sync engine, API routes com requireAuth)
-- Não criar policies de write pra users normais; admin client ignora RLS
```

### Permissions (lib/utils/permissions.ts — adicionar)

```typescript
export function canAccessCallAnalyses(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "closer" || role === "lider";
}
export function canRecordCalls(role: UserRole | null | undefined): boolean {
  return role === "closer";  // só closer conecta Drive
}
export function canViewAllCalls(role: UserRole | null | undefined): boolean {
  return role === "admin";
}
export function canViewTeamCalls(role: UserRole | null | undefined): boolean {
  return role === "lider";
}
```

### Estrutura dos prompts OpenAI

**1. Extração de nome de cliente** (gpt-4o-mini, function calling):

```typescript
{
  model: "gpt-4o-mini",
  messages: [
    { role: "system", content: "Você analisa transcrições de calls de vendas. Identifique o nome do cliente (não o vendedor). Se não conseguir identificar com confiança alta, retorne null." },
    { role: "user", content: transcription }
  ],
  tools: [{
    type: "function",
    function: {
      name: "report_client_name",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: ["string", "null"] },
          confidence: { type: "number", description: "0 a 1" }
        },
        required: ["client_name", "confidence"]
      }
    }
  }],
  tool_choice: { type: "function", function: { name: "report_client_name" } }
}
```

**2. Análise da call** (gpt-4o, function calling com schema):

```typescript
{
  model: "gpt-4o",
  messages: [
    { role: "system", content: "Você é coach de vendas. Analise a call abaixo e retorne nota e análise estruturada. (Template detalhado vem do Bethel depois)" },
    { role: "user", content: transcription }
  ],
  tools: [{
    type: "function",
    function: {
      name: "report_analysis",
      parameters: {
        type: "object",
        properties: {
          nota: { type: "number", minimum: 0, maximum: 10 },
          resumo: { type: "string" },
          pontos_fortes: { type: "array", items: { type: "string" } },
          pontos_fracos: { type: "array", items: { type: "string" } },
          sugestoes: { type: "array", items: { type: "string" } }
        },
        required: ["nota", "resumo", "pontos_fortes", "pontos_fracos", "sugestoes"]
      }
    }
  }],
  tool_choice: { type: "function", function: { name: "report_analysis" } }
}
```

### Vercel Cron Setup

Após deploy, configurar no Vercel Dashboard (Project → Settings → Cron Jobs):
- `GET /api/cron/google-drive-sync` → `0 9,14,19 * * *` (3x/dia BRT)
- `GET /api/cron/google-drive-refresh-tokens` → `0 4 * * *` (4h da manhã, daily)

Authorization: `Bearer ${CRON_SECRET}` (já existe pro Instagram).

### Riscos

- **OpenAI custos**: cada call ~2-5k tokens × 2 prompts. Estimativa 1k calls/mês ≈ $20-40/mês. Já mitigado: armazena `tokens_used` por análise.
- **Google API quota**: Drive API tem 1B req/dia free-tier. Sync 3x/dia com poucos closers não chega perto.
- **Race condition**: 2 crons + botão manual rodando ao mesmo tempo poderiam dobrar processamento. Mitigado: `UNIQUE (closer_id, google_file_id)` na tabela + status `processing`. Insert é idempotente.
- **Nome do cliente errado**: AI pode extrair nome incorreto e vincular ao lead errado. Mitigado: match exato apenas (case-insensitive trim). Se não bate exato → status `unmatched`. Match fuzzy NÃO é feito (decisão do Bethel).
- **Token Google expirou no meio do sync**: tratado com refresh proativo + retry single (igual padrão Instagram).
- **Transcrição enorme (call de 2h)**: OpenAI tem limite de context. Mitigação: se > 100k chars, trunca pelo meio (mantém início + fim) com aviso no resumo.

## Tasks

### CALL-01 [Migration + tipos]
**CRIAR**: `supabase/migrations/0024_call_analyses.sql`, atualizar `types/domain.ts`
**LER**: `supabase/migrations/0022_instagram_messaging.sql` (referência de RLS + helpers), `supabase/migrations/0006_audit_notifications.sql` (audit enums)
**Steps**:
1. Criar migration com as 2 tabelas, enums, índices, RLS conforme spec
2. Adicionar event types em audit: `call_analysis_created`, `call_analysis_linked`, `call_analysis_unmatched`, `call_analysis_deleted`, `google_drive_connected`, `google_drive_disconnected`, `google_drive_token_refreshed` (`ALTER TYPE audit_event_type ADD VALUE ...`)
3. Adicionar entity types: `call_analysis`, `google_drive_integration`
4. Rodar `npx supabase db push` (Bethel executa) ou colar SQL manualmente
5. Rodar `npx supabase gen types typescript --linked > lib/database.types.ts`
6. Adicionar tipos `GoogleDriveIntegration`, `CallAnalysis`, `CallAnalysisStatus`, `GoogleDriveStatus` em `types/domain.ts`
**Critério**: migration aplica sem erro, tipos gerados

### CALL-02 [Dependências + env]
**EDITAR**: `package.json`, `.env.local.example` (ou criar `SETUP.md` snippet)
**Steps**:
1. `npm i googleapis openai`
2. Adicionar env vars na documentação: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, `OPENAI_API_KEY`
3. Documentar no callback URL: `https://<dominio>/api/google/oauth/callback`
**Critério**: `npm run build` passa após install

### CALL-03 [Google OAuth lib]
**CRIAR**: `lib/google/env.ts`, `lib/google/oauth.ts`, `lib/google/drive-client.ts`
**LER**: `lib/instagram/env.ts`, `lib/instagram/oauth.ts`, `lib/instagram/graph-client.ts` (espelhar padrão)
**Steps**:
1. `env.ts`: getter de env vars com erro descritivo se faltarem
2. `oauth.ts`:
   - `buildAuthUrl({ state })` com scopes: `https://www.googleapis.com/auth/drive.readonly`, `https://www.googleapis.com/auth/drive.metadata.readonly`, `userinfo.email`
   - `exchangeCodeForToken(code)` → `{ access_token, refresh_token, expires_in, scope }`
   - `refreshAccessToken(refresh_token)` → novo access_token + expires_in
   - `revokeToken(token)` → POST oauth2.googleapis.com/revoke
   - `getUserEmail(access_token)` → fetch userinfo
3. `drive-client.ts`:
   - `listFolders(access_token)` → array `{ id, name, path }`
   - `listFilesInFolder(access_token, folder_id, { mimeType, modifiedAfter })`
   - `getDocText(access_token, file_id)` → export Doc as text/plain via Drive API
**Critério**: tudo tipado, sem `any`, funções puras

### CALL-04 [API Routes OAuth Google]
**CRIAR**: 
- `app/api/google/oauth/start/route.ts`
- `app/api/google/oauth/callback/route.ts`
- `app/api/google/oauth/disconnect/route.ts`
- `app/api/google/integrations/me/route.ts`
- `app/api/google/folders/route.ts`
**LER**: `app/api/instagram/oauth/start/route.ts`, `app/api/instagram/oauth/callback/route.ts` (espelhar 100%)
**Steps**:
1. `start`: `requireAuth()` (qualquer role que `canRecordCalls`), gera state, salva em cookie HttpOnly+Secure (`google_oauth_state`), redirect pra `buildAuthUrl({ state })`
2. `callback`: lê state do cookie, valida, troca code, busca email, upsert em `google_drive_integrations` (status=connected, salva tokens), `logEvent('google_drive_connected')`, redirect pra `/perfil/google-drive`
3. `disconnect`: `requireAuth()`, busca integration do user, revoke no Google, marca status=disconnected, `logEvent`
4. `integrations/me` GET: retorna config do user logado (sem expor tokens). PATCH: valida `folder_id`/`folder_name`/`file_keywords` via Zod, atualiza
5. `folders` GET: lista pastas do Drive do user (usa access_token, refresh on-the-fly se expirado)
**Critério**: fluxo OAuth completo funciona local, integration salva com tokens válidos

### CALL-05 [OpenAI lib + prompts]
**CRIAR**: `lib/openai/client.ts`, `lib/openai/extract-client-name.ts`, `lib/openai/analyze-call.ts`
**Steps**:
1. `client.ts`: singleton `OpenAI` com `process.env.OPENAI_API_KEY`
2. `extract-client-name.ts`:
   - Recebe transcrição (string)
   - Trunca se > 30k chars (mantém início+fim, marca `[truncado meio]`)
   - Chama gpt-4o-mini com function call `report_client_name`
   - Retorna `{ name: string | null, confidence: number, tokens_used: number }`
3. `analyze-call.ts`:
   - Recebe transcrição + opcionalmente nome do cliente
   - Trunca se > 100k chars
   - Chama gpt-4o com function call `report_analysis` (schema da spec)
   - Retorna `{ nota, resumo, pontos_fortes, pontos_fracos, sugestoes, tokens_used }`
4. Erros: throw `ApiError("AI_FAILED", ...)` pra ser logado
**Critério**: testar local com transcrição mock, retorno tipado

### CALL-06 [Lead matcher]
**CRIAR**: `lib/calls/lead-matcher.ts`
**Steps**:
1. Função `matchLeadByClientName(supabaseAdmin, closerId, clientName)`:
   - Normaliza nome: trim, lowercase, remove acentos, colapsa espaços
   - Busca leads do closer (via `created_by = closerId` OR `cards.assigned_to = closerId`)
   - Match exato normalizado em `leads.nome`
   - Se exatamente 1 match → retorna `lead_id`
   - Se 0 ou >1 matches → retorna `null` (vira `unmatched`)
2. Logging interno (console.error) pra debugging
**Critério**: cobre 3 casos: match único, 0 matches, múltiplos matches

### CALL-07 [Sync engine]
**CRIAR**: `lib/google/sync-engine.ts`
**Steps**:
1. Função `syncCloserCalls(closerId)`:
   - Lê `google_drive_integrations` do closer; se status != connected, return
   - Se token perto de expirar, chama `refreshAccessToken`, salva
   - `listFilesInFolder` com `modifiedAfter = last_synced_at` e mimeType `application/vnd.google-apps.document`
   - Filtra arquivos: nome contém pelo menos 1 keyword (case-insensitive)
   - Filtra arquivos: NÃO existe registro em `call_analyses` com mesmo `(closer_id, google_file_id)`
   - Pra cada arquivo:
     - Insert em `call_analyses` com `status=processing` (admin client; respeita UNIQUE)
     - `getDocText` → transcrição
     - Salva `transcription_text`
     - `extractClientName(text)` → nome
     - `analyzeCall(text, name)` → análise
     - `matchLeadByClientName(...)` → lead_id ou null
     - Update `call_analyses`: `client_name_extracted`, `call_score`, `analysis_json`, `lead_id`, `tokens_used`, `status = lead_id ? 'matched' : 'unmatched'`
     - `logEvent('call_analysis_created', ...)`
     - Se erro em qualquer step: update `status=failed`, `error_message`, log
   - Atualiza `last_synced_at = now()`
2. Retorna sumário: `{ processed, matched, unmatched, failed }`
**Critério**: idempotente (rodar 2x não duplica); errors em uma análise não afetam as outras

### CALL-08 [Cron + Sync manual API]
**CRIAR**:
- `app/api/cron/google-drive-sync/route.ts`
- `app/api/cron/google-drive-refresh-tokens/route.ts`
- `app/api/calls/sync/route.ts`
**LER**: `app/api/cron/instagram-refresh-tokens/route.ts` (espelhar)
**Steps**:
1. `cron/google-drive-sync`: GET, valida `Authorization: Bearer ${CRON_SECRET}`. Lista todos `google_drive_integrations` connected. Pra cada, chama `syncCloserCalls`. Loga sumário consolidado.
2. `cron/google-drive-refresh-tokens`: GET, valida cron secret. Refresh proativo dos que expiram em < 7d (mesmo padrão Instagram).
3. `calls/sync` POST: `requireAuth()` + `canRecordCalls(role)`. Chama `syncCloserCalls(user.id)`. Retorna sumário.
**Critério**: chamada com header correto funciona; com header errado retorna 401

### CALL-09 [API Routes de análises]
**CRIAR**:
- `app/api/call-analyses/route.ts` (GET list)
- `app/api/call-analyses/[id]/route.ts` (GET single, DELETE)
- `app/api/call-analyses/[id]/link-lead/route.ts` (PATCH)
**Steps**:
1. List: GET com query `?status=&closer_id=&lead_id=&search=&page=`. RLS já filtra por role. Retorna `{ data, total, page }`.
2. Single GET: retorna análise + transcrição.
3. DELETE: só admin pode (soft delete: `deleted_at=now()`). `logEvent`.
4. Link-lead PATCH: corpo `{ lead_id: uuid }`. Valida que: análise é `unmatched` E lead pertence ao mesmo closer da análise. Atualiza lead_id, status=matched. `logEvent`.
**Critério**: closer não consegue ler análise de outro closer (RLS); admin lê tudo

### CALL-10 [Schemas Zod]
**CRIAR**: `lib/schemas/google-drive.ts`, `lib/schemas/call-analysis.ts`
**Steps**:
1. `googleDriveConfigSchema`: `{ folder_id, folder_name, file_keywords: array(string).min(1).max(10) }`
2. `linkCallAnalysisToLeadSchema`: `{ lead_id: uuid }`
3. `callAnalysisListQuerySchema`: query params com defaults

### CALL-11 [Hooks TanStack]
**CRIAR**:
- `hooks/useGoogleDriveIntegration.ts`
- `hooks/useGoogleDriveFolders.ts`
- `hooks/useCallAnalyses.ts`
- `hooks/useCallAnalysis.ts`
- `hooks/useCallAnalysesByLead.ts`
- `hooks/useSyncCalls.ts`
- `hooks/useLinkCallAnalysisToLead.ts`
**LER**: `hooks/useFunis.ts` (padrão)
**Steps**:
1. Cada hook: typed query/mutation, queryKey hierárquico, invalidate apropriado em mutations
**Critério**: hooks usados na UI funcionam, cache invalida certo

### CALL-12 [UI - Página Conexão Google Drive (Perfil)]
**CRIAR**:
- `app/(dashboard)/perfil/google-drive/page.tsx`
- `components/calls/google-drive-config.tsx`
- `components/calls/google-drive-folder-picker.tsx`
- `components/calls/google-drive-keywords-input.tsx`
**Steps**:
1. Página: lê integration via hook; se `disconnected`/`pending` mostra botão "Conectar Google Drive" → POST `/api/google/oauth/start` redirect; se `connected` mostra config form
2. Form: combobox de pastas (`useGoogleDriveFolders`), input de keywords (Tag input pattern), botão Salvar (PATCH), botão Desconectar
3. UX: status visual (connected/expired/disconnected), email do Google conectado, última sincronização
**Critério**: fluxo end-to-end OAuth funciona, config salva

### CALL-13 [UI - Módulo Sidebar /calls]
**CRIAR**:
- `app/(dashboard)/calls/page.tsx`
- `components/calls/call-analyses-list.tsx`
- `components/calls/call-analyses-filters.tsx`
- `components/calls/call-analysis-detail.tsx`
- `components/calls/call-analysis-link-lead-dialog.tsx`
- `components/calls/call-sync-button.tsx`
**EDITAR**: `components/layout/sidebar.tsx` (adicionar link "Análises de Calls" pros 3 roles)
**Steps**:
1. Layout: filtros no topo + tabs (Vinculadas / Não-vinculadas / Falhas) + lista
2. Lista: card com nota, cliente, data, closer (se admin/líder), status, link pra detalhe
3. Detail: modal ou painel lateral; mostra nota, resumo, pontos fortes/fracos, sugestões, transcrição (collapsible)
4. Link-lead dialog: combobox de leads do closer (apenas se admin OU dono da análise)
5. Botão "Sincronizar agora" no topo (só visible se `canRecordCalls`)
**Critério**: closer vê só dele, admin vê tudo, líder vê do funil dele

### CALL-14 [UI - Aba no Card Modal]
**CRIAR**: `components/kanban/kanban-card-modal-call-analysis.tsx`
**EDITAR**:
- `components/kanban/kanban-card-modal-sidebar.tsx` (adicionar `"call_analysis"` em `CardModalPane`, novo item com icon Phone/BarChart3)
- `components/kanban/kanban-card-modal.tsx` (render condicional do pane)
**Steps**:
1. Nova aba "Análise de Call" (icon: `Phone` do lucide)
2. Pane lista análises do lead (`useCallAnalysesByLead(leadId)`)
3. Cada análise: card com nota + resumo. Click expand → análise completa (reusa `call-analysis-detail` ou versão compacta)
4. Vazio: empty state "Nenhuma análise de call ainda" + (se canRecordCalls) link "Conectar Google Drive"
5. Permissão: só mostra aba se `canAccessCallAnalyses(role)`
**Critério**: aba aparece nos cards do CRM pros 3 roles, análises do lead carregam

## Validação final

- [ ] Build passa (`npm run build`)
- [ ] Typecheck passa (`npx tsc --noEmit`)
- [ ] Lint passa (`npm run lint`)
- [ ] OAuth fluxo end-to-end com conta Google de teste funciona
- [ ] Cron `/api/cron/google-drive-sync` rodado manualmente (com bearer) processa transcrição teste e cria análise
- [ ] Botão manual "Sincronizar agora" no perfil funciona
- [ ] Lead matcher: match exato funciona; sem match → status `unmatched`
- [ ] Closer vê só próprias análises; admin vê todas; líder vê do funil dele
- [ ] Análise aparece no card do lead (aba Call) e no módulo `/calls`
- [ ] Link manual de análise unmatched a lead funciona
- [ ] Soft delete de análise (admin only) some das listagens
- [ ] Refresh de token funciona quando access_token expira
- [ ] Audit log mostra eventos (`google_drive_connected`, `call_analysis_created`, `call_analysis_linked`)

## Ordem de execução (paralelizável)

```
Cluster 1 (paralelo): CALL-01, CALL-02
↓
Cluster 2 (paralelo): CALL-03, CALL-05, CALL-06, CALL-10
↓
Cluster 3 (sequencial, depende dos anteriores): CALL-04, CALL-07
↓
Cluster 4 (paralelo): CALL-08, CALL-09, CALL-11
↓
Cluster 5 (paralelo): CALL-12, CALL-13, CALL-14
↓
Validação final
```

## Pendências do Bethel antes do start

1. **Template de análise do sistema antigo**: pra customizar o prompt em CALL-05 e o schema JSONB. Sem isso, MVP usa schema simples acima (5 campos).
2. **Google Cloud Console**: criar OAuth Client com tipo "Web application" no projeto existente. Authorized redirect URIs: `https://<dominio-prod>/api/google/oauth/callback` + `http://localhost:3000/api/google/oauth/callback`. Coletar `client_id` e `client_secret`.
3. **OpenAI API Key**: criar key em platform.openai.com com limite de gasto inicial (sugerido $50/mês).
4. **Decisão**: criar projeto Google Cloud separado (recomendado) ou reutilizar projeto que já tem outras APIs? Reutilizar simplifica admin mas pode bater no quota se outras coisas crescerem.

---

**Próximos passos**:
1. Bethel aprova plano (responde "aprovado" ou ajustes)
2. Bethel cria OAuth Client no Google Cloud + key OpenAI, adiciona env vars no Vercel
3. Disparar orquestrador: `/start docs/changes/2026-05-19-1711-call-analysis-drive.md`
4. Loop autônomo executa os 14 clusters
5. Bethel cola template de análise quando chegar em CALL-05 (não bloqueia, pode rodar com schema simples e refinar depois)
