"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";

import type { UserRole } from "@/lib/database.types";
import { useUiStore } from "@/lib/stores/uiStore";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

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

  // Subscription unica de realtime de notificacoes pro app inteiro.
  useRealtimeNotifications();

  // Dispara digest do dia 1x por usuario+data, marcando em sessionStorage.
  // Antes usava useQuery com gcTime 24h, mas ocupava memoria sem necessidade.
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const key = `daily-digest:${userId}:${today}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void fetch("/api/notifications/daily-digest", { method: "POST" }).catch(
      () => undefined
    );
  }, [userId]);

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
