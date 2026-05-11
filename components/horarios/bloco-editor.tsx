"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface Bloco {
  inicio: string; // "HH:mm"
  fim: string; // "HH:mm"
}

export function blocosOverlap(blocos: Bloco[]): boolean {
  const sorted = [...blocos]
    .filter((b) => b.inicio && b.fim)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.inicio < sorted[i - 1]!.fim) return true;
  }
  return false;
}

interface BlocoEditorProps {
  value: Bloco[];
  onChange: (value: Bloco[]) => void;
  disabled?: boolean;
}

export function BlocoEditor({ value, onChange, disabled }: BlocoEditorProps) {
  const overlap = blocosOverlap(value);

  function patchAt(i: number, patch: Partial<Bloco>) {
    onChange(value.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }
  function removeAt(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...value, { inicio: "09:00", fim: "12:00" }]);
  }

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhum bloco neste dia.</p>
      )}
      {value.map((bloco, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            type="time"
            aria-label={`Início do bloco ${i + 1}`}
            value={bloco.inicio}
            disabled={disabled}
            onChange={(e) => patchAt(i, { inicio: e.target.value })}
            className="w-32"
          />
          <span aria-hidden="true" className="text-muted-foreground">
            —
          </span>
          <Input
            type="time"
            aria-label={`Fim do bloco ${i + 1}`}
            value={bloco.fim}
            disabled={disabled}
            onChange={(e) => patchAt(i, { fim: e.target.value })}
            className="w-32"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            aria-label="Remover bloco"
            onClick={() => removeAt(i)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      {overlap && (
        <p className="text-xs text-destructive">
          Há blocos sobrepostos neste dia.
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={add}
      >
        <Plus className="h-4 w-4" />
        Adicionar bloco
      </Button>
    </div>
  );
}
