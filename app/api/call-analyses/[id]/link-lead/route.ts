import { NextRequest } from "next/server";

import { requireAuth } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { linkCallAnalysisToLeadSchema } from "@/lib/schemas/call-analysis";
import { logEvent } from "@/lib/audit/logger";
import {
  canAccessCallAnalyses,
  isAdmin,
} from "@/lib/utils/permissions";
import {
  badRequest,
  forbidden,
  handleApiError,
  notFound,
  ok,
} from "@/server/api-helpers";

interface RouteParams {
  params: { id: string };
}

// PATCH /api/call-analyses/[id]/link-lead
// Vincula analise (unmatched ou matched) a um lead. Permissoes:
// - Admin pode vincular qualquer analise a qualquer lead.
// - Closer pode vincular suas proprias analises a leads que ele tem acesso
//   (RLS de leads filtra naturalmente).
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { profile, supabase } = await requireAuth();
    if (!canAccessCallAnalyses(profile.role)) {
      return forbidden("Sem acesso");
    }

    const body = await req.json();
    const parsed = linkCallAnalysisToLeadSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error);

    // Busca analise via client do user (RLS aplica).
    const { data: analysis } = await supabase
      .from("call_analyses")
      .select("id, closer_id, status, deleted_at")
      .eq("id", params.id)
      .maybeSingle();
    if (!analysis || analysis.deleted_at) {
      return notFound("Analise nao encontrada");
    }

    // Closer so pode vincular as proprias.
    if (!isAdmin(profile.role) && analysis.closer_id !== profile.id) {
      return forbidden("So pode vincular suas proprias analises");
    }

    // Valida lead existe e nao deletado (RLS aplica).
    const { data: lead } = await supabase
      .from("leads")
      .select("id")
      .eq("id", parsed.data.lead_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!lead) return notFound("Lead nao encontrado ou sem acesso");

    const admin = createAdminClient();
    const { error } = await admin
      .from("call_analyses")
      .update({
        lead_id: parsed.data.lead_id,
        status: "matched",
      })
      .eq("id", params.id);
    if (error) throw new Error(error.message);

    await logEvent({
      entityType: "call_analysis",
      entityId: params.id,
      eventType: "call_analysis_linked",
      userId: profile.id,
      after: { lead_id: parsed.data.lead_id, manual: true },
    });

    return ok({ linked: true });
  } catch (err) {
    return handleApiError(err, "PATCH /api/call-analyses/[id]/link-lead");
  }
}
