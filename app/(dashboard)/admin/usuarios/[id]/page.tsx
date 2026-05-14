import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { UserForm } from "@/components/users/user-form";

interface PageProps {
  params: { id: string };
}

export default async function EditUsuarioPage({ params }: PageProps) {
  const supabase = createClient();
  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!user) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-medium tracking-tight">{user.nome}</h1>
        <p className="text-sm text-muted-foreground">Editar usuário</p>
      </div>
      <UserForm mode="edit" user={user} />
    </div>
  );
}
