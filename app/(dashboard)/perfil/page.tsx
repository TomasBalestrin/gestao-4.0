import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/users/profile-form";

export default async function PerfilPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
        <p className="text-sm text-muted-foreground">
          Atualize seus dados e preferências.
        </p>
      </div>
      <ProfileForm user={profile} />
    </div>
  );
}
