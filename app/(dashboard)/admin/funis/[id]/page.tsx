import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { FunilForm } from "@/components/funis/funil-form";
import { AutomacaoModal } from "@/components/funis/automacao-modal";
import { Badge } from "@/components/ui/badge";
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
          <ul className="space-y-1">
            {etapas.map((e) => (
              <li key={e.id} className="flex items-center gap-1">
                <Badge variant="outline" className="gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: e.cor }}
                  />
                  {e.ordem}. {e.nome}
                </Badge>
                <AutomacaoModal
                  etapaId={e.id}
                  etapaNome={e.nome}
                  funilId={params.id}
                  etapas={etapas.map((x) => ({ id: x.id, nome: x.nome }))}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <FunilForm mode="edit" funil={funilRow} />
    </div>
  );
}
