import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/database.types";
import type { AuditEntityType, AuditEventType } from "@/types/domain";

export interface LogEventParams {
  entityType: AuditEntityType;
  entityId: string;
  eventType: AuditEventType;
  userId: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
}

function toJson(value: unknown): Json | null {
  if (value === undefined || value === null) return null;
  return value as Json;
}

// Best-effort: registra um evento no audit_log via service role.
// Falha de logging NUNCA bloqueia a operação principal.
export async function logEvent(params: LogEventParams): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("audit_log").insert({
      entity_type: params.entityType,
      entity_id: params.entityId,
      event_type: params.eventType,
      user_id: params.userId,
      before: toJson(params.before),
      after: toJson(params.after),
      metadata: toJson(params.metadata),
    });
    if (error) {
      console.error("[audit/logger] insert error", error);
    }
  } catch (err) {
    console.error("[audit/logger] logEvent failed", err);
  }
}
