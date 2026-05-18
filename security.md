> 🏹 Gavião Arqueiro | 2026-05-09 | v1.0

# Gestão 4.0 — Security

## 1. Autenticação

### Provedor
**Supabase Auth.** Email + senha.

### Fluxo
```
[/login] → POST credentials
   ↓
Supabase Auth valida → emite JWT
   ↓
@supabase/ssr salva em HTTP-only cookies (sb-access-token, sb-refresh-token)
   ↓
[middleware.ts] roda em toda request:
   - getUser() → valida JWT
   - se expirado, refresh automático
   - se inválido → redirect /login (em rotas privadas)
   ↓
public.users.must_change_password === true → redirect /auth/setup
   ↓
Acesso liberado às rotas conforme RBAC
```

### Tokens
- **Storage:** HTTP-only cookies, gerenciados pelo `@supabase/ssr`.
- **JAMAIS** localStorage ou sessionStorage. Mitigação contra XSS.
- **Expiração:** access token 1h, refresh token 7d. Refresh automático no middleware.
- **Logout:** `supabase.auth.signOut()` limpa cookies + invalida sessão server.

### Senha
- **Mínimo 8 caracteres**, com pelo menos 1 número e 1 letra. Validação client + server (Zod).
- **Hashing:** delegado ao Supabase Auth (bcrypt).
- **Senha temporária:** gerada por Admin via `createAdminClient()` (service role). Usuário força troca no primeiro login (`must_change_password=true`).
- **Reset:** Supabase Auth `resetPasswordForEmail()` envia link com token.

### Setup do primeiro login
1. Usuário insere senha temporária.
2. Middleware detecta `users.must_change_password=true` → redirect `/auth/setup`.
3. Usuário define nova senha (Zod valida).
4. `users.must_change_password=false`.
5. Redirect dashboard.

## 2. Autorização (3 camadas)

A ordem importa. Cada camada é independente e protege contra furos da anterior.

### Camada 1: Middleware (rota)
`middleware.ts` checa sessão e role mínima por path.

```ts
// pseudocódigo
if (path.startsWith("/admin/") && user.role !== "admin") {
  return redirect("/dashboard");
}
if (path.startsWith("/dashboard/") && !user) {
  return redirect("/login");
}
```

### Camada 2: Route Handler (API)
Helpers `requireAuth()` e `requireAdmin()` em `server/auth.ts`.

```ts
export async function requireAuth() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ApiError("UNAUTHORIZED", 401);
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile?.is_active) throw new ApiError("FORBIDDEN", 403);
  return { user, profile, supabase };
}

export async function requireAdmin() {
  const ctx = await requireAuth();
  if (ctx.profile.role !== "admin") throw new ApiError("FORBIDDEN", 403);
  return ctx;
}
```

### Camada 3: RLS (banco)
Última linha de defesa. Mesmo se um route handler tiver bug, o Postgres bloqueia. Detalhe completo em `schema.md` seção 6.

**Princípio:** todo SELECT/INSERT/UPDATE/DELETE em tabela de negócio é avaliado contra a RLS policy correspondente. Service role bypassa RLS, por isso só usado em paths estritamente server.

### Tabela Roles × Recursos

| Recurso | Admin | Social Selling | Closer | SDR | Financeiro | Líder |
|---------|:-----:|:--------------:|:------:|:---:|:----------:|:-----:|
| Funis CRUD | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Funis ler (autorizados) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cards próprios | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Cards todos | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Automações CRUD | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Usuários CRUD | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Perfil próprio | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Horários CRUD | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Agenda todas | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Agenda próprias | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Audit log | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Configurações | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

## 3. Validação

### Zod em TUDO
- **Client-side (UX):** RHF + zodResolver. Validação no blur e no submit.
- **Server-side (segurança):** route handler executa `schema.safeParse(body)` SEMPRE, mesmo se cliente já validou. Cliente não é confiável.
- **Schemas compartilhados:** `lib/schemas/*.ts` exportados, importados em ambos os lados.

### Custom Fields (validação dinâmica)
Schema Zod construído em runtime a partir de `funis.custom_fields_schema`:

```ts
// lib/schemas/custom-fields.ts (resumo)
function buildSchema(fields: CustomFieldConfig[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    let s = TYPE_TO_ZOD[f.tipo];  // text → z.string(), number → z.number(), etc
    if (!f.obrigatorio) s = s.optional();
    shape[f.id] = s;
  }
  return z.object(shape);
}
```

### Sanitização
- **Strings:** `trim()` + limite máximo (text 200, textarea 5000).
- **HTML:** **NÃO** aceitar HTML em nenhum campo. Renderização sempre como texto puro (React escapa por padrão).
- **URLs:** validar via `z.string().url()` e bloquear `javascript:` / `data:`.
- **JSONB custom_fields:** schema dinâmico Zod (como acima).

## 4. API Security

### CORS
```ts
// next.config.js (apenas domínio prod no Vercel)
async headers() {
  return [
    {
      source: "/api/:path*",
      headers: [
        { key: "Access-Control-Allow-Origin", value: process.env.NEXT_PUBLIC_SITE_URL ?? "*" },
        { key: "Access-Control-Allow-Methods", value: "GET, POST, PATCH, DELETE, OPTIONS" },
        { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
      ],
    },
  ];
}
```

No MVP single-tenant, mesma origem. Se Fase 2 abrir API externa, restringir explicitamente.

### Rate Limiting
| Endpoint | Limite | Janela |
|----------|--------|--------|
| `/api/auth/*` | 5 req | 1 min |
| `/api/cards/*/move` (engine síncrono) | 30 req | 1 min |
| `/api/calls` POST | 10 req | 1 min |
| Geral `/api/*` | 60 req | 1 min |
| Upload (storage) | 10 req | 1 min |

Implementação: Vercel Edge Middleware com Upstash Redis (`@upstash/ratelimit`) [INFERIDO]. Fallback simples em memória aceitável no MVP single-instance.

### Security Headers
```ts
// next.config.js
{
  source: "/(.*)",
  headers: [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  ],
}
```

### Content Security Policy
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.vercel-insights.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https://*.supabase.co;
connect-src 'self' https://*.supabase.co wss://*.supabase.co;
font-src 'self' data:;
frame-ancestors 'none';
```

`'unsafe-inline'` em scripts é necessário para Next.js (hidratação inline). `unsafe-eval` para algumas libs. Mitigado pelo isolamento de origin.

## 5. Variáveis de Ambiente

### Pública (cliente OK)
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=https://gestao-4-0.vercel.app
```

### Privada (servidor only)
```env
SUPABASE_SERVICE_ROLE_KEY=    # JAMAIS expor ao client
UPSTASH_REDIS_REST_URL=       # rate limiting
UPSTASH_REDIS_REST_TOKEN=
```

### Regras absolutas
- `.env.local` no `.gitignore`. Confirmar antes do primeiro commit.
- `SUPABASE_SERVICE_ROLE_KEY` **nunca** prefixado `NEXT_PUBLIC_`.
- `lib/supabase/admin.ts` **nunca** importado em arquivo com `"use client"`.
- Vercel: configurar envs em `Project Settings > Environment Variables` com escopo correto (Development / Preview / Production).
- Rotacionar `SUPABASE_SERVICE_ROLE_KEY` se houver suspeita de vazamento.

## 6. Dados

### Senhas
- Hashing delegado ao Supabase Auth (bcrypt, custo 10).
- **Nunca** armazenar senha em `public.users` ou qualquer outra tabela.

### PII (dados pessoais)
Identificados:
- `users.email` — necessário para login.
- `users.nome` — necessário para identificação.
- `users.foto_url` — opcional.
- `leads.nome`, `leads.email`, `leads.telefone` — base do CRM.

**Tratamento:**
- Acesso restrito por RLS.
- **Nunca** logar PII em `console.log` server. Logger usa redação automática para campos `email`, `telefone`, `senha` [INFERIDO].
- Backup automático Supabase (PITR no plano Pro, 7 dias).

### Dados financeiros
**Não armazenar dados de cartão.** MVP não tem pagamento. Se Fase 2 incluir, integrar via Stripe/Asaas com tokenização.

### Soft delete
- `leads.deleted_at`, `cards.deleted_at`, `funis.is_archived` para preservar histórico.
- Hard delete apenas em `notifications` antigas (TTL futuro), nunca em `audit_log`.

### LGPD
- **Direito de acesso:** endpoint `GET /api/users/[id]/export` retorna JSON com todos os dados do usuário [INFERIDO, Fase 2].
- **Direito de exclusão:** endpoint `DELETE /api/users/[id]/erase` anonimiza nome/email no `users` e mantém histórico operacional sob alias [INFERIDO, Fase 2].
- No MVP single-tenant interno, processo manual via DBA é aceitável.

### Audit Log
- **Append-only.** RLS bloqueia UPDATE e DELETE (sem policy = bloqueado).
- Sem TTL no MVP (forever). Reavaliar em 24 meses se volume exigir.
- Não registra senha, JWT, foto. Apenas `before` / `after` de campos de negócio.

## 7. Engine de Automação — Considerações de Segurança

- **Loop infinito:** contador de profundidade max 5. Se exceder, aborta com erro `AUTOMATION_DEPTH_EXCEEDED`.
- **Permissão de execução:** automações rodam com privilégio do usuário que disparou (não como service role). Insert/update obedecem RLS.
- **Notificações cross-role:** automação pode notificar role `closer` mesmo se o usuário disparador for `social_selling`. Implementação: insert em `notifications` com `service role` (bypassa RLS) APENAS para o adapter de notificação. Adapter validado para emitir somente para `target_user_id` ou `target_role` declarados na automação.
- **Adapter de WhatsApp/Instagram (Fase 2):** validar credenciais por origem. No MVP, stub que loga "not implemented".

## 8. Uploads (Avatares)

- **Bucket:** `avatars` no Supabase Storage.
- **Path:** `<user_id>/<filename>`. RLS valida que o folder do usuário corresponde ao seu `auth.uid()`.
- **Validação client + server:**
  - MIME type: `image/jpeg`, `image/png`, `image/webp` somente.
  - Tamanho max: 2MB.
  - Resize/compress no client antes do upload (browser-image-compression).
- **URLs:** públicas (bucket público) mas path é UUID, sem enumeração.

## 9. Realtime

- Channel `notifications:user_id=eq.<uid>` autenticado via JWT do usuário.
- RLS aplicado em listens (Supabase valida).
- Sem broadcast aberto. Sem channel global.

## 10. Logs

- Server logs estruturados via `console.log` JSON.
- **NUNCA** logar:
  - Senha (mesmo temporária).
  - JWT completo.
  - Email completo (apenas hash ou primeiros 3 chars + domínio).
  - Telefone completo.
  - Conteúdo de `custom_fields` se contiver dados sensíveis.
- Em prod, logs viram alvo de Sentry / Datadog (Fase 2).

## 11. Checklist Pré-Deploy

- [ ] RLS habilitado em todas as tabelas de negócio.
- [ ] Policies revisadas e testadas com diferentes roles.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` ausente do bundle do cliente (verificar `.next/static/`).
- [ ] Zod schemas em todos os route handlers.
- [ ] `NEXT_PUBLIC_*` configurado para preview e prod no Vercel.
- [ ] CORS restrito ao domínio de produção.
- [ ] Security headers configurados (`next.config.js`).
- [ ] CSP testado (sem violations no console).
- [ ] Rate limiting ativo nos endpoints sensíveis.
- [ ] Middleware ativo em todas as rotas privadas (matcher correto).
- [ ] Uploads validam MIME e tamanho server-side.
- [ ] Erros API retornam mensagens genéricas (não vazam stack trace).
- [ ] `console.log` server: apenas eventos relevantes, sem PII.
- [ ] `.gitignore` cobre `.env*`, `.vercel/`, `node_modules/`, `.next/`.
- [ ] `package.json` sem dependências inúteis.
- [ ] Backup Supabase PITR ativo.
- [ ] Senha temporária força troca no primeiro login (`must_change_password=true`).
- [ ] Logout invalida sessão server-side.
- [ ] Engine de automação tem timeout de 5s e profundidade max 5.
- [ ] Audit log bloqueia UPDATE/DELETE via RLS.
- [ ] Constraint unique no slot de call está ativa (calls_slot_unique).
- [ ] Storage `avatars` com RLS por folder = user_id.
