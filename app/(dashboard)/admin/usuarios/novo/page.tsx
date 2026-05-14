import { UserForm } from "@/components/users/user-form";

export default function NovoUsuarioPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-medium tracking-tight">Novo usuário</h1>
        <p className="text-sm text-muted-foreground">
          Uma senha temporária será gerada para o primeiro acesso.
        </p>
      </div>
      <UserForm mode="create" />
    </div>
  );
}
