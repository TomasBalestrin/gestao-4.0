import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { FunilForm } from "@/components/funis/funil-form";
import { Badge } from "@/components/ui/badge";

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
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Etapas atuais
        </h2>
        {etapas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem etapas.</p>
        ) : (
          <ol className="flex flex-wrap gap-2">
            {etapas.map((e) => (
              <li key={e.id}>
                <Badge variant="outline" className="gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: e.cor }}
                  />
                  {e.ordem}. {e.nome}
                </Badge>
              </li>
            ))}
          </ol>
        )}
      </section>

      <FunilForm mode="edit" funil={funilRow} />
    </div>
  );
}
