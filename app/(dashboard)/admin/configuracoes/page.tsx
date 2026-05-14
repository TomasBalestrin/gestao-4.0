import { ConfigForm } from "@/components/configuracoes/config-form";

export default function AdminConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-medium tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Parâmetros globais da plataforma.
        </p>
      </div>
      <ConfigForm />
    </div>
  );
}
