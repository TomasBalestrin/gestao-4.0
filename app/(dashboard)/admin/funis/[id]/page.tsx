import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { FunilForm } from "@/components/funis/funil-form";
import { EtapaKanban } from "@/components/funis/etapa-kanban";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: { id: string };
}

export default async function EditFunilPage({ params }: PageProps) {
  const supabase = createClient();
  const { data: funil } = await supabase
    .from("funis")
    .select("*, etapas(*)")
    .eq("id", params.id)
    .maybeSingle();

  if (!funil) notFound();

  const etapas = Array.isArray(funil.etapas)
    ? [...funil.etapas].sort((a, b) => a.ordem - b.ordem)
    : [];
  const { etapas: _omit, ...funilRow } = funil;

  const etapasSection = (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Etapas atuais
        </h2>
        <Button asChild variant="link" size="sm">
          <Link href={`/admin/funis/${params.id}/automacoes`}>
            Ver todas as automações
          </Link>
        </Button>
      </div>
      <EtapaKanban
        funilId={params.id}
        initialEtapas={etapas.map((e) => ({
          id: e.id,
          nome: e.nome,
          cor: e.cor,
          ordem: e.ordem,
        }))}
      />
    </section>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{funil.nome}</h1>
        <p className="text-sm text-muted-foreground">Editar funil</p>
      </div>

      <FunilForm mode="edit" funil={funilRow} etapasSection={etapasSection} />
    </div>
  );
}
