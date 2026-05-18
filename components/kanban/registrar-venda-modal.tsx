"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleDollarSign } from "lucide-react";

import { createVendaSchema } from "@/lib/schemas/venda";
import { notifyError, notifySuccess } from "@/lib/utils/notify";
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
import { Textarea } from "@/components/ui/textarea";

interface RegistrarVendaModalProps {
  leadId: string;
  cardId?: string | null;
}

interface VendaFormState {
  valor_venda: string;
  valor_entrada: string;
  vigencia_contrato: string;
  negociacao: string;
  notas: string;
}

const EMPTY: VendaFormState = {
  valor_venda: "",
  valor_entrada: "",
  vigencia_contrato: "",
  negociacao: "",
  notas: "",
};

function parseDecimal(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function RegistrarVendaModal({
  leadId,
  cardId,
}: RegistrarVendaModalProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<VendaFormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      const valor = parseDecimal(form.valor_venda);
      const entrada = parseDecimal(form.valor_entrada);
      if (valor === null) throw new Error("Informe o valor da venda");

      const payload = {
        card_id: cardId ?? null,
        valor_venda: valor,
        valor_entrada: entrada,
        vigencia_contrato: form.vigencia_contrato || null,
        negociacao: form.negociacao || null,
        notas: form.notas || null,
      };
      const parsed = createVendaSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      }
      const res = await fetch(`/api/leads/${leadId}/vendas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vendas", leadId] });
      notifySuccess("Venda registrada");
      setForm(EMPTY);
      setError(null);
      setOpen(false);
    },
    onError: (err) => setError((err as Error).message),
  });

  function patch(key: keyof VendaFormState, value: string) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setForm(EMPTY);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <CircleDollarSign className="h-4 w-4" />
          Registrar venda
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar venda</DialogTitle>
          <DialogDescription>
            Registre o fechamento com este lead.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="valor-venda">Valor da Venda (R$) *</Label>
              <Input
                id="valor-venda"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={form.valor_venda}
                onChange={(e) => patch("valor_venda", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="valor-entrada">Valor de Entrada (R$)</Label>
              <Input
                id="valor-entrada"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={form.valor_entrada}
                onChange={(e) => patch("valor_entrada", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vigencia">Vigência do Contrato</Label>
            <Input
              id="vigencia"
              placeholder="ex: 12 meses, 1 ano"
              value={form.vigencia_contrato}
              onChange={(e) => patch("vigencia_contrato", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="negociacao">Como foi a Negociação</Label>
            <Textarea
              id="negociacao"
              rows={3}
              value={form.negociacao}
              onChange={(e) => patch("negociacao", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notas">Notas da Venda</Label>
            <Textarea
              id="notas"
              rows={3}
              value={form.notas}
              onChange={(e) => patch("notas", e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={create.isPending}
              onClick={() => {
                setError(null);
                create.mutate();
              }}
            >
              {create.isPending ? "Registrando..." : "Registrar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
