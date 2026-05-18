"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";

import type { UserRole } from "@/lib/database.types";
import { useUiStore } from "@/lib/stores/uiStore";

interface CurrentUser {
  userId: string;
  role: UserRole;
  nome: string;
  email: string;
  fotoUrl: string | null;
}

const CurrentUserContext = createContext<CurrentUser | null>(null);

interface CurrentUserProviderProps {
  userId: string;
  role: UserRole;
  nome: string;
  email: string;
  fotoUrl: string | null;
  children: ReactNode;
}

export function CurrentUserProvider({
  userId,
  role,
  nome,
  email,
  fotoUrl,
  children,
}: CurrentUserProviderProps) {
  // Persist da sidebarCollapsed precisa de hidratação manual (skipHydration
  // evita mismatch SSR/CSR).
  useEffect(() => {
    void useUiStore.persist.rehydrate();
  }, []);

  // Dispara digest de tarefas do dia. Idempotente por user+data (server checa).
  useEffect(() => {
    void fetch("/api/notifications/daily-digest", { method: "POST" }).catch(
      () => undefined
    );
  }, []);

  return (
    <CurrentUserContext.Provider value={{ userId, role, nome, email, fotoUrl }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUser {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error("useCurrentUser must be used inside CurrentUserProvider");
  }
  return ctx;
}
