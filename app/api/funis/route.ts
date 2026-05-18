import { NextRequest } from "next/server";

import { requireAuth, requireAdmin } from "@/server/auth";
import { createFunilSchema } from "@/lib/schemas/funil";
import { ApiError, badRequest, handleApiError, ok } from "@/server/api-helpers";

export async function GET() {
  try {
    const { supabase } = await requireAuth();

    // Hint `!funil_id` desambigua a relação etapas↔funis após a migration 0013
    // ter adicionado `funis.etapa_destino_id`, que cria um segundo caminho
    // funis→etapas. Queremos a relação natural etapas.funil_id → funis.id.
    const { data, error } = await supabase
      .from("funis")
      .select(
        "*, etapas!funil_id(count), user_funis(user:users(id, nome, foto_url))"
      )
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[GET /api/funis]", error);
      throw new ApiError("INTERNAL", "Falha ao listar funis");
    }

    const funis = (data ?? []).map(({ etapas, user_funis, ...funil }) => {
      const users = Array.isArray(user_funis)
        ? user_funis
            .map((uf) => (uf as { user: { id: string; nome: string; foto_url: string | null } | null }).user)
            .filter(
              (u): u is { id: string; nome: string; foto_url: string | null } =>
                !!u
            )
        : [];
      return {
        ...funil,
        etapas_count: Array.isArray(etapas) ? (etapas[0]?.count ?? 0) : 0,
        users,
      };
    });

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

    const {
      etapas,
      usuario_ids,
      // Configuração de agendamento de call é feita depois no editor
      // (PATCH /api/funis/[id] → aba "Agendamento"). Não é enviada no INSERT
      // de criação para que o funil possa ser criado mesmo em bancos que ainda
      // não receberam a migration 0013 — os campos têm DEFAULT no DB.
      agenda_call_enabled: _ace,
      funil_destino_id: _fdi,
      etapa_destino_id: _edi,
      ...funilData
    } = parsed.data;

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

    // O criador é sempre membro do funil (necessário para a RLS de cards e
    // para o funil aparecer no CRM dele), além dos usuários informados.
    const memberIds = Array.from(new Set([user.id, ...usuario_ids]));
    const { error: ufError } = await supabase
      .from("user_funis")
      .insert(memberIds.map((uid) => ({ user_id: uid, funil_id: funil.id })));
    if (ufError) {
      console.error("[POST /api/funis] insert user_funis", ufError);
    }

    return ok({ ...funil, etapas_count: etapas.length }, { status: 201 });
  } catch (err) {
    return handleApiError(err, "POST /api/funis");
  }
}
