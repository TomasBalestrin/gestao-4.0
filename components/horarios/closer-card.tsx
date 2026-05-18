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
    <div className="flex flex-col items-center gap-3 rounded-[12px] border border-[color:var(--border-rgba)] bg-[var(--surface-elevated)] p-5 text-center">
      <Avatar className="h-16 w-16">
        {closer.foto_url && (
          <AvatarImage src={closer.foto_url} alt={closer.nome} />
        )}
        <AvatarFallback>{initials(closer.nome)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{closer.nome}</p>
        {configured ? (
          <Badge className="mt-1.5 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">
            Configurado
          </Badge>
        ) : (
          <Badge variant="secondary" className="mt-1.5">
            Pendente
          </Badge>
        )}
      </div>
      <div className="mt-1 w-full">
        <HorarioSlotPickerModal
          closerId={closer.id}
          closerNome={closer.nome}
        />
      </div>
    </div>
  );
}
