"use client";

import { Plus, Trash2 } from "lucide-react";

import {
  customFieldTypes,
  type CustomFieldConfig,
  type CustomFieldType,
} from "@/lib/schemas/custom-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Texto",
  number: "Número",
  date: "Data",
  select: "Seleção",
  multi_select: "Seleção múltipla",
  currency: "Moeda",
  phone: "Telefone",
  email: "Email",
  textarea: "Texto longo",
};

interface CustomFieldsBuilderProps {
  value: CustomFieldConfig[];
  onChange: (value: CustomFieldConfig[]) => void;
  disabled?: boolean;
}

function makeId() {
  return `cf_${Math.random().toString(36).slice(2, 10)}`;
}

const needsOptions = (t: CustomFieldType) =>
  t === "select" || t === "multi_select";

export function CustomFieldsBuilder({
  value,
  onChange,
  disabled,
}: CustomFieldsBuilderProps) {
  function patchAt(index: number, patch: Partial<CustomFieldConfig>) {
    onChange(value.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }
  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }
  function add() {
    onChange([
      ...value,
      { id: makeId(), nome: "", tipo: "text", obrigatorio: false },
    ]);
  }

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum campo customizado. Adicione um abaixo.
        </p>
      )}

      {value.map((field, i) => (
        <div key={field.id} className="space-y-2 rounded-md border bg-card p-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[12rem] flex-1 space-y-1">
              <Label className="text-xs">Nome</Label>
              <Input
                value={field.nome}
                placeholder="Ex: Valor estimado"
                onChange={(e) => patchAt(i, { nome: e.target.value })}
                disabled={disabled}
              />
            </div>
            <div className="w-44 space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select
                value={field.tipo}
                onValueChange={(t) =>
                  patchAt(i, {
                    tipo: t as CustomFieldType,
                    opcoes: needsOptions(t as CustomFieldType)
                      ? (field.opcoes ?? [])
                      : undefined,
                  })
                }
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {customFieldTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex h-9 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={field.obrigatorio}
                onChange={(e) => patchAt(i, { obrigatorio: e.target.checked })}
                disabled={disabled}
                className="h-4 w-4 rounded border-input"
              />
              Obrigatório
            </label>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeAt(i)}
              disabled={disabled}
              aria-label="Remover campo"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {needsOptions(field.tipo) && (
            <div className="space-y-1">
              <Label className="text-xs">Opções (separadas por vírgula)</Label>
              <Input
                value={(field.opcoes ?? []).join(", ")}
                placeholder="Indicação, Instagram, Anúncio"
                onChange={(e) =>
                  patchAt(i, {
                    opcoes: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                disabled={disabled}
              />
            </div>
          )}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        disabled={disabled}
      >
        <Plus className="h-4 w-4" />
        Adicionar campo
      </Button>
    </div>
  );
}
