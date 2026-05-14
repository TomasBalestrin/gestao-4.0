import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { HorarioConfigEditor } from "@/components/horarios/horario-config-modal";

interface PageProps {
  params: { closerId: string };
}

export default async function CloserHorarioPage({ params }: PageProps) {
  const supabase = createClient();
  const { data: closer } = await supabase
    .from("users")
    .select("id, nome")
    .eq("id", params.closerId)
    .maybeSingle();
  if (!closer) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/horarios" aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-serif text-2xl font-medium tracking-tight">
            Horários — {closer.nome}
          </h1>
          <p className="text-sm text-muted-foreground">
            Blocos disponíveis por dia da semana.
          </p>
        </div>
      </div>

      <HorarioConfigEditor closerId={closer.id} closerNome={closer.nome} />
    </div>
  );
}
