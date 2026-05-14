"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { etapaIcon, randomPastel, tintBg } from "@/lib/utils/etapa-style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EtapaDraft } from "@/components/funis/etapa-list";
import { makeEtapaKey } from "@/components/funis/etapa-list";

interface EtapaKanbanDraftProps {
  value: EtapaDraft[];
  onChange: (value: EtapaDraft[]) => void;
  disabled?: boolean;
}

export function EtapaKanbanDraft({
  value,
  onChange,
  disabled,
}: EtapaKanbanDraftProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = value.findIndex((e) => e.key === active.id);
    const newIdx = value.findIndex((e) => e.key === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    onChange(arrayMove(value, oldIdx, newIdx));
  }

  function patchAt(index: number, patch: Partial<EtapaDraft>) {
    onChange(value.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function add() {
    onChange([
      ...value,
      { key: makeEtapaKey(), nome: "Nova etapa", cor: randomPastel() },
    ]);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-2">
        <SortableContext
          items={value.map((e) => e.key)}
          strategy={horizontalListSortingStrategy}
        >
          {value.map((etapa, i) => (
            <DraftColumn
              key={etapa.key}
              etapa={etapa}
              index={i}
              canRemove={value.length > 1}
              disabled={disabled}
              onPatch={(patch) => patchAt(i, patch)}
              onRemove={() => removeAt(i)}
            />
          ))}
        </SortableContext>

        <button
          type="button"
          onClick={add}
          disabled={disabled}
          className="flex w-60 shrink-0 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-card/40 p-4 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
        >
          <Plus className="h-5 w-5" />
          Adicionar etapa
        </button>
      </div>
    </DndContext>
  );
}

interface DraftColumnProps {
  etapa: EtapaDraft;
  index: number;
  canRemove: boolean;
  disabled?: boolean;
  onPatch: (patch: Partial<EtapaDraft>) => void;
  onRemove: () => void;
}

function DraftColumn({
  etapa,
  index,
  canRemove,
  disabled,
  onPatch,
  onRemove,
}: DraftColumnProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: etapa.key });

  const Icon = etapaIcon(index);
  const bg = tintBg(etapa.cor, 0x33);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex w-60 shrink-0 flex-col rounded-lg border bg-secondary/30",
        isDragging && "opacity-70"
      )}
    >
      <div
        className="flex items-center justify-between gap-1 rounded-t-lg border-b px-2 py-2"
        style={bg ? { backgroundColor: bg } : undefined}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <button
            type="button"
            className="cursor-grab text-muted-foreground hover:text-foreground"
            aria-label="Reordenar etapa"
            disabled={disabled}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <input
            type="color"
            value={etapa.cor}
            onChange={(e) => onPatch({ cor: e.target.value })}
            disabled={disabled}
            aria-label="Cor da etapa"
            className="h-6 w-6 shrink-0 cursor-pointer rounded border bg-background"
          />
          <Icon className="h-4 w-4 shrink-0" style={{ color: etapa.cor }} />
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
            {index + 1}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onRemove}
            disabled={disabled || !canRemove}
            aria-label="Remover etapa"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="p-2">
        <Input
          value={etapa.nome}
          placeholder="Nome da etapa"
          onChange={(e) => onPatch({ nome: e.target.value })}
          disabled={disabled}
          className="h-8 text-sm"
        />
      </div>
    </div>
  );
}
