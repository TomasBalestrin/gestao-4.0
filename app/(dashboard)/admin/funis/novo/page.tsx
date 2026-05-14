import { FunilForm } from "@/components/funis/funil-form";

export default function NovoFunilPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-medium tracking-tight">Novo funil</h1>
        <p className="text-sm text-muted-foreground">
          Defina nome, etapas e campos customizados.
        </p>
      </div>
      <FunilForm mode="create" />
    </div>
  );
}
