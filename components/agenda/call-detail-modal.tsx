"use client";

import Link from "next/link";

import type { CallWithCtx } from "@/hooks/useCalls";
import { useCallAttendance, useCancelCall } from "@/hooks/useCalls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

const STATUS_LABEL: Record<CallWithCtx["status"], string> = {
  scheduled: "Agendada",
  completed: "Concluída",
  cancelled: "Cancelada",
  no_show: "Não compareceu",
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

interface CallDetailModalProps {
  call: CallWithCtx | null;
  onClose: () => void;
}

export function CallDetailModal({ call, onClose }: CallDetailModalProps) {
  const cancel = useCancelCall();
  const attendance = useCallAttendance();

  if (!call) return null;
  const scheduled = call.status === "scheduled";

  async function run(fn: Promise<unknown>) {
    try {
      await fn;
      onClose();
    } catch {
      // erro já notificado pelo hook
    }
  }

  return (
    <Dialog open={!!call} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{call.card?.lead?.nome ?? "Call"}</DialogTitle>
          <DialogDescription>{STATUS_LABEL[call.status]}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Quando: </span>
            {fmt(call.slot_start)} – {fmt(call.slot_end).slice(-5)}
          </p>
          <p>
            <span className="text-muted-foreground">Closer: </span>
            {call.closer?.nome ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Agendado por: </span>
            {call.scheduler?.nome ?? "—"}
          </p>
          {call.card?.lead?.telefone && (
            <p>
              <span className="text-muted-foreground">Telefone: </span>
              {call.card.lead.telefone}
            </p>
          )}
          {call.notes && (
            <p>
              <span className="text-muted-foreground">Notas: </span>
              {call.notes}
            </p>
          )}
          <div className="pt-1">
            <Badge variant="outline">{STATUS_LABEL[call.status]}</Badge>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          {call.card?.funil_id ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/crm/${call.card.funil_id}`}>Ir para o funil</Link>
            </Button>
          ) : (
            <span />
          )}
          {scheduled && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={attendance.isPending}
                onClick={() =>
                  run(attendance.mutateAsync({ id: call.id, status: "completed" }))
                }
              >
                Compareceu
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={attendance.isPending}
                onClick={() =>
                  run(attendance.mutateAsync({ id: call.id, status: "no_show" }))
                }
              >
                Não compareceu
              </Button>
              <ConfirmDialog
                title="Cancelar esta call?"
                description="O closer e quem agendou ficam livres no horário. Esta ação não pode ser desfeita."
                confirmLabel="Sim, cancelar"
                destructive
                onConfirm={() => run(cancel.mutateAsync(call.id))}
                trigger={
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={cancel.isPending}
                  >
                    Cancelar
                  </Button>
                }
              />
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
