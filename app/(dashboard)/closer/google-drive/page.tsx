import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { GoogleDriveConfig } from "@/components/calls/google-drive-config";

export const metadata = { title: "Google Drive | Gestão 4.0" };

export default async function CloserGoogleDrivePage() {
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

  if (!profile || profile.role !== "closer") {
    redirect("/");
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-medium tracking-tight">
          Análise de Calls
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Conecte seu Google Drive para o sistema analisar automaticamente as
          transcrições das suas calls.
        </p>
      </header>
      <GoogleDriveConfig />
    </div>
  );
}
