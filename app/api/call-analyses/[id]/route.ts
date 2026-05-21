import { NextRequest } from "next/server";

import { requireAuth } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/audit/logger";
import {
  canAccessCallAnalyses,
  isAdmin,
} from "@/lib/utils/permissions";
import {
  forbidden,
  handleApiError,
  notFound,
  ok,
} from "@/server/api-helpers";

import type { CallAnalysisWithRelations } from "@/types/domain";

interface RouteParams {
  params: { id: string };
}

// GET /api/call-analyses/[id]
// Detalhe da analise (com transcricao). RLS aplica.
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { profile, supabase } = await requireAuth();
    if (!canAccessCallAnalyses(profile.role)) {
      return forbidden("Sem acesso");
    }

    const { data, error } = await supabase
      .from("call_analyses")
      .select(
        `
        *,
        closer:users!call_analyses_closer_id_fkey(id, nome, foto_url),
        lead:leads(id, nome, telefone)
      `
      )
      .eq("id", params.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      console.error("[GET /api/call-analyses/[id]]", error);
      throw new Error(error.message);
    }
    if (!data) return notFound("Analise nao encontrada");

    return ok<{ data: CallAnalysisWithRelations }>({
      data: data as unknown as CallAnalysisWithRelations,
    });
  } catch (err) {
    return handleApiError(err, "GET /api/call-analyses/[id]");
  }
}

// DELETE /api/call-analyses/[id]
// Soft delete. Admin pode remover qualquer. Closer pode remover a propria.
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { profile } = await requireAuth();

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("call_analyses")
      .select("id, deleted_at, closer_id")
      .eq("id", params.id)
      .maybeSingle();
    if (!existing) return notFound("Analise nao encontrada");
    if (existing.deleted_at) return ok({ deleted: true });

    if (!isAdmin(profile.role) && existing.closer_id !== profile.id) {
      return forbidden("Sem permissao para remover esta analise");
    }

    const { error } = await admin
      .from("call_analyses")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", params.id);
    if (error) throw new Error(error.message);

    await logEvent({
      entityType: "call_analysis",
      entityId: params.id,
      eventType: "call_analysis_deleted",
      userId: profile.id,
    });

    return ok({ deleted: true });
  } catch (err) {
    return handleApiError(err, "DELETE /api/call-analyses/[id]");
  }
}
