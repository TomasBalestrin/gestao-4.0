"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { Check, GripVertical, Pencil, Plus, Trash2, X } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { notifyError, notifySuccess } from "@/lib/utils/notify";
import { etapaIcon, randomPastel, tintBg } from "@/lib/utils/etapa-style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AutomacaoModal } from "@/components/funis/automacao-modal";

interface Etapa {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
}

interface EtapaKanbanProps {
  funilId: string;
  initialEtapas: Etapa[];
}

export function EtapaKanban({ funilId, initialEtapas }: EtapaKanbanProps) {
  const [etapas, setEtapas] = useState<Etapa[]>(() =>
    [...initialEtapas].sort((a, b) => a.ordem - b.ordem)
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ nome: string; cor: string }>({
    nome: "",
    cor: "#525252",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/funis/${funilId}/etapas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: "Nova etapa", cor: randomPastel() }),
      });
      const body = (await res.json().catch(() => null)) as
        | { data?: Etapa; error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
      return body!.data!;
    },
    onSuccess: (etapa) => {
      setEtapas((s) => [...s, etapa].sort((a, b) => a.ordem - b.ordem));
      setEditingId(etapa.id);
      setDraft({ nome: etapa.nome, cor: etapa.cor });
      notifySuccess("Etapa criada");
    },
    onError: (e) => notifyError((e as Error).message),
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<Etapa, "nome" | "cor">>;
    }) => {
      const res = await fetch(`/api/funis/${funilId}/etapas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = (await res.json().catch(() => null)) as
        | { data?: Etapa; error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
      return body!.data!;
    },
    onSuccess: (etapa) => {
      setEtapas((s) =>
        s.map((e) => (e.id === etapa.id ? { ...e, ...etapa } : e))
      );
      setEditingId(null);
      notifySuccess("Etapa atualizada");
    },
    onError: (e) => notifyError((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/funis/${funilId}/etapas/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        if (res.status === 409) {
          throw new Error(
            body?.error ?? "Etapa possui cards. Mova-os antes de excluir."
          );
        }
        throw new Error(body?.error ?? `Erro ${res.status}`);
      }
      return id;
    },
    onSuccess: (id) => {
      setEtapas((s) =>
        s.filter((e) => e.id !== id).map((e, i) => ({ ...e, ordem: i + 1 }))
      );
      notifySuccess("Etapa removida");
    },
    onError: (e) => notifyError((e as Error).message),
  });

  const reorder = useMutation({
    mutationFn: async (ordem: { id: string; ordem: number }[]) => {
      const res = await fetch(`/api/funis/${funilId}/etapas/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordem }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? `Erro ${res.status}`);
      }
    },
    onError: (e) => notifyError(`Falha ao reordenar: ${(e as Error).message}`),
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = etapas.findIndex((e) => e.id === active.id);
    const newIdx = etapas.findIndex((e) => e.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const previous = etapas;
    const moved = arrayMove(etapas, oldIdx, newIdx).map((e, i) => ({
      ...e,
      ordem: i + 1,
    }));
    setEtapas(moved);
    reorder.mutate(
      moved.map((e) => ({ id: e.id, ordem: e.ordem })),
      { onError: () => setEtapas(previous) }
    );
  }

  function startEdit(etapa: Etapa) {
    setEditingId(etapa.id);
    setDraft({ nome: etapa.nome, cor: etapa.cor });
  }
  function cancelEdit() {
    setEditingId(null);
  }
  function saveEdit(id: string) {
    const nome = draft.nome.trim();
    if (!nome) return;
    update.mutate({ id, patch: { nome, cor: draft.cor } });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-2">
        <SortableContext
          items={etapas.map((e) => e.id)}
          strategy={horizontalListSortingStrategy}
        >
          {etapas.map((etapa) => (
            <SortableColumn
              key={etapa.id}
              etapa={etapa}
              isEditing={editingId === etapa.id}
              draft={draft}
              onDraftChange={setDraft}
              onStartEdit={() => startEdit(etapa)}
              onCancelEdit={cancelEdit}
              onSaveEdit={() => saveEdit(etapa.id)}
              onRemove={() => remove.mutate(etapa.id)}
              etapas={etapas}
              funilId={funilId}
              saving={update.isPending}
              removing={remove.isPending}
            />
          ))}
        </SortableContext>

        <button
          type="button"
          onClick={() => create.mutate()}
          disabled={create.isPending}
          className="flex w-60 shrink-0 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-card/40 p-4 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Plus className="h-5 w-5" />
          {create.isPending ? "Criando..." : "Adicionar etapa"}
        </button>
      </div>
    </DndContext>
  );
}

interface SortableColumnProps {
  etapa: Etapa;
  isEditing: boolean;
  draft: { nome: string; cor: string };
  onDraftChange: (draft: { nome: string; cor: string }) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onRemove: () => void;
  etapas: Etapa[];
  funilId: string;
  saving: boolean;
  removing: boolean;
}

function SortableColumn({
  etapa,
  isEditing,
  draft,
  onDraftChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onRemove,
  etapas,
  funilId,
  saving,
  removing,
}: SortableColumnProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: etapa.id });

  // Em modo edição, mostra a cor/nome do draft em tempo real.
  const effectiveColor = isEditing ? draft.cor : etapa.cor;
  const Icon = etapaIcon(etapa.ordem - 1);
  const bg = tintBg(effectiveColor, 0x33);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        ...(bg ? { backgroundColor: bg } : {}),
      }}
      className={cn(
        "flex w-60 shrink-0 flex-col rounded-lg border bg-secondary/30",
        isDragging && "opacity-70"
      )}
    >
      <div className="flex items-center justify-between gap-1 border-b px-2 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <button
            type="button"
            className="cursor-grab text-muted-foreground hover:text-foreground"
            aria-label="Reordenar etapa"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          {isEditing ? (
            <>
              <input
                type="color"
                value={draft.cor}
                onChange={(e) =>
                  onDraftChange({ ...draft, cor: e.target.value })
                }
                aria-label="Cor da etapa"
                className="h-6 w-6 shrink-0 cursor-pointer rounded border bg-background"
              />
              <Input
                autoFocus
                value={draft.nome}
                onChange={(e) =>
                  onDraftChange({ ...draft, nome: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSaveEdit();
                  if (e.key === "Escape") onCancelEdit();
                }}
                className="h-7 flex-1 px-2 text-sm"
              />
            </>
          ) : (
            <>
              <Icon
                className="h-4 w-4 shrink-0"
                style={{ color: effectiveColor }}
              />
              <span className="truncate text-sm font-medium">{etapa.nome}</span>
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {isEditing ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={saving || !draft.nome.trim()}
                onClick={onSaveEdit}
                aria-label="Salvar"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onCancelEdit}
                aria-label="Cancelar"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                {etapa.ordem}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onStartEdit}
                aria-label="Renomear etapa"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <ConfirmDialog
                title={`Excluir "${etapa.nome}"?`}
                description="A etapa só pode ser removida se não tiver cards. Cards existentes precisam ser movidos antes."
                confirmLabel="Excluir"
                destructive
                onConfirm={onRemove}
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    disabled={removing}
                    aria-label="Excluir etapa"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                }
              />
            </>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 p-2">
        <span className="text-xs text-muted-foreground">Automações</span>
        <AutomacaoModal
          etapaId={etapa.id}
          etapaNome={etapa.nome}
          funilId={funilId}
          etapas={etapas.map((x) => ({ id: x.id, nome: x.nome }))}
        />
      </div>
    </div>
  );
}
