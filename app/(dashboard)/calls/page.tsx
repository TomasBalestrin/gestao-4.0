import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { canAccessCallAnalyses } from "@/lib/utils/permissions";
import { CallAnalysesView } from "@/components/calls/call-analyses-view";

export const metadata = { title: "Análise de Calls | Gestão 4.0" };

export default async function CallAnalysesPage() {
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

  if (!profile || !canAccessCallAnalyses(profile.role)) {
    redirect("/");
  }

  return (
    <div className="mx-auto w-full max-w-7xl p-6">
      <CallAnalysesView role={profile.role} userId={user.id} />
    </div>
  );
}
