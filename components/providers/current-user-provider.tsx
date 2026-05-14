"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { UserRole } from "@/lib/database.types";

interface CurrentUser {
  userId: string;
  role: UserRole;
}

const CurrentUserContext = createContext<CurrentUser | null>(null);

interface CurrentUserProviderProps {
  userId: string;
  role: UserRole;
  children: ReactNode;
}

export function CurrentUserProvider({
  userId,
  role,
  children,
}: CurrentUserProviderProps) {
  return (
    <CurrentUserContext.Provider value={{ userId, role }}>
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
