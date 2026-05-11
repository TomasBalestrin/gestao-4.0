"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface EtapaDraft {
  key: string;
  nome: string;
  cor: string;
}

interface EtapaListProps {
  value: EtapaDraft[];
  onChange: (value: EtapaDraft[]) => void;
  disabled?: boolean;
}

function makeKey() {
  return Math.random().toString(36).slice(2, 10);
}

function EtapaRow({
  etapa,
  onPatch,
  onRemove,
  canRemove,
  disabled,
}: {
  etapa: EtapaDraft;
  onPatch: (patch: Partial<EtapaDraft>) => void;
  onRemove: () => void;
  canRemove: boolean;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: etapa.key });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-card p-2",
        isDragging && "opacity-70"
      )}
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground hover:text-foreground"
        aria-label="Reordenar etapa"
        {...attributes}
        {...listeners}
        disabled={disabled}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Input
        value={etapa.nome}
        placeholder="Nome da etapa"
        onChange={(e) => onPatch({ nome: e.target.value })}
        disabled={disabled}
        className="flex-1"
      />
      <input
        type="color"
        value={etapa.cor}
        onChange={(e) => onPatch({ cor: e.target.value })}
        disabled={disabled}
        className="h-9 w-10 cursor-pointer rounded border bg-background"
        aria-label="Cor da etapa"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={disabled || !canRemove}
        aria-label="Remover etapa"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function EtapaList({ value, onChange, disabled }: EtapaListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = value.findIndex((e) => e.key === active.id);
    const newIndex = value.findIndex((e) => e.key === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(value, oldIndex, newIndex));
  }

  function patchAt(index: number, patch: Partial<EtapaDraft>) {
    onChange(value.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...value, { key: makeKey(), nome: "", cor: "#525252" }]);
  }

  return (
    <div className="space-y-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={value.map((e) => e.key)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {value.map((etapa, i) => (
              <EtapaRow
                key={etapa.key}
                etapa={etapa}
                onPatch={(patch) => patchAt(i, patch)}
                onRemove={() => removeAt(i)}
                canRemove={value.length > 1}
                disabled={disabled}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        disabled={disabled}
      >
        <Plus className="h-4 w-4" />
        Adicionar etapa
      </Button>
    </div>
  );
}

export { makeKey as makeEtapaKey };
