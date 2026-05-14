import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AgendaView } from "@/components/agenda/agenda-view";

export default async function AgendaPage() {
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
  if (!profile) redirect("/login");

  return <AgendaView currentUserId={user.id} role={profile.role} />;
}
