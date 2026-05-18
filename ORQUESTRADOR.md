# Protocolo de Orquestração Autônoma v3 | Gestão 4.0

> Camada de execução autônoma criada pelo Capitão América v3.
> Customizado para o stack deste projeto.
>
> **v3**: Auto-mode (sequencial/paralelo), cache de leitura, memória externa,
> checkpoint dinâmico, validação multi-task.

## Stack deste projeto

Next.js 14 App Router + TS strict + Supabase + Tailwind + shadcn/ui + dnd-kit + react-big-calendar + Zustand + TanStack Query 5 + RHF + Zod 4.

Detalhes que orientam validação e estilo:
- TypeScript strict com `noUncheckedIndexedAccess`. Sem `any`.
- Path aliases: `@/components`, `@/lib`, `@/hooks`, `@/server`, `@/types`.
- Server Components default. `"use client"` apenas com state/event/browser hook.
- shadcn/ui em `components/ui/*.tsx`. Customização inline.
- Dark mode REMOVIDO. Sem `dark:` classes.
- Identidade Navy DS via CSS vars (`--border-strong`, `--surface-elevated`, `--hairline`, etc).
- TanStack Query 5 pra server state. Zustand pra UI state.
- RHF + Zod 4 pra forms. Schema compartilhado client+server.
- Migrations: `supabase/migrations/000N_descricao.sql` (sequencial).
- RLS sempre ativo em prod. Nova tabela = nova policy.
- z-index: dropdown=950, modal=900 (Radix Portal renderiza no body; dropdown precisa estar acima).
- API routes: `{ data: T }` no sucesso, `{ error, code, details? }` no erro.

Comandos canônicos:
- Build: `npm run build`
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`
- Dev: `npm run dev`

## Artefatos disponíveis

- `CLAUDE.md` (raiz) — regras técnicas do projeto
- `docs/briefing.md`, `PRD.md`, `tech-stack.md`, `architecture.md`, `schema.md`, `security.md`, `ux-flows.md`, `instrucoes.md`
- `docs/TASKS.md` — fonte da verdade (greenfield)
- `docs/changes/<arquivo>.md` — planos de mudança (modo EDIT)
- `docs/progress.html` — dashboard visual
- `docs/contexto/sessao-atual.md` — resumo denso (@arquivista)
- `docs/contexto/decisoes.md` — log NÍVEL 2
- `docs/contexto/padroes-descobertos.md` — gotchas
- `docs/contexto/arquivos-criados.md` — registro de mudanças
- `docs/contexto/cache.md` — hashes de arquivos lidos (cache de sessão)
- `docs/contexto/paralelizacao.md` — análise de dependências
- `supabase/migrations/*.sql`

## Cada task segue o formato Capitão

```
### [ID] ⬜ [🟢|🟡|🔴] [Título]
CRIAR: [arquivos novos]
EDITAR: [arquivos a modificar]
LER: [arquivos contexto, não modifica]
NÃO TOCAR: [arquivos protegidos]
Depende de: [task IDs] (ou "nenhuma")
Paralelo com: [task IDs] (ou "nenhuma")
Steps: 1... 2... N
Critério: [verificável]
```

Retorno do agente: ✅ (sucesso), ⚠️ (sucesso com nota), ❌ (falha + diagnóstico).

---

# LOOP PRINCIPAL

Disparado por `/start` (TASKS.md), `/start changes/<arquivo>.md` (EDIT), ou `/continue`.

## PASSO 0: AUTO-DETECTION DE MODO

Executar UMA VEZ no início da sessão.

### 0.1 Inicialização
- Se `docs/contexto/` não existir: criar pasta + 6 arquivos com templates iniciais (sessao-atual, decisoes, padroes-descobertos, arquivos-criados, cache, paralelizacao).
- Carregar `docs/contexto/cache.md` na memória.
- Inicializar `tasks_nesta_sessao = 0`.

### 0.2 Análise do projeto
Ler:
- Fonte da verdade: `docs/TASKS.md` ou último change file ativo.
- Contar tasks `[ ]` viáveis (dependências cumpridas).
- Mapear dependências e arquivos CRIAR/EDITAR de cada task.

### 0.3 Decisão automática de modo

| Sinal | Modo |
|---|---|
| Modo EDIT (change file ativo) | **SEQUENCIAL** |
| TASKS.md tem ≤8 tasks viáveis | **SEQUENCIAL** |
| Alguma task envolve auth/billing/security/RLS/migrations | **SEQUENCIAL** forçado |
| 9-15 tasks viáveis com 2+ clusters independentes | **PARALELO 2** |
| 16+ tasks com 3+ clusters independentes | **PARALELO 3** |
| Default | **SEQUENCIAL** |

**Cluster independente**: grupo de tasks cujos arquivos CRIAR/EDITAR são disjuntos do resto.

### 0.4 Override manual
Se Bethel disse "use sequencial" ou "use paralelo N", respeitar.

### 0.5 Anunciar e prosseguir

```
🎯 MODO {{MODO_ESCOLHIDO}}
- Tasks viáveis: N
- Clusters detectados: K
- Checkpoint a cada: M tasks
- Janela estimada: ~XK tokens
```

M: SEQUENCIAL=10, PARALELO 2=6, PARALELO 3=4.

Salvar em `docs/contexto/paralelizacao.md`. NÃO esperar confirmação.

---

## PASSO 1: LEITURA DE ESTADO COM CACHE

1. Calcular hash do arquivo: `git hash-object <arquivo>`
2. Comparar com `docs/contexto/cache.md`
3. Igual: **pular leitura**. Diferente: ler e atualizar cache.

Arquivos cacheáveis: `CLAUDE.md`, `docs/architecture.md`, `docs/tech-stack.md`, `docs/security.md`, `docs/ux-flows.md`, `package.json`, `tsconfig.json`.

Arquivos SEMPRE relidos: fonte da verdade, `sessao-atual.md`, `decisoes.md`, `arquivos-criados.md`, `pendente-revisao.md`.

Após leitura: aplicar Retomada de Sessão se vier de `/continue`.

---

## PASSO 2: SELEÇÃO DE TASKS

### Modo SEQUENCIAL
- Próxima task `[ ]` em ordem, com dependências cumpridas.
- Nenhuma viável: ir pro Encerramento.

### Modo PARALELO N
- Listar TODAS tasks `[ ]` com deps cumpridas.
- Aplicar **3 checagens** entre candidatas:
  1. **CRIAR disjunto**: arquivos em CRIAR de X e Y são diferentes?
  2. **EDITAR disjunto**: arquivos em EDITAR de X e Y são diferentes?
  3. **Cross-violation**: arquivos em CRIAR/EDITAR de X não estão em NÃO TOCAR de Y, e vice-versa?
- Selecionar até N que passam em todas.
- 1 passar: roda sequencial nessa iteração. 0: Encerramento.

Salvar em `paralelizacao.md`.

---

## PASSO 3: PREPARAÇÃO

Pra cada task: ler bloco completo + arquivos LER (com cache) + confirmar escopo.

---

## PASSO 4: EXECUÇÃO

### Modo SEQUENCIAL
- Implementar Steps. Respeitar NÃO TOCAR. Em ambiguidade: Hierarquia de Decisão.

### Modo PARALELO N
- Lançar N subagents simultaneamente (1 task cada).
- Cada um recebe: ID, bloco, LER já no contexto, CLAUDE.md cacheado.
- Aguardar TODOS antes do PASSO 5.

**Prompt do subagent paralelo**:
```
Task [ID] em paralelo com outras.

Bloco completo: [task block]
LER já em contexto: [conteúdo]

REGRAS:
1. Execute SÓ os Steps desta task
2. NÃO toque fora de CRIAR/EDITAR
3. NÃO leia extras
4. NÃO faça commit (orquestrador comita)
5. Retorne: ✅ + arquivos | ❌ + diagnóstico
```

---

## PASSO 5: VALIDAÇÃO

### Sequencial
- `@validador` passando ID. 3 ciclos máx. 3 reprovações: NÍVEL 3, `[?]`, pula.

### Paralelo
- `@validador` N vezes em paralelo (1 por task).
- Aprovadas: PASSO 6. Reprovadas: corrigir sequencialmente (3 ciclos cada).
- Revalidar paralelamente após correção.

---

## PASSO 6: FECHAMENTO

**Ordem rigorosa**:

Sequencial: 1 task, trivial.

Paralelo: tasks aprovadas fechadas **SEQUENCIALMENTE**:
- Task 1: TASKS.md `[ ]→[x]` → progress.html → arquivos-criados.md → commit
- Task 2: idem
- Task N: idem

Cada commit: `<tipo>(task-N): <título>`.

Reprovadas após 3 ciclos: `[?]` + entrada em `pendente-revisao.md`.

Atualizar `progress.html` usando classes CSS já presentes (não alterar layout).

---

## PASSO 7: CHECKPOINT DINÂMICO

`tasks_nesta_sessao += N` (tasks fechadas com `[x]`).

**Checkpoint a cada M**:
- SEQUENCIAL: M=10
- PARALELO 2: M=6
- PARALELO 3: M=4

Quando `tasks_nesta_sessao % M == 0`:
- Invocar `@arquivista` em paralelo com próximo loop (não bloqueia).

**Parada proativa** quando `tasks_nesta_sessao >= 2×M`:
- SEQUENCIAL: 20, PARALELO 2: 12, PARALELO 3: 8

Invocar `@arquivista` última vez e reportar:

```
🛑 CHECKPOINT DE SESSÃO

<N> tasks concluídas neste modo. Parando voluntariamente.

Estado salvo:
- docs/contexto/sessao-atual.md
- docs/TASKS.md
- git log

Para continuar:
1. Nova sessão Claude Code
2. /continue

Tasks restantes: K
Próxima viável: [ID]
```

PARAR.

---

## PASSO 8: LOOP

Se não bateu checkpoint: voltar ao PASSO 1.

Continuar até: esgotar viáveis, todas dependerem de pendentes, ou parada proativa.

---

# HIERARQUIA DE DECISÃO

### NÍVEL 1: decide e segue
Resposta explícita em CLAUDE.md, PRD.md, tech-stack.md, architecture.md, schema.md, security.md, ux-flows.md.
Aplica e prossegue, sem registro.

### NÍVEL 2: decide e loga
Escolha técnica menor sem impacto em produto/UX/custo/segurança.
Aplica best practice + registra em `docs/contexto/decisoes.md`:

```
## YYYY-MM-DD HH:MM | Task N
Contexto: <1-2 linhas>
Opções: A | B
Escolhido: A
Justificativa: <1 linha>
```

### NÍVEL 3: cria pendência e pula
Decisão afeta produto/UX/estratégia/custo recorrente/segurança ou contradiz docs.
Adiciona em `docs/pendente-revisao.md`, marca `[?]`, pula.

---

# REGRAS DE NÃO IMPROVISO (HARD STOP)

Nunca sem confirmação:
- Instalar pacote não previsto em tech-stack.md (NÍVEL 3)
- Criar pasta/arquivo fora de architecture.md
- Modificar schema sem atualizar schema.md
- Apagar/renomear arquivos fora de EDITAR
- `rm -rf` fora de node_modules/.next/dist, `drop table`, `truncate`, `git push --force`, `git reset --hard` em commits remotos
- Tocar em `.env*`, secrets, `SETUP.md`
- `npm publish`, `vercel deploy --prod`, `supabase db push` em projeto remoto
- **Paralelo**: modificar arquivo fora de CRIAR/EDITAR da task

Se task pedir algo da lista: NÍVEL 3, pula.

---

# RETOMADA DE SESSÃO (`/continue`)

Antes do PASSO 0:

1. **Leitura obrigatória**:
   - `docs/contexto/sessao-atual.md`
   - `docs/contexto/padroes-descobertos.md`
   - `docs/contexto/decisoes.md`
   - `docs/contexto/arquivos-criados.md`
   - `docs/contexto/cache.md`
   - Fonte da verdade
   - `docs/pendente-revisao.md` se existir
   - `git log -10 --oneline`

2. **Processar RESOLVIDOS** em pendente-revisao.md: aplicar, marcar APLICADO, voltar `[?]→[ ]` ou executar direto.

3. **Reset** `tasks_nesta_sessao = 0`.

4. **Continuar** a partir do PASSO 0.

---

# ENCERRAMENTO DE SESSÃO

Quando esgotar viáveis (não pelo checkpoint):

```
✅ SESSÃO ENCERRADA

Modo: {{MODO}}
Tasks concluídas: N
  - [ID] título (commit hash)
Tasks [?]: K
Decisões NÍVEL 2: M
Tempo: HH:MM
Eficiência: X tasks/h

Próxima ação: <revisar pendente | nova feature | deploy>
```

---

# TEMPLATES DOS ARQUIVOS DE CONTEXTO

Se não existirem no PASSO 0.1, criar com templates em `docs/contexto/`. (Já criados na bootstrap deste orquestrador.)
