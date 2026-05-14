import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function DashboardIndexPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  switch (profile?.role) {
    case "closer":
      redirect("/closer");
    case "financeiro":
      redirect("/perfil");
    default:
      redirect("/crm");
  }
}
