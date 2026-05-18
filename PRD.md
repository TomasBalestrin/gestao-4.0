> 🦾 Iron Man | 2026-05-09 | v1.0

# Gestão 4.0 — PRD

## 1. Visão

### Problema
Operação interna fragmentada entre planilhas, agendas avulsas e mensagens dispersas. Time de Social Selling perde leads por falta de funil estruturado. Closers têm overbook por agendamento manual. Sem histórico auditável de movimentação de leads.

### Solução
Plataforma single-tenant unificando: funis kanban com automações, agenda com slots reais por closer, histórico append-only filtrável, e estrutura preparada para mensageria (WhatsApp/Instagram) e roles adicionais na Fase 2.

### Personas

**Admin** [P0]
Operador da plataforma. Configura funis, etapas, automações, usuários, horários. Vê tudo.

**Social Selling** [P0]
Vendedor/SDR usando o kanban diariamente. Cria leads, move cards, agenda calls. RBAC by-owner-or-admin.

**Closer** [P1, sem UI no MVP]
Modelado no banco. Recebe agenda. UI futura.

**SDR / Financeiro / Líder** [P2, sem UI no MVP]
Modelados no banco. UI futura.

### KPIs

| KPI | Target MVP |
|-----|-----------|
| Tempo médio para criar lead + atribuir funil | < 30s |
| Calls agendadas via plataforma | 100% (vs 0% hoje) |
| Movimentações registradas no audit log | 100% |
| Slots com conflito de agendamento | 0 |
| Falhas de automação não recuperadas | < 5% |
| Latência drag-to-drop com automação | < 800ms p95 |

## 2. Features

### F-01 Autenticação e Onboarding [P0]

**Descrição**
Login via email/senha (Supabase Auth). Admin cria usuário com senha temporária. Primeiro login força troca. Reset via email.

**User Stories**
- Como Admin, quero criar usuário com senha temporária para que ele acesse no primeiro dia.
- Como usuário, quero trocar minha senha no primeiro login para garantir que só eu acesse minha conta.
- Como usuário, quero resetar senha por email se esqueci.

**Critérios de Aceitação**
- [ ] Admin cria usuário informando email, nome, role.
- [ ] Sistema gera senha temporária e envia por email (Supabase Magic Link OU senha gerada).
- [ ] No primeiro login, sistema redireciona para `/auth/setup` forçando nova senha.
- [ ] Reset de senha funcional via "Esqueci minha senha".
- [ ] Senha mínima 8 caracteres com 1 número e 1 letra.
- [ ] Sessão expira em 7 dias por padrão.

**Regras**
- Email único por usuário.
- Role definida na criação, editável só por Admin.
- Usuário inativo (`is_active=false`) não consegue logar.

### F-02 Gestão de Funis [P0]

**Descrição**
Admin cria funis com etapas, define `role_alvo`, custom fields, automações por etapa, e usuários autorizados.

**User Stories**
- Como Admin, quero criar funil com nome, cor e role alvo para organizar a operação por equipe.
- Como Admin, quero adicionar/remover/reordenar etapas para refletir o processo real.
- Como Admin, quero definir custom fields por funil para capturar dados específicos do contexto.
- Como Admin, quero autorizar usuários a verem o funil para controlar acesso.

**Critérios de Aceitação**
- [ ] CRUD de funil com nome, cor, role_alvo, descrição opcional.
- [ ] Etapas com nome, cor, ordem (drag para reordenar).
- [ ] Custom fields configuráveis: text, number, date, select, multi_select, currency, phone, email, textarea.
- [ ] Lista de usuários autorizados (multi-select).
- [ ] Soft delete: funil arquivado mantém cards mas não aceita novos.
- [ ] Validação: funil precisa de pelo menos 1 etapa.

**Regras**
- `role_alvo` define qual role opera o funil (Admin sempre tem acesso).
- Etapa só pode ser deletada se não tiver cards. Caso contrário, arquivar.
- Reordenar etapas não dispara automação.

### F-03 Gestão de Usuários [P0]

**Descrição**
CRUD de usuários com email, nome, role, foto, status do número (placeholder), is_active.

**User Stories**
- Como Admin, quero criar usuário definindo role para que ele tenha acesso correto.
- Como Admin, quero desativar usuário sem deletar para preservar histórico.
- Como usuário, quero editar meu nome e foto no perfil.

**Critérios de Aceitação**
- [ ] CRUD com email, nome, role, foto (Supabase Storage).
- [ ] Toggle `is_active`.
- [ ] Filtro por role e status.
- [ ] Placeholder de status do número (badge UI, sem integração).
- [ ] Usuário comum edita apenas próprio perfil.

**Regras**
- Role só editável por Admin.
- Email não editável após criação (gera novo usuário).
- Deletar usuário com cards atribuídos: bloquear, sugerir desativar.

### F-04 Horários (Disponibilidade dos Closers) [P0]

**Descrição**
Admin configura disponibilidade por closer, dia da semana, blocos de horário, duração de slot, buffer.

**User Stories**
- Como Admin, quero configurar disponibilidade do closer para cada dia da semana com blocos e slots.
- Como Admin, quero usar template padrão para acelerar configuração inicial.
- Como Admin, quero ver lista de closers com indicador visual de quem já tem horários configurados.

**Critérios de Aceitação**
- [ ] Lista de cards (1 por closer) com nome, foto, status (configurado/pendente).
- [ ] Modal de configuração com tabs por dia da semana.
- [ ] Cada dia: N blocos de horário (HH:mm-HH:mm), duração de slot (5/10/15/20/30/45/60min), buffer (0/5/10/15min).
- [ ] Template inicial ao criar closer: seg-sex 09:00-12:00 / 14:00-18:00, slots 30min, buffer 10min.
- [ ] Geração de slots derivados a partir de blocos + duração + buffer (computed via view ou função).
- [ ] Validação: bloco não pode sobrepor outro bloco do mesmo dia.

**Regras**
- Slots são gerados sob demanda a partir da config (não persistidos individualmente, exceto quando agendados).
- Buffer aplica-se entre slots dentro do mesmo bloco.
- Mudança de config não afeta slots já agendados.

### F-05 CRM Kanban [P0]

**Descrição**
Visualização kanban de cards de um funil. Drag-and-drop entre etapas. Custom fields dinâmicos no detalhe do card.

**User Stories**
- Como Social Selling, quero ver cards do funil em colunas para visualizar pipeline.
- Como Social Selling, quero arrastar card entre etapas e disparar automações.
- Como Social Selling, quero abrir card e editar custom fields, agendar call, ver histórico.
- Como Social Selling, quero criar lead+card direto da tela do kanban.

**Critérios de Aceitação**
- [ ] Colunas = etapas do funil. Cards renderizados por etapa.
- [ ] Drag-and-drop com `dnd-kit`. Loading state durante automação.
- [ ] Modal de detalhe do card com: dados do lead, custom fields editáveis, calls agendadas, histórico do card.
- [ ] Botão "Novo card" cria lead + card no funil atual.
- [ ] RBAC: Social Selling vê apenas cards próprios ou onde é `assigned_to`.
- [ ] Filtros: por usuário atribuído, por status, por busca textual no nome do lead.
- [ ] Performance: kanban com até 500 cards visíveis sem lag (virtualização se necessário).

**Regras**
- Mover card entre etapas dispara automação síncrona se configurada.
- Falha de automação reverte movimentação visualmente, exibe toast de erro com botão "Retry".
- Custom fields validados via Zod schema dinâmico antes de salvar.

### F-06 Automações [P0]

**Descrição**
Por etapa, Admin configura automações que disparam ao mover card para a etapa.

**User Stories**
- Como Admin, quero adicionar automação "mover para" na etapa para criar fluxo automático.
- Como Admin, quero adicionar automação "duplicar para" para gerar cards em outros funis.
- Como Admin, quero configurar notificações in-app realtime para roles específicas.

**Critérios de Aceitação**
- [ ] Modal de automação acessível via ícone bot na etapa.
- [ ] Ações: `move_to` (target: funil + etapa), `duplicate_to` (target: array de [funil + etapa]).
- [ ] Notificações configuráveis: WhatsApp (placeholder), Instagram (placeholder), in-app realtime (target: role).
- [ ] Ordem de execução: ações primeiro, notificações depois.
- [ ] Engine síncrono: dispara na request do drag.
- [ ] Falha: log em `automation_errors`, UI de retry manual.

**Regras**
- "mover para" é terminal (card vira único na nova etapa).
- "duplicar para" preserva card original e cria filhos com `parent_card_id`.
- Loop infinito (etapa A → etapa B → etapa A) detectado por contador de profundidade (max 5).

### F-07 Agenda [P0]

**Descrição**
Calendário mês/semana/dia exibindo calls agendadas.

**User Stories**
- Como Social Selling, quero ver agenda em mês/semana/dia para planejar.
- Como Social Selling, quero clicar em call para ver detalhes (lead, card, closer, status).
- Como Social Selling, quero cancelar call que eu agendei.

**Critérios de Aceitação**
- [ ] Visões mês/semana/dia com `react-big-calendar`.
- [ ] Filtro por closer e por status (agendada, realizada, cancelada, no-show).
- [ ] Modal de detalhe com link para o card.
- [ ] Botão "Cancelar" libera slot e registra no histórico.
- [ ] Admin vê agenda de todos. Social Selling vê apenas calls que agendou.

**Regras**
- Cancelamento por vendedor que agendou OU Admin.
- Call passa do horário sem ação fica `no_show` (job de transição diário).
- Closer marca "compareceu" manualmente após a call.

### F-08 Agendamento de Call no Card [P0]

**Descrição**
A partir do card, Social Selling agenda call escolhendo data específica OU closer.

**User Stories**
- Como Social Selling, quero agendar call escolhendo data e closer disponível.
- Como Social Selling, quero ver slots disponíveis do closer para data específica.
- Como Social Selling, quero ver alternativas se o slot escolhido não estiver disponível.

**Critérios de Aceitação**
- [ ] Modal "Agendar call" no card com 2 fluxos: por data OR por closer.
- [ ] Por data: escolhe data → sistema lista slots de todos os closers disponíveis naquela data.
- [ ] Por closer: escolhe closer → sistema lista próximos slots disponíveis (próximos 14 dias).
- [ ] Confirmação trava o slot atomicamente (constraint unique).
- [ ] Em caso de conflito (alguém agendou antes), retorna lista atualizada com erro amigável.
- [ ] Notas opcionais sobre a call.

**Regras**
- Trava de slot imediata via constraint `(closer_id, slot_start)`.
- Cancelamento libera slot.
- Só agenda em slots futuros (validação no backend).

### F-09 Histórico (Audit Log) [P0]

**Descrição**
Log append-only de todas as operações relevantes.

**User Stories**
- Como Admin, quero ver histórico filtrado por entidade ou tipo de evento.
- Como Admin, quero auditar movimentações de cards específicos.
- Como Social Selling, quero ver histórico do card que estou trabalhando.

**Critérios de Aceitação**
- [ ] Tela `/admin/historico` com filtros: tipo de entidade, ID de entidade, tipo de evento, usuário, range de data.
- [ ] Paginação server-side (50 por página).
- [ ] Histórico do card visível no modal de detalhe.
- [ ] Eventos registrados: `card_created`, `card_updated`, `card_moved`, `card_deleted`, `lead_created`, `lead_updated`, `lead_deleted`, `call_scheduled`, `call_cancelled`, `call_no_show`, `automation_executed`, `automation_failed`.
- [ ] Payload JSONB com `before` e `after` para edições.

**Regras**
- Append-only. Sem update, sem delete.
- Sem TTL (forever).
- NÃO registra login/logout.

### F-10 Notificações In-App [P0]

**Descrição**
Sistema de notificações realtime via Supabase Realtime.

**User Stories**
- Como usuário, quero ver toast quando algo importante acontece.
- Como usuário, quero ver sino com contador de não lidas.
- Como usuário, quero abrir lista de notificações e marcar como lidas.

**Critérios de Aceitação**
- [ ] Toast visual no evento (Sonner ou similar).
- [ ] Sino no header com badge contador (não lidas).
- [ ] Dropdown com lista paginada (últimas 50).
- [ ] Marca como lida ao abrir o dropdown.
- [ ] Mantém histórico após leitura.
- [ ] Subscribe em `notifications` filtrado por `user_id`.

**Regras**
- Notificações persistidas em tabela.
- Realtime opcional (fallback: refetch ao focar tab).

### F-11 Configurações Globais [P1]

**Descrição**
Tela de configurações da plataforma.

**Critérios de Aceitação**
- [ ] Funil de inbound padrão (select de funis ativos).
- [ ] Toggle de tema padrão (dark/light).
- [ ] Configurações expansíveis por chave/valor (key-value store).

### F-12 Tema Dark/Light [P0]

**Descrição**
Toggle de tema persistido por usuário.

**Critérios de Aceitação**
- [ ] Toggle no header.
- [ ] Persistência em localStorage + sincronização com `users.theme_preference`.
- [ ] Variáveis CSS via Tailwind dark mode class.

## 3. Modelo de Dados (resumo, detalhe em schema.md)

Entidades principais:

| Entidade | Campos-chave | Relacionamentos |
|----------|--------------|-----------------|
| `users` | id, email, nome, role, is_active, theme_preference | 1:N → cards (assigned_to), calls, audit_log |
| `roles` | id (enum), nome, descricao | 1:N → users |
| `funis` | id, nome, cor, role_alvo, custom_fields_schema (JSONB), is_archived | 1:N → etapas, automacoes, cards |
| `etapas` | id, funil_id, nome, cor, ordem | 1:N → cards, automacoes |
| `funil_usuarios` | funil_id, user_id | M:N entre funis e users |
| `leads` | id, nome, email, telefone, origem | 1:N → cards |
| `cards` | id, lead_id, funil_id, etapa_id, assigned_to, custom_fields (JSONB), parent_card_id | N:1 lead, funil, etapa |
| `automacoes` | id, etapa_id, tipo (move_to/duplicate_to), config (JSONB), notificacoes (JSONB) | N:1 etapa |
| `automation_errors` | id, automacao_id, card_id, payload, error, retry_count | N:1 automacao, card |
| `closer_horarios` | id, closer_id, dia_semana, blocos (JSONB), slot_duration_min, buffer_min | N:1 user |
| `calls` | id, card_id, closer_id, scheduled_by, slot_start, slot_end, status, notes | N:1 card, closer, scheduled_by |
| `audit_log` | id, entity_type, entity_id, event_type, user_id, before (JSONB), after (JSONB), created_at | N:1 user |
| `notifications` | id, user_id, tipo, titulo, descricao, link, read_at, created_at | N:1 user |
| `configuracoes_globais` | key (PK), value (JSONB), updated_at | — |

## 4. API Routes

Padrão: Next.js Route Handlers em `app/api/...`. Auth via Supabase JWT no header `Authorization: Bearer <token>` ou cookie httpOnly.

### Auth
- `POST /api/auth/setup-password` — troca senha temporária no primeiro login. Auth: usuário autenticado em modo setup.

### Funis
- `GET /api/funis` — lista funis visíveis ao usuário. Resposta: `Funil[]`.
- `POST /api/funis` — cria funil. Auth: Admin. Body: `{ nome, cor, role_alvo, custom_fields_schema }`.
- `GET /api/funis/[id]` — detalhe + etapas + automações.
- `PATCH /api/funis/[id]` — edita. Auth: Admin.
- `DELETE /api/funis/[id]` — soft delete (arquiva). Auth: Admin.
- `POST /api/funis/[id]/etapas` — adiciona etapa.
- `PATCH /api/funis/[id]/etapas/[etapa_id]` — edita etapa.
- `POST /api/funis/[id]/etapas/reorder` — reordena. Body: `{ ordem: [etapa_id...] }`.
- `DELETE /api/funis/[id]/etapas/[etapa_id]` — só se sem cards.

### Cards
- `GET /api/funis/[id]/cards` — lista cards do funil (com RBAC). Query: `?assigned_to&status&q&limit&offset`.
- `POST /api/funis/[id]/cards` — cria card (e lead se não existir).
- `GET /api/cards/[id]` — detalhe.
- `PATCH /api/cards/[id]` — edita custom fields, assigned_to.
- `POST /api/cards/[id]/move` — move para outra etapa. Dispara automação síncrona. Body: `{ etapa_id }`. Resposta: `{ success, card, automation_result }` ou `{ success: false, error, automation_error_id }`.
- `DELETE /api/cards/[id]` — soft delete.

### Leads
- `GET /api/leads` — lista. Filtro `?q`.
- `POST /api/leads` — cria.
- `GET /api/leads/[id]` — detalhe + cards relacionados.
- `PATCH /api/leads/[id]` — edita.
- `DELETE /api/leads/[id]` — soft delete (cards mantidos).

### Automações
- `GET /api/etapas/[id]/automacoes` — lista automações da etapa.
- `POST /api/etapas/[id]/automacoes` — cria.
- `PATCH /api/automacoes/[id]` — edita.
- `DELETE /api/automacoes/[id]` — remove.
- `POST /api/automation-errors/[id]/retry` — retry manual.

### Usuários
- `GET /api/users` — lista. Auth: Admin.
- `POST /api/users` — cria com senha temporária. Auth: Admin.
- `PATCH /api/users/[id]` — edita. Auth: Admin (qualquer campo) OU próprio usuário (nome, foto, theme_preference).
- `POST /api/users/[id]/deactivate` — desativa. Auth: Admin.

### Horários
- `GET /api/closer-horarios/[user_id]` — config do closer.
- `PUT /api/closer-horarios/[user_id]` — substitui config.
- `GET /api/closer-horarios/[user_id]/slots` — gera slots disponíveis. Query: `?date_start&date_end`.

### Calls
- `GET /api/calls` — lista. Filtros: closer, scheduled_by, status, range.
- `POST /api/calls` — agenda. Body: `{ card_id, closer_id, slot_start, notes }`. Resposta: 201 ou 409 (slot ocupado).
- `PATCH /api/calls/[id]/cancel` — cancela. Auth: agendador OR Admin.
- `PATCH /api/calls/[id]/attendance` — marca compareceu/não. Auth: closer da call OR Admin.

### Histórico
- `GET /api/audit-log` — lista paginada. Filtros: `entity_type`, `entity_id`, `event_type`, `user_id`, `from`, `to`. Auth: Admin.
- `GET /api/audit-log/card/[id]` — histórico do card. Auth: dono do card OR Admin.

### Notificações
- `GET /api/notifications` — lista. Auth: usuário (apenas próprias).
- `POST /api/notifications/mark-read` — marca como lidas. Body: `{ ids: [] }` ou `{ all: true }`.

### Configurações
- `GET /api/configuracoes` — lê todas.
- `PATCH /api/configuracoes/[key]` — atualiza chave. Auth: Admin.

### Erros padronizados
```json
{ "error": "string", "code": "ERR_CODE", "details": {} }
```
Códigos: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION`, `CONFLICT`, `INTERNAL`, `AUTOMATION_FAILED`.

## 5. Integrações

### MVP

| Integração | Tipo | Dados | Fallback |
|-----------|------|-------|----------|
| Supabase Auth | SDK | Email, senha, sessão | — |
| Supabase Realtime | WebSocket | Notificações, atualizações de cards | Refetch ao focar |
| Supabase Storage | SDK | Foto de perfil | — |

### Fase 2 (abstratas no MVP)

| Integração | Tipo | Dados | Status |
|-----------|------|-------|--------|
| WhatsApp (provedor TBD) | REST/Webhook | Envio de mensagens, recebimento de leads | Adapter pattern, sem implementação |
| Instagram (Meta API) | REST/Webhook | Mensagens DM | Adapter pattern, sem implementação |
| Google Calendar | OAuth2/REST | Sync de calls | Não implementado |

## 6. Auth & Roles

### Método
Supabase Auth (email + senha). JWT em cookie httpOnly. Sessão 7 dias.

### Tabela de Permissões

| Recurso | Admin | Social Selling | Closer (futuro) | SDR | Financeiro | Líder |
|---------|:-----:|:--------------:|:---------------:|:---:|:----------:|:-----:|
| Funis CRUD | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Funis ler (autorizados) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cards criar/editar próprios | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Cards ler todos | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Automações CRUD | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Usuários CRUD | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Perfil próprio editar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Horários gerenciar | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Agenda ler todas | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Agenda ler próprias | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Audit log ler | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Configurações | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Fluxo Onboarding
1. Admin cria usuário via `/admin/usuarios/novo`.
2. Sistema gera senha temporária + envia email.
3. Usuário acessa `/login`, insere credenciais.
4. Sistema detecta `must_change_password=true` e redireciona para `/auth/setup`.
5. Usuário define nova senha. Flag limpa.
6. Redireciona para dashboard da role.

## 7. Não-funcionais

### Performance
- LCP < 2.5s em desktop com conexão 4G simulada.
- Drag-to-drop com automação síncrona: < 800ms p95.
- Listagem de kanban com 500 cards: < 1s.
- API responses: < 300ms p95 para reads.

### Escalabilidade
- 50 usuários simultâneos.
- 10k cards no primeiro semestre.
- Supabase Pro suficiente. Migrar para Team se >100k cards.
- Conexão pooling via Supabase Supavisor.

### Segurança
- RLS habilitado em todas as tabelas com dados de negócio.
- Validação Zod em todas as routes.
- Rate limiting via Vercel Edge Middleware (TBD).

### SEO
N/A. Plataforma interna, sem páginas públicas indexadas.

### Observabilidade
- Logs estruturados via `console.log` JSON.
- Sentry para erros (Fase 2).
- Vercel Analytics ativado.

## 8. Roadmap

### Fase 1 — MVP (target: 6-8 semanas)
- Wave A: Auth + estrutura base + design system. (Semana 1-2)
- Wave B: Funis CRUD + Etapas + Custom Fields. (Semana 2-3)
- Wave C: CRM Kanban + Drag&Drop. (Semana 3-4)
- Wave D: Automações + Engine síncrono. (Semana 4-5)
- Wave E: Usuários + Horários + Calls + Agenda. (Semana 5-6)
- Wave F: Audit Log + Notificações + Configurações + Polish. (Semana 7-8)

### Fase 2 — Pós-MVP
- UI Closer + SDR + Financeiro + Líder.
- Integração WhatsApp.
- Integração Instagram.
- Sync Google Calendar.
- Dashboard analítico.
- Mobile/PWA.

## 9. Riscos

| Risco | Prob. | Impacto | Mitigação |
|-------|:-----:|:-------:|-----------|
| Engine síncrono trava UI no drag | Média | Alto | Loading state, timeout de 5s, log de erro com retry |
| Concorrência no slot de call | Baixa | Médio | Constraint unique no banco + tratamento 409 no client |
| Custom fields JSONB sem validação forte | Média | Médio | Schema Zod gerado dinâmico server-side |
| Volume cresce além do estimado | Baixa | Alto | Índices preparados, plano upgrade Supabase Team |
| Realtime falha silenciosamente | Média | Baixo | Fallback refetch + lista persistente |
| Cascata de "duplicar para" cria loop | Baixa | Alto | Contador de profundidade max 5 |
| Usuário esquece senha temporária | Alta | Baixo | Reset via email Supabase nativo |
| Perda de funil arquivado por engano | Baixa | Alto | Soft delete + endpoint de restauração [INFERIDO] |
