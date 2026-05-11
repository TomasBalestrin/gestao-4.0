# Checklist de Release — Gestão 4.0

Estado: ✅ feito no código · ⚙️ passo manual/ops (painel Supabase / Vercel) · ⏳ verificar antes do deploy

## Pré-deploy (segurança — `security.md` §11)

| Item | Status | Notas |
|------|:---:|------|
| RLS habilitado em todas as tabelas de negócio | ✅ | `supabase/migrations/0007_rls_policies.sql` |
| Policies revisadas e testadas com diferentes roles | ⏳ | testar manualmente: admin, social_selling, closer, financeiro, lider |
| `SUPABASE_SERVICE_ROLE_KEY` ausente do bundle do cliente | ✅ | só usado em `lib/supabase/admin.ts` (server) e rotas/`lib/audit`,`lib/automation`; nunca importado em `"use client"` |
| Zod `safeParse` em todos os route handlers que recebem body | ✅ | `lib/schemas/*` + validação dinâmica de custom fields |
| `NEXT_PUBLIC_*` configurado para preview e prod no Vercel | ⚙️ | Project Settings → Environment Variables |
| CORS restrito ao domínio de produção | ✅ | `next.config.js` → `Access-Control-Allow-Origin = NEXT_PUBLIC_SITE_URL` |
| Security headers (`next.config.js`) | ✅ | X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy, HSTS, CSP |
| CSP sem violations no console | ⏳ | abrir o app em prod e checar o console |
| Rate limiting nos endpoints sensíveis | ✅ | `middleware.ts` — auth 5/min, `cards/*/move` 30/min, `calls` 10/min, geral `/api/*` 60/min (in-memory; trocar por Upstash em multi-instância) |
| Middleware ativo nas rotas privadas (matcher) | ✅ | `middleware.ts` `config.matcher` + guards em `lib/supabase/middleware.ts` |
| Uploads validam MIME e tamanho | ⚙️/✅ | `components/users/avatar-upload.tsx` valida MIME + 2 MB + comprime no client; reforçar com **limite de tamanho no bucket `avatars`** no painel Supabase |
| Erros de API retornam mensagens genéricas (sem stack trace) | ✅ | `server/api-helpers.ts` (`handleApiError`) — `console.error` no server, payload `{ error, code }` |
| `console.log` server: só eventos relevantes, sem PII | ✅ | apenas `console.error` estruturado; auditoria via `lib/audit/logger.ts` |
| `.gitignore` cobre `.env*`, `.vercel/`, `node_modules/`, `.next/` | ✅ | |
| `package.json` sem dependências inúteis | ✅ | stack do `tech-stack.md` |
| Backup Supabase PITR ativo | ⚙️ | painel Supabase → Database → Backups |
| Senha temporária força troca no 1º login (`must_change_password=true`) | ✅ | `POST /api/users` + middleware redireciona para `/setup` + `POST /api/auth/setup-password` zera a flag |
| Logout invalida a sessão server-side | ✅ | `supabase.auth.signOut()` no `user-menu.tsx` (limpa cookies) |
| Engine de automação com timeout 5s e profundidade máx. 5 | ✅ | `lib/automation/engine.ts` (`AUTOMATION_TIMEOUT_MS`, `MAX_AUTOMATION_DEPTH`) |
| Audit log bloqueia UPDATE/DELETE via RLS | ✅ | `0007_rls_policies.sql` — só `SELECT`/`INSERT` policies em `audit_log` |
| Constraint unique no slot de call ativa (`calls_slot_unique`) | ✅ | `0005_horarios_calls.sql` (`EXCLUDE USING gist`) → 409 no conflito |
| Storage `avatars` com RLS por folder = `user_id` | ✅ | `0009_storage.sql` |
| Migrations aplicadas + seed + admin criado | ⚙️ | `supabase db push` (ou SQL Editor) + criar admin no Auth + rodar `supabase/seed.sql` com o UUID real |
| `lib/database.types.ts` regenerado do projeto linkado | ⚙️ | `npx supabase gen types typescript --linked > lib/database.types.ts` (hoje há uma versão escrita à mão) |
| Tabela `notifications` na publication `supabase_realtime` | ⚙️ | painel → Database → Replication, ou `ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;` |
| `npm run build` passa | ✅ | |

## Smoke manual (fluxo end-to-end)

Pré-requisitos: Supabase provisionado, migrations aplicadas, admin criado e `seed.sql` rodado, `.env.local` preenchido, `npm run dev`.

1. **Login admin** — `/login` com o email/senha do admin → cai em `/` e redireciona por role.
2. **Criar funil** — `/admin/funis` → "Novo funil" → nome, etapas (arrastar para reordenar), 1+ campo customizado → salvar → vai para `/admin/funis/[id]`.
3. **Configurar automação** (opcional) — na etapa, ícone bot → "Nova automação" `move_to`/`duplicate_to` + notificação in-app → salvar.
4. **Criar usuário** — `/admin/usuarios` → "Novo usuário" (email, nome, role) → anotar a senha temporária exibida.
5. **(opcional) Login do novo usuário** — em aba anônima: login com a senha temporária → forçado a `/setup` → define nova senha → entra.
6. **Criar card** — `/crm/[funilId]` → "Novo card" numa coluna → lead novo (nome) ou existente + campos do funil → criar → aparece na 1ª etapa.
7. **Mover card** — arrastar o card para outra etapa → persiste; se houver automação, toast "Automação executada"; se falhar, badge de erro no card + banner com "Retry".
8. **Agendar call** — abrir o card → aba "Calls" → "Agendar call" → por data ou por closer → escolher slot (precisa de horário configurado em `/admin/horarios`) → call criada.
9. **Cancelar call** — `/agenda` → clicar o evento → "Cancelar" (confirma) → status vira "Cancelada"; slot volta a ficar disponível.
10. **Marcar presença** — `/agenda` → evento agendado → "Compareceu" / "Não compareceu".
11. **Ver histórico** — abrir o card → aba "Histórico" (timeline) e `/admin/historico` (tabela filtrável, expandir um evento para ver before/after).
12. **Notificações** — sino no header com badge; inserir uma notificação via SQL para o seu `user_id` e ver o toast em tempo real (requer a tabela na publication realtime).
13. **Perfil** — `/perfil` → trocar nome/foto/tema → salvar.
14. **Logout** — menu do avatar → "Sair" → volta para `/login`; tentar acessar `/crm` → redireciona para `/login`.
