"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, Bot, Columns3, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { UserRoleValue } from "@/lib/schemas/funil";
import type { Funil } from "@/types/domain";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RoleSelect, ROLE_OPTIONS } from "@/components/forms/role-select";
import {
  AutomacaoList,
  automacoesKeys,
} from "@/components/funis/automacao-list";

interface EtapaOption {
  id: string;
  nome: string;
}

interface NotifDraft {
  key: string;
  tipo: "in_app" | "whatsapp" | "instagram";
  target_role?: UserRoleValue;
  mensagem?: string;
}

type Scope = "intra" | "cross";

interface AutomacaoModalProps {
  etapaId: string;
  etapaNome: string;
  funilId: string;
  etapas: EtapaOption[];
}

const ROLE_LABELS = Object.fromEntries(
  ROLE_OPTIONS.map((o) => [o.value, o.label])
) as Record<UserRoleValue, string>;

function makeKey() {
  return Math.random().toString(36).slice(2, 9);
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = (await res.json().catch(() => null)) as { data?: T } | null;
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return body?.data as T;
}

export function AutomacaoModal({
  etapaId,
  etapaNome,
  funilId,
  etapas,
}: AutomacaoModalProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const [nome, setNome] = useState("");
  const [scope, setScope] = useState<Scope | null>(null);
  const [action, setAction] = useState<"move_to" | "duplicate_to">("move_to");
  // Intra-funil: usa `etapas` do prop. Cross-funil: usa o funil selecionado.
  const [crossFunilId, setCrossFunilId] = useState<string>("");
  const [moveTarget, setMoveTarget] = useState<string>("");
  const [dupTargets, setDupTargets] = useState<string[]>([]);
  const [notifs, setNotifs] = useState<NotifDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Para o modo "entre funis": lista de funis acessíveis (excluindo o atual).
  const funisQuery = useQuery({
    queryKey: ["funis"],
    queryFn: () => getJson<(Funil & { etapas_count?: number })[]>("/api/funis"),
    enabled: open && scope === "cross",
  });
  const otherFunis = (funisQuery.data ?? []).filter(
    (f) => f.id !== funilId && !f.is_archived
  );

  // Etapas do funil destino (cross-funil), buscadas sob demanda.
  const crossFunilDetail = useQuery({
    queryKey: ["funil-detail", crossFunilId],
    queryFn: () =>
      getJson<{ etapas: { id: string; nome: string; ordem: number }[] }>(
        `/api/funis/${crossFunilId}`
      ),
    enabled: open && scope === "cross" && !!crossFunilId,
  });
  const crossEtapas = (crossFunilDetail.data?.etapas ?? [])
    .slice()
    .sort((a, b) => a.ordem - b.ordem);

  // Etapas candidatas a destino conforme o modo.
  const candidateEtapas =
    scope === "intra"
      ? etapas.filter((e) => e.id !== etapaId)
      : crossEtapas.map((e) => ({ id: e.id, nome: e.nome }));

  function resetForm() {
    setNome("");
    setScope(null);
    setAction("move_to");
    setCrossFunilId("");
    setMoveTarget("");
    setDupTargets([]);
    setNotifs([]);
    setError(null);
  }

  // Limpar destinos ao trocar de modo/funil destino, evitando IDs órfãos.
  function pickScope(next: Scope) {
    if (scope === next) return;
    setScope(next);
    setCrossFunilId("");
    setMoveTarget("");
    setDupTargets([]);
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error("Informe o nome da automação");
      if (!scope) throw new Error("Escolha o tipo da automação");

      const targetFunilId =
        scope === "intra" ? funilId : crossFunilId || "";
      if (scope === "cross" && !targetFunilId) {
        throw new Error("Selecione o funil de destino");
      }

      let config: unknown;
      if (action === "move_to") {
        if (!moveTarget) throw new Error("Selecione a etapa de destino");
        config = {
          target_funil_id: targetFunilId,
          target_etapa_id: moveTarget,
        };
      } else {
        if (dupTargets.length === 0) {
          throw new Error("Selecione ao menos uma etapa de destino");
        }
        config = {
          targets: dupTargets.map((id) => ({
            funil_id: targetFunilId,
            etapa_id: id,
          })),
        };
      }

      const body = {
        nome: nome.trim(),
        action,
        config,
        notificacoes: notifs.map((n) => ({
          tipo: n.tipo,
          ...(n.tipo === "in_app" && n.target_role
            ? { target_role: n.target_role }
            : {}),
          ...(n.mensagem ? { mensagem: n.mensagem } : {}),
        })),
        ativo: true,
      };
      const res = await fetch(`/api/etapas/${etapaId}/automacoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) throw new Error(payload?.error ?? `Erro ${res.status}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: automacoesKeys.byEtapa(etapaId),
      });
      toast.success("Automação criada");
      resetForm();
    },
    onError: (err) => setError((err as Error).message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Automações de ${etapaNome}`}
        >
          <Bot className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Automações — {etapaNome}</DialogTitle>
          <DialogDescription>
            Disparadas ao mover um card para esta etapa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <AutomacaoList etapaId={etapaId} />

          <div className="space-y-3 border-t pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nova automação
            </p>

            <div className="space-y-1">
              <Label className="text-xs">Nome</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Quando fechar, duplicar para Pós-venda"
              />
            </div>

            {/* Seletor de escopo (2 ícones) */}
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <div className="grid grid-cols-2 gap-2">
                <ScopeOption
                  icon={Columns3}
                  label="Automações no funil"
                  description="Mover/duplicar entre etapas deste funil."
                  active={scope === "intra"}
                  onClick={() => pickScope("intra")}
                />
                <ScopeOption
                  icon={ArrowRightLeft}
                  label="Automações entre funis"
                  description="Mover/duplicar para um funil de outra role."
                  active={scope === "cross"}
                  onClick={() => pickScope("cross")}
                />
              </div>
            </div>

            {scope && (
              <>
                {scope === "cross" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Funil de destino</Label>
                    <Select
                      value={crossFunilId || undefined}
                      onValueChange={setCrossFunilId}
                      disabled={funisQuery.isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            funisQuery.isLoading
                              ? "Carregando funis..."
                              : "Selecione o funil"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {otherFunis.length === 0 && !funisQuery.isLoading && (
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">
                            Nenhum outro funil disponível.
                          </div>
                        )}
                        {otherFunis.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.nome}
                            {f.role_alvo
                              ? ` · ${ROLE_LABELS[f.role_alvo as UserRoleValue] ?? f.role_alvo}`
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs">Ação</Label>
                  <Select
                    value={action}
                    onValueChange={(v) => {
                      setAction(v as "move_to" | "duplicate_to");
                      setMoveTarget("");
                      setDupTargets([]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="move_to">Mover para</SelectItem>
                      <SelectItem value="duplicate_to">Duplicar para</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(scope === "intra" || !!crossFunilId) && (
                  action === "move_to" ? (
                    <div className="space-y-1">
                      <Label className="text-xs">Etapa de destino</Label>
                      <Select
                        value={moveTarget || undefined}
                        onValueChange={setMoveTarget}
                        disabled={
                          scope === "cross" && crossFunilDetail.isLoading
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a etapa" />
                        </SelectTrigger>
                        <SelectContent>
                          {candidateEtapas.length === 0 && (
                            <div className="px-2 py-1.5 text-xs text-muted-foreground">
                              Nenhuma etapa disponível.
                            </div>
                          )}
                          {candidateEtapas.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label className="text-xs">Etapas de destino</Label>
                      <div className="space-y-1 rounded-md border p-2">
                        {candidateEtapas.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            Nenhuma etapa disponível.
                          </p>
                        )}
                        {candidateEtapas.map((e) => (
                          <label
                            key={e.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-input"
                              checked={dupTargets.includes(e.id)}
                              onChange={(ev) =>
                                setDupTargets((s) =>
                                  ev.target.checked
                                    ? [...s, e.id]
                                    : s.filter((x) => x !== e.id)
                                )
                              }
                            />
                            {e.nome}
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Notificações</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setNotifs((s) => [
                          ...s,
                          { key: makeKey(), tipo: "in_app" },
                        ])
                      }
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar
                    </Button>
                  </div>
                  {notifs.map((n, i) => (
                    <div
                      key={n.key}
                      className="space-y-2 rounded-md border p-2"
                    >
                      <div className="flex items-center gap-2">
                        <Select
                          value={n.tipo}
                          onValueChange={(v) =>
                            setNotifs((s) =>
                              s.map((x, idx) =>
                                idx === i
                                  ? { ...x, tipo: v as NotifDraft["tipo"] }
                                  : x
                              )
                            )
                          }
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="in_app">In-app</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="instagram">Instagram</SelectItem>
                          </SelectContent>
                        </Select>
                        {n.tipo === "in_app" && (
                          <div className="flex-1">
                            <RoleSelect
                              value={n.target_role}
                              onChange={(role) =>
                                setNotifs((s) =>
                                  s.map((x, idx) =>
                                    idx === i ? { ...x, target_role: role } : x
                                  )
                                )
                              }
                              placeholder="Role alvo"
                            />
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Remover notificação"
                          onClick={() =>
                            setNotifs((s) => s.filter((_, idx) => idx !== i))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Mensagem (opcional)"
                        value={n.mensagem ?? ""}
                        onChange={(e) =>
                          setNotifs((s) =>
                            s.map((x, idx) =>
                              idx === i ? { ...x, mensagem: e.target.value } : x
                            )
                          )
                        }
                      />
                      {(n.tipo === "whatsapp" || n.tipo === "instagram") && (
                        <p className="text-[11px] text-muted-foreground">
                          Adapter de {n.tipo} é um stub no MVP.
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}

                <Button
                  type="button"
                  disabled={create.isPending}
                  onClick={() => {
                    setError(null);
                    create.mutate();
                  }}
                >
                  {create.isPending ? "Salvando..." : "Adicionar automação"}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ScopeOptionProps {
  icon: typeof Columns3;
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}

function ScopeOption({
  icon: Icon,
  label,
  description,
  active,
  onClick,
}: ScopeOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex flex-col items-start gap-1 rounded-[10px] border border-[color:var(--border-rgba)] bg-[var(--surface-elevated)] p-3 text-left text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active
          ? "border-foreground/40 bg-secondary"
          : "hover:border-foreground/30"
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="font-medium">{label}</span>
      </div>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  );
}
