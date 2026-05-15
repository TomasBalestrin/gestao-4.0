import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  HorarioConfigView,
  type HorarioRow,
} from "@/components/horarios/horario-config-view";
import type { Bloco } from "@/components/horarios/bloco-editor";

export default async function CloserHorariosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("closer_horarios")
    .select("dia_semana, blocos, slot_duration_min, buffer_min, ativo")
    .eq("closer_id", user.id);

  const horarios: HorarioRow[] = (data ?? []).map((row) => ({
    dia_semana: row.dia_semana as HorarioRow["dia_semana"],
    blocos: (Array.isArray(row.blocos) ? row.blocos : []) as unknown as Bloco[],
    slot_duration_min: row.slot_duration_min,
    buffer_min: row.buffer_min,
    ativo: row.ativo,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Meus horários
        </h1>
        <p className="text-sm text-muted-foreground">
          Sua disponibilidade semanal (configurada pelo administrador).
        </p>
      </div>
      <HorarioConfigView horarios={horarios} />
    </div>
  );
}
