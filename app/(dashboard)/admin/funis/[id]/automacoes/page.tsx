import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { AutomacaoList } from "@/components/funis/automacao-list";
import { AutomacaoModal } from "@/components/funis/automacao-modal";

interface PageProps {
  params: { id: string };
}

export default async function FunilAutomacoesPage({ params }: PageProps) {
  const supabase = createClient();
  const { data: funil } = await supabase
    .from("funis")
    .select("id, nome, etapas(id, nome, ordem)")
    .eq("id", params.id)
    .maybeSingle();
  if (!funil) notFound();

  const etapas = Array.isArray(funil.etapas)
    ? [...funil.etapas].sort((a, b) => a.ordem - b.ordem)
    : [];
  const etapaOptions = etapas.map((e) => ({ id: e.id, nome: e.nome }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/admin/funis/${params.id}`} aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-serif text-2xl font-medium tracking-tight">
            Automações — {funil.nome}
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure automações por etapa.
          </p>
        </div>
      </div>

      {etapas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Este funil ainda não tem etapas.
        </p>
      ) : (
        <div className="space-y-4">
          {etapas.map((etapa) => (
            <section key={etapa.id} className="rounded-lg border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">{etapa.nome}</h2>
                <AutomacaoModal
                  etapaId={etapa.id}
                  etapaNome={etapa.nome}
                  funilId={params.id}
                  etapas={etapaOptions}
                />
              </div>
              <AutomacaoList etapaId={etapa.id} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
