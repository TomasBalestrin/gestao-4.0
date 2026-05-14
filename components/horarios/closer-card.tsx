import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { HorarioSlotPickerModal } from "@/components/horarios/horario-slot-picker-modal";

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
      <HorarioSlotPickerModal closerId={closer.id} closerNome={closer.nome} />
    </div>
  );
}
