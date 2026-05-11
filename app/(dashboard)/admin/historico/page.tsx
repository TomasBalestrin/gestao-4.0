import { HistoricoTable } from "@/components/audit/historico-table";

export default function AdminHistoricoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Histórico</h1>
        <p className="text-sm text-muted-foreground">
          Registro append-only de eventos do sistema.
        </p>
      </div>
      <HistoricoTable />
    </div>
  );
}
