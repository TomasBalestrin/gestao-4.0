import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";
import {
  AUTOMATION_TIMEOUT_MS,
  MAX_AUTOMATION_DEPTH,
  notificacaoSchema,
} from "@/lib/schemas/automacao";
import { executeDuplicateTo, executeMoveTo } from "@/lib/automation/actions";
import { dispatchNotification } from "@/lib/automation/notifications";
import { logEvent } from "@/lib/audit/logger";
import type { AutomationExecution, AutomationResult } from "@/types/domain";

type AuthedClient = ReturnType<typeof createClient>;
type AdminClient = ReturnType<typeof createAdminClient>;

const CARD_SELECT =
  "*, lead:leads(*), etapa:etapas(id, nome, cor, ordem), assigned:users!cards_assigned_to_fkey(id, nome, foto_url)";

// ===== Idempotência (best-effort, em memória — MVP single-instance) =====
const recentOps = new Map<string, number>();
const IDEMPOTENCY_WINDOW_MS = 60_000;

function opHash(cardId: string, fromEtapa: string, toEtapa: string): string {
  return `${cardId}:${fromEtapa}->${toEtapa}:${Math.floor(Date.now() / 60_000)}`;
}

function alreadyRanRecently(hash: string): boolean {
  const now = Date.now();
  for (const [k, ts] of recentOps) {
    if (now - ts > 2 * IDEMPOTENCY_WINDOW_MS) recentOps.delete(k);
  }
  const ts = recentOps.get(hash);
  if (ts && now - ts < IDEMPOTENCY_WINDOW_MS) return true;
  recentOps.set(hash, now);
  return false;
}

// ===== Helpers =====
class AutomationFailure extends Error {
  readonly automacaoId: string | null;
  constructor(message: string, automacaoId: string | null) {
    super(message);
    this.name = "AutomationFailure";
    this.automacaoId = automacaoId;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`AUTOMATION_TIMEOUT: limite de ${ms}ms excedido`)),
        ms
      )
    ),
  ]);
}

interface EngineCtx {
  admin: AdminClient;
  userId: string;
  executions: AutomationExecution[];
}

async function processEtapaAutomations(
  ctx: EngineCtx,
  cardId: string,
  etapaId: string,
  depth: number
): Promise<void> {
  if (depth > MAX_AUTOMATION_DEPTH) {
    throw new AutomationFailure(
      "AUTOMATION_DEPTH_EXCEEDED: profundidade máxima de cascata atingida",
      null
    );
  }

  const { data: automacoes, error } = await ctx.admin
    .from("automacoes")
    .select("*")
    .eq("etapa_id", etapaId)
    .eq("ativo", true)
    .order("ordem", { ascending: true });
  if (error) {
    throw new AutomationFailure(
      `Falha ao carregar automações: ${error.message}`,
      null
    );
  }
  if (!automacoes || automacoes.length === 0) return;

  for (const automacao of automacoes) {
    const exec: AutomationExecution = {
      automacao_id: automacao.id,
      nome: automacao.nome,
      action: automacao.action,
      success: true,
    };

    try {
      let cascadeEtapaId: string | null = null;

      // 1. Ação
      if (automacao.action === "move_to") {
        const { data: current } = await ctx.admin
          .from("cards")
          .select("etapa_id")
          .eq("id", cardId)
          .single();
        const fromEtapa = current?.etapa_id ?? etapaId;
        const { targetEtapaId } = await executeMoveTo(
          ctx.admin,
          cardId,
          automacao.config
        );
        if (!alreadyRanRecently(opHash(cardId, fromEtapa, targetEtapaId))) {
          cascadeEtapaId = targetEtapaId;
        }
      } else if (automacao.action === "duplicate_to") {
        await executeDuplicateTo(
          ctx.admin,
          cardId,
          automacao.config,
          ctx.userId
        );
      }

      // 2. Notificações (depois das ações)
      const { data: cardCtx } = await ctx.admin
        .from("cards")
        .select("funil_id")
        .eq("id", cardId)
        .single();
      const notifs = Array.isArray(automacao.notificacoes)
        ? automacao.notificacoes
        : [];
      for (const raw of notifs) {
        const parsed = notificacaoSchema.safeParse(raw);
        if (parsed.success) {
          await dispatchNotification(ctx.admin, parsed.data, {
            cardId,
            funilId: cardCtx?.funil_id ?? "",
          });
        }
      }

      await logEvent({
        entityType: "automacao",
        entityId: automacao.id,
        eventType: "automation_executed",
        userId: ctx.userId,
        after: { card_id: cardId, action: automacao.action },
        metadata: { etapa_id: etapaId },
      });
      ctx.executions.push(exec);

      // 3. Cascata (move_to)
      if (cascadeEtapaId) {
        await processEtapaAutomations(ctx, cardId, cascadeEtapaId, depth + 1);
      }
    } catch (err) {
      exec.success = false;
      exec.error = (err as Error).message;
      ctx.executions.push(exec);
      await logEvent({
        entityType: "automacao",
        entityId: automacao.id,
        eventType: "automation_failed",
        userId: ctx.userId,
        metadata: { card_id: cardId, error: (err as Error).message },
      });
      if (err instanceof AutomationFailure) throw err;
      throw new AutomationFailure((err as Error).message, automacao.id);
    }
  }
}

async function recordAutomationError(
  admin: AdminClient,
  params: {
    cardId: string;
    automacaoId: string | null;
    message: string;
    payload: Json;
  }
): Promise<string | undefined> {
  const code = params.message.startsWith("AUTOMATION_")
    ? (params.message.split(":")[0] ?? "AUTOMATION_FAILED")
    : "AUTOMATION_FAILED";
  const { data, error } = await admin
    .from("automation_errors")
    .insert({
      automacao_id: params.automacaoId,
      card_id: params.cardId,
      payload: params.payload,
      error_message: params.message,
      error_code: code,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[engine] recordAutomationError", error);
    return undefined;
  }
  return data?.id;
}

export interface RunAutomationParams {
  supabase: AuthedClient;
  cardId: string;
  etapaId: string;
  ordemNaEtapa?: number;
  userId: string;
}

export interface RunAutomationOutcome {
  card: unknown;
  result: AutomationResult;
}

/**
 * Engine de automação (síncrono).
 * 1. Aplica a movimentação primária do card (cliente do usuário, RLS).
 * 2. Carrega e executa as automações da etapa de destino como sistema
 *    (service role): move_to (com cascata, depth ≤ 5), duplicate_to,
 *    notificações in-app (WA/IG são stubs). Timeout global de 5s.
 *    Idempotência best-effort por hash (card, origem→destino, minuto).
 * 3. Falha → registra em automation_errors e retorna success:false.
 */
export async function runAutomation({
  supabase,
  cardId,
  etapaId,
  ordemNaEtapa,
  userId,
}: RunAutomationParams): Promise<RunAutomationOutcome> {
  const patch: { etapa_id: string; ordem_na_etapa?: number } = {
    etapa_id: etapaId,
  };
  if (ordemNaEtapa !== undefined) patch.ordem_na_etapa = ordemNaEtapa;

  const { data: movedCard, error: moveError } = await supabase
    .from("cards")
    .update(patch)
    .eq("id", cardId)
    .is("deleted_at", null)
    .select(CARD_SELECT)
    .single();
  if (moveError || !movedCard) {
    throw new Error(moveError?.message ?? "Falha ao mover card");
  }

  const admin = createAdminClient();
  const ctx: EngineCtx = { admin, userId, executions: [] };

  try {
    await withTimeout(
      processEtapaAutomations(ctx, cardId, etapaId, 1),
      AUTOMATION_TIMEOUT_MS
    );
  } catch (err) {
    const automacaoId =
      err instanceof AutomationFailure ? err.automacaoId : null;
    const errorId = await recordAutomationError(admin, {
      cardId,
      automacaoId,
      message: (err as Error).message,
      payload: { card_id: cardId, etapa_id: etapaId } as Json,
    });
    const { data: reloaded } = await admin
      .from("cards")
      .select(CARD_SELECT)
      .eq("id", cardId)
      .single();
    return {
      card: reloaded ?? movedCard,
      result: {
        success: false,
        executions: ctx.executions,
        automation_error_id: errorId,
      },
    };
  }

  const { data: finalCard } = await admin
    .from("cards")
    .select(CARD_SELECT)
    .eq("id", cardId)
    .single();
  return {
    card: finalCard ?? movedCard,
    result: { success: true, executions: ctx.executions },
  };
}
