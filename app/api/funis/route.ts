import { NextRequest } from "next/server";

import { requireAuth, requireAdmin } from "@/server/auth";
import { createFunilSchema } from "@/lib/schemas/funil";
import { ApiError, badRequest, handleApiError, ok } from "@/server/api-helpers";

export async function GET() {
  try {
    const { supabase } = await requireAuth();

    // RLS filtra para os funis visíveis ao usuário (admin vê todos).
    const { data, error } = await supabase
      .from("funis")
      .select("*, etapas(count)")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[GET /api/funis]", error);
      throw new ApiError("INTERNAL", "Falha ao listar funis");
    }

    const funis = (data ?? []).map(({ etapas, ...funil }) => ({
      ...funil,
      etapas_count: Array.isArray(etapas) ? (etapas[0]?.count ?? 0) : 0,
    }));

    return ok(funis);
  } catch (err) {
    return handleApiError(err, "GET /api/funis");
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await requireAdmin();

    const body = await req.json();
    const parsed = createFunilSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error);

    const { etapas, usuario_ids, ...funilData } = parsed.data;

    const { data: funil, error: funilError } = await supabase
      .from("funis")
      .insert({ ...funilData, created_by: user.id })
      .select()
      .single();
    if (funilError || !funil) {
      console.error("[POST /api/funis] insert funil", funilError);
      throw new ApiError("INTERNAL", "Falha ao criar funil");
    }

    const { error: etapasError } = await supabase.from("etapas").insert(
      etapas.map((e, i) => ({
        funil_id: funil.id,
        nome: e.nome,
        cor: e.cor,
        ordem: i + 1,
      }))
    );
    if (etapasError) {
      console.error("[POST /api/funis] insert etapas", etapasError);
      await supabase.from("funis").delete().eq("id", funil.id);
      throw new ApiError("INTERNAL", "Falha ao criar etapas do funil");
    }

    if (usuario_ids.length > 0) {
      const { error: ufError } = await supabase
        .from("user_funis")
        .insert(usuario_ids.map((uid) => ({ user_id: uid, funil_id: funil.id })));
      if (ufError) {
        console.error("[POST /api/funis] insert user_funis", ufError);
      }
    }

    return ok({ ...funil, etapas_count: etapas.length }, { status: 201 });
  } catch (err) {
    return handleApiError(err, "POST /api/funis");
  }
}
