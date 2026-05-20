import { NextRequest } from "next/server";

import { requireAuth } from "@/server/auth";
import { callAnalysisListQuerySchema } from "@/lib/schemas/call-analysis";
import { canAccessCallAnalyses } from "@/lib/utils/permissions";
import {
  badRequest,
  forbidden,
  handleApiError,
  ok,
} from "@/server/api-helpers";

import type { CallAnalysisWithRelations } from "@/types/domain";

// GET /api/call-analyses
// Lista analises com filtros. RLS no banco ja filtra por role:
// admin tudo; closer suas proprias; lider compartilhado por funil.
export async function GET(req: NextRequest) {
  try {
    const { profile, supabase } = await requireAuth();
    if (!canAccessCallAnalyses(profile.role)) {
      return forbidden("Sem acesso ao modulo de analises");
    }

    const url = new URL(req.url);
    const parsed = callAnalysisListQuerySchema.safeParse({
      status: url.searchParams.get("status") ?? undefined,
      closer_id: url.searchParams.get("closer_id") ?? undefined,
      lead_id: url.searchParams.get("lead_id") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      per_page: url.searchParams.get("per_page") ?? undefined,
    });
    if (!parsed.success) return badRequest(parsed.error);

    const { status, closer_id, lead_id, search, page, per_page } = parsed.data;
    const from = (page - 1) * per_page;
    const to = from + per_page - 1;

    let query = supabase
      .from("call_analyses")
      .select(
        `
        *,
        closer:users!call_analyses_closer_id_fkey(id, nome, foto_url),
        lead:leads(id, nome, telefone)
      `,
        { count: "exact" }
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (status) query = query.eq("status", status);
    if (closer_id) query = query.eq("closer_id", closer_id);
    if (lead_id) query = query.eq("lead_id", lead_id);
    if (search && search.trim().length > 0) {
      query = query.or(
        `client_name_extracted.ilike.%${search}%,google_file_name.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;
    if (error) {
      console.error("[GET /api/call-analyses]", error);
      throw new Error(error.message);
    }

    return ok<{
      data: CallAnalysisWithRelations[];
      total: number;
      page: number;
      per_page: number;
    }>({
      data: (data ?? []) as unknown as CallAnalysisWithRelations[],
      total: count ?? 0,
      page,
      per_page,
    });
  } catch (err) {
    return handleApiError(err, "GET /api/call-analyses");
  }
}
