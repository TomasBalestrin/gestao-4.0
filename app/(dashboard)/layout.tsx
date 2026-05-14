import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { CurrentUserProvider } from "@/components/providers/current-user-provider";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("nome, email, foto_url, role, is_active")
    .eq("id", user.id)
    .single();
  if (!profile || !profile.is_active) redirect("/login");

  return (
    <CurrentUserProvider userId={user.id} role={profile.role}>
      <div className="flex min-h-screen">
        <Sidebar role={profile.role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            nome={profile.nome}
            email={profile.email}
            fotoUrl={profile.foto_url}
          />
          <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-center text-xs text-amber-700 dark:text-amber-400 lg:hidden">
            Use a plataforma em um desktop para a melhor experiência.
          </div>
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 overflow-y-auto p-4 outline-none md:p-6"
          >
            <div className="mx-auto w-full max-w-screen-2xl">{children}</div>
          </main>
        </div>
      </div>
    </CurrentUserProvider>
  );
}
