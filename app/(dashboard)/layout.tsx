import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { CurrentUserProvider } from "@/components/providers/current-user-provider";
import { ChatSheet } from "@/components/chat/chat-sheet";
import { ProfileSheet } from "@/components/profile/profile-sheet";
import { PetCompanion } from "@/components/shared/pet-companion";

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
    <CurrentUserProvider
      userId={user.id}
      role={profile.role}
      nome={profile.nome}
      email={profile.email}
      fotoUrl={profile.foto_url}
    >
      <div className="flex h-screen overflow-hidden">
        <Sidebar role={profile.role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <div className="border-b border-[color:var(--warning-color)]/30 bg-[var(--warning-soft)] px-4 py-1.5 text-center text-[12px] text-[color:var(--warning-color)] lg:hidden">
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
      <ChatSheet />
      <ProfileSheet />
      <PetCompanion />
    </CurrentUserProvider>
  );
}
