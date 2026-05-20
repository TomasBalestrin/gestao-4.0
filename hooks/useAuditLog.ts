import { useQuery } from "@tanstack/react-query";

import type { AuditEntityType, AuditEventType, AuditLog } from "@/types/domain";

export interface AuditLogEntry extends AuditLog {
  user: { id: string; nome: string } | null;
}

export interface AuditLogFilters {
  entity_type?: AuditEntityType | "";
  event_type?: AuditEventType | "";
  user_id?: string;
  from?: string;
  to?: string;
  page?: number;
}

export interface AuditLogPage {
  items: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

function toQuery(filters: AuditLogFilters): string {
  const params = new URLSearchParams();
  if (filters.entity_type) params.set("entity_type", filters.entity_type);
  if (filters.event_type) params.set("event_type", filters.event_type);
  if (filters.user_id) params.set("user_id", filters.user_id);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.page) params.set("page", String(filters.page));
  const s = params.toString();
  return s ? `?${s}` : "";
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = (await res.json().catch(() => null)) as
    | { data?: T; error?: string }
    | null;
  if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
  return body?.data as T;
}

export function useAuditLog(filters: AuditLogFilters) {
  return useQuery({
    queryKey: ["audit-log", filters],
    queryFn: () => getJson<AuditLogPage>(`/api/audit-log${toQuery(filters)}`),
  });
}

export function useCardHistory(cardId: string, enabled = true) {
  return useQuery({
    queryKey: ["audit-log", "card", cardId],
    queryFn: () => getJson<AuditLogEntry[]>(`/api/audit-log/card/${cardId}`),
    enabled,
  });
}

export const EVENT_LABELS: Record<AuditEventType, string> = {
  card_created: "Card criado",
  card_updated: "Card atualizado",
  card_moved: "Card movido",
  card_deleted: "Card removido",
  lead_created: "Lead criado",
  lead_updated: "Lead atualizado",
  lead_deleted: "Lead removido",
  call_scheduled: "Call agendada",
  call_cancelled: "Call cancelada",
  call_completed: "Call concluída",
  call_no_show: "Call — não compareceu",
  automation_executed: "Automação executada",
  automation_failed: "Automação falhou",
  funil_created: "Funil criado",
  funil_updated: "Funil atualizado",
  funil_archived: "Funil arquivado",
  etapa_created: "Etapa criada",
  etapa_updated: "Etapa atualizada",
  etapa_deleted: "Etapa removida",
  user_created: "Usuário criado",
  user_updated: "Usuário atualizado",
  user_deactivated: "Usuário desativado",
  user_deleted: "Usuário excluído",
  wa_instance_connected: "WhatsApp conectado",
  wa_instance_disconnected: "WhatsApp desconectado",
  venda_created: "Venda registrada",
  venda_updated: "Venda atualizada",
  venda_deleted: "Venda removida",
  ig_instance_connected: "Instagram conectado",
  ig_instance_disconnected: "Instagram desconectado",
  ig_token_refreshed: "Token Instagram renovado",
  google_drive_connected: "Google Drive conectado",
  google_drive_disconnected: "Google Drive desconectado",
  google_drive_token_refreshed: "Token Google renovado",
  google_drive_config_updated: "Config Google Drive atualizada",
  call_analysis_created: "Análise de call criada",
  call_analysis_linked: "Análise vinculada a lead",
  call_analysis_unmatched: "Análise sem lead",
  call_analysis_deleted: "Análise removida",
};

export const ENTITY_LABELS: Record<AuditEntityType, string> = {
  card: "Card",
  lead: "Lead",
  funil: "Funil",
  etapa: "Etapa",
  user: "Usuário",
  call: "Call",
  automacao: "Automação",
  wa_instance: "Instância WhatsApp",
  venda: "Venda",
  google_drive_integration: "Google Drive",
  call_analysis: "Análise de call",
};
