import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/server";
import { cardsKeys, CARD_SELECT, type KanbanCardData } from "@/hooks/useCards";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/kanban/kanban-board";

interface PageProps {
  params: { funilId: string };
}

export default async function FunilKanbanPage({ params }: PageProps) {
  const supabase = createClient();

  const { data: funil } = await supabase
    .from("funis")
    .select("id, nome, etapas!funil_id(id, nome, cor, ordem)")
    .eq("id", params.funilId)
    .maybeSingle();
  if (!funil) notFound();

  const etapas = Array.isArray(funil.etapas)
    ? [...funil.etapas].sort((a, b) => a.ordem - b.ordem)
    : [];

  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: cardsKeys.byFunil(params.funilId),
    queryFn: async (): Promise<KanbanCardData[]> => {
      const { data } = await supabase
        .from("cards")
        .select(CARD_SELECT)
        .eq("funil_id", params.funilId)
        .is("deleted_at", null)
        .order("ordem_na_etapa", { ascending: true });
      return (data ?? []) as unknown as KanbanCardData[];
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/crm" aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{funil.nome}</h1>
      </div>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <KanbanBoard funilId={params.funilId} etapas={etapas} />
      </HydrationBoundary>
    </div>
  );
}
