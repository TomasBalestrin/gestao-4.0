"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

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

  // Dispara digest do dia 1x por usuário+data. Backend já é idempotente, mas
  // o queryKey por data + staleTime Infinity evita o POST extra a cada mount.
  const today = new Date().toISOString().slice(0, 10);
  useQuery({
    queryKey: ["daily-digest", userId, today],
    queryFn: async () => {
      await fetch("/api/notifications/daily-digest", { method: "POST" }).catch(
        () => undefined
      );
      return true;
    },
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
    retry: false,
  });

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
