import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { FunilForm } from "@/components/funis/funil-form";
import { AutomacaoModal } from "@/components/funis/automacao-modal";
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{funil.nome}</h1>
        <p className="text-sm text-muted-foreground">Editar funil</p>
      </div>

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
        {etapas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem etapas.</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {etapas.map((e) => (
              <div
                key={e.id}
                className="flex w-60 shrink-0 flex-col rounded-lg border bg-secondary/30"
              >
                <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: e.cor }}
                    />
                    <span className="truncate text-sm font-medium">
                      {e.nome}
                    </span>
                  </div>
                  <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                    {e.ordem}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 p-2">
                  <span className="text-xs text-muted-foreground">
                    Automações
                  </span>
                  <AutomacaoModal
                    etapaId={e.id}
                    etapaNome={e.nome}
                    funilId={params.id}
                    etapas={etapas.map((x) => ({ id: x.id, nome: x.nome }))}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <FunilForm mode="edit" funil={funilRow} />
    </div>
  );
}
