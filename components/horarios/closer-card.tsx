import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HorarioConfigModal } from "@/components/horarios/horario-config-modal";

interface CloserCardProps {
  closer: { id: string; nome: string; foto_url: string | null };
  configured: boolean;
}

function initials(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function CloserCard({ closer, configured }: CloserCardProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="h-10 w-10">
          {closer.foto_url && (
            <AvatarImage src={closer.foto_url} alt={closer.nome} />
          )}
          <AvatarFallback>{initials(closer.nome)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{closer.nome}</p>
          {configured ? (
            <Badge variant="outline">Configurado</Badge>
          ) : (
            <Badge variant="secondary">Pendente</Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <HorarioConfigModal closerId={closer.id} closerNome={closer.nome} />
        <Button asChild variant="ghost" size="sm">
          <Link href={`/admin/horarios/${closer.id}`}>Abrir</Link>
        </Button>
      </div>
    </div>
  );
}
