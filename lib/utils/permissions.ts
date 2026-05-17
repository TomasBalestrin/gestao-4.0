import type { UserRole } from "@/lib/database.types";

export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === "admin";
}

export function isCloser(role: UserRole | null | undefined): boolean {
  return role === "closer";
}

// Funis: admin acessa todos; demais só os que estão vinculados em user_funis.
export function canAccessFunil(
  role: UserRole | null | undefined,
  allowedFunilIds: readonly string[],
  funilId: string
): boolean {
  if (isAdmin(role)) return true;
  return allowedFunilIds.includes(funilId);
}

// CRM kanban: todos menos financeiro (ux-flows: /crm role≠financeiro).
export function canAccessCrm(role: UserRole | null | undefined): boolean {
  return !!role && role !== "financeiro";
}

// Agenda: admin, social_selling, closer, sdr, lider.
export function canAccessAgenda(role: UserRole | null | undefined): boolean {
  return (
    role === "admin" ||
    role === "social_selling" ||
    role === "closer" ||
    role === "sdr" ||
    role === "lider"
  );
}

// Configuração de horários de closers: admin + lider.
export function canManageHorarios(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "lider";
}

// Visão de todos os cards (não só os próprios): admin, financeiro, lider.
export function canViewAllCards(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "financeiro" || role === "lider";
}

// Pode criar/editar cards, leads, automacoes (closer e financeiro só leem).
export function canWriteCrm(role: UserRole | null | undefined): boolean {
  return (
    role === "admin" ||
    role === "lider" ||
    role === "social_selling" ||
    role === "sdr"
  );
}

// Pode mover cards entre etapas do kanban (todos que acessam o CRM, inclusive
// closer — closer só vê os próprios cards e só pode mover os que recebeu por
// agendamento). A RLS de cards UPDATE já filtra: assigned_to = auth.uid().
export function canMoveCards(role: UserRole | null | undefined): boolean {
  return canAccessCrm(role);
}

// Pode agendar/cancelar calls (admin organiza, SDR/social agenda; closer não).
export function canScheduleCalls(role: UserRole | null | undefined): boolean {
  return (
    role === "admin" ||
    role === "social_selling" ||
    role === "sdr" ||
    role === "lider"
  );
}
