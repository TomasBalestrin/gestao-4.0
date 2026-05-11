import { Clock } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { CloserCard } from "@/components/horarios/closer-card";

export default async function AdminHorariosPage() {
  const supabase = createClient();

  const { data: closers } = await supabase
    .from("users")
    .select("id, nome, foto_url")
    .eq("role", "closer")
    .eq("is_active", true)
    .order("nome", { ascending: true });

  const { data: horarios } = await supabase
    .from("closer_horarios")
    .select("closer_id")
    .eq("ativo", true);
  const configuredIds = new Set((horarios ?? []).map((h) => h.closer_id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Horários</h1>
        <p className="text-sm text-muted-foreground">
          Configure a disponibilidade de cada closer.
        </p>
      </div>

      {!closers || closers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <Clock className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Nenhum closer ativo</p>
          <p className="text-sm text-muted-foreground">
            Crie usuários com a role &quot;Closer&quot; para configurar horários.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {closers.map((closer) => (
            <CloserCard
              key={closer.id}
              closer={closer}
              configured={configuredIds.has(closer.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
