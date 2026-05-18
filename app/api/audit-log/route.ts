import { NextRequest } from "next/server";

import { requireAuth } from "@/server/auth";
import type { Database } from "@/lib/database.types";
import { ApiError, handleApiError, ok } from "@/server/api-helpers";

type AuditEntityType = Database["public"]["Enums"]["audit_entity_type"];
type AuditEventType = Database["public"]["Enums"]["audit_event_type"];

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireAuth();
    const sp = req.nextUrl.searchParams;

    const page = Math.max(1, Number(sp.get("page") ?? "1") || 1);
    const offset = (page - 1) * PAGE_SIZE;

    let query = supabase
      .from("audit_log")
      .select("*, user:users(id, nome)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    const entityType = sp.get("entity_type");
    const entityId = sp.get("entity_id");
    const eventType = sp.get("event_type");
    const userId = sp.get("user_id");
    const from = sp.get("from");
    const to = sp.get("to");
    if (entityType) {
      query = query.eq("entity_type", entityType as AuditEntityType);
    }
    if (entityId) query = query.eq("entity_id", entityId);
    if (eventType) {
      query = query.eq("event_type", eventType as AuditEventType);
    }
    if (userId) query = query.eq("user_id", userId);
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);

    const { data, error, count } = await query;
    if (error) {
      console.error("[GET /api/audit-log]", error);
      throw new ApiError("INTERNAL", "Falha ao listar histórico");
    }

    return ok({
      items: data ?? [],
      total: count ?? 0,
      page,
      pageSize: PAGE_SIZE,
    });
  } catch (err) {
    return handleApiError(err, "GET /api/audit-log");
  }
}
