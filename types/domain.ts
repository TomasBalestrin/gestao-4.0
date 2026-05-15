import type { Database } from "@/lib/database.types";
import type { CustomFieldConfig } from "@/lib/schemas/custom-fields";
import type { NotificacaoConfig } from "@/lib/schemas/automacao";

type Tables = Database["public"]["Tables"];
type Views = Database["public"]["Views"];

// ===== Row aliases =====
export type User = Tables["users"]["Row"];
export type Funil = Tables["funis"]["Row"];
export type Etapa = Tables["etapas"]["Row"];
export type UserFunil = Tables["user_funis"]["Row"];
export type Lead = Tables["leads"]["Row"];
export type Card = Tables["cards"]["Row"];
export type Automacao = Tables["automacoes"]["Row"];
export type AutomationError = Tables["automation_errors"]["Row"];
export type CloserHorario = Tables["closer_horarios"]["Row"];
export type Call = Tables["calls"]["Row"];
export type AuditLog = Tables["audit_log"]["Row"];
export type Notification = Tables["notifications"]["Row"];
export type ConfiguracaoGlobal = Tables["configuracoes_globais"]["Row"];
export type WaInstance = Tables["wa_instances"]["Row"];
export type ChatThread = Tables["chat_threads"]["Row"];
export type ChatMessage = Tables["chat_messages"]["Row"];

export type UserRole = Database["public"]["Enums"]["user_role"];
export type CallStatus = Database["public"]["Enums"]["call_status"];
export type NotificationType = Database["public"]["Enums"]["notification_type"];
export type AuditEventType = Database["public"]["Enums"]["audit_event_type"];
export type AuditEntityType = Database["public"]["Enums"]["audit_entity_type"];
export type WaInstanceStatus = Database["public"]["Enums"]["wa_instance_status"];
export type ChatDirection = Database["public"]["Enums"]["chat_direction"];
export type ChatContentType = Database["public"]["Enums"]["chat_content_type"];

// ===== Composite types =====

// Funil tipado com a config de custom fields parseada.
export interface FunilTyped extends Omit<Funil, "custom_fields_schema"> {
  custom_fields_schema: CustomFieldConfig[];
}

export interface EtapaWithAutomacoes extends Etapa {
  automacoes: Automacao[];
}

export interface FunilWithEtapas extends FunilTyped {
  etapas: Etapa[];
}

export interface FunilWithEtapasAndAutomacoes extends FunilTyped {
  etapas: EtapaWithAutomacoes[];
  usuarios?: Pick<User, "id" | "nome" | "foto_url">[];
}

export interface CardWithLead extends Card {
  lead: Lead;
  etapa?: Pick<Etapa, "id" | "nome" | "cor" | "ordem">;
  assigned?: Pick<User, "id" | "nome" | "foto_url"> | null;
}

// Linha da view v_cards_with_lead (achatada).
export type CardWithLeadView = Views["v_cards_with_lead"]["Row"];

export interface AutomacaoTyped extends Omit<Automacao, "notificacoes"> {
  notificacoes: NotificacaoConfig[];
}

export interface CallWithContext extends Call {
  card: Pick<Card, "id" | "funil_id" | "etapa_id">;
  lead: Pick<Lead, "id" | "nome" | "telefone">;
  closer: Pick<User, "id" | "nome" | "foto_url">;
  scheduled_by_user: Pick<User, "id" | "nome">;
}

// Linha da view v_calls_with_context (achatada).
export type CallWithContextView = Views["v_calls_with_context"]["Row"];

export interface AutomationErrorWithCard extends AutomationError {
  card?: Pick<Card, "id" | "funil_id"> & {
    lead?: Pick<Lead, "id" | "nome">;
  };
  automacao?: Pick<Automacao, "id" | "nome" | "action"> | null;
}

export interface NotificationItem extends Notification {}

export interface ChatMessageWithMedia extends ChatMessage {
  media_signed_url?: string | null;
}

export interface ChatThreadWithInstance extends ChatThread {
  wa_instance?: Pick<WaInstance, "id" | "phone_number" | "user_id" | "status">;
}

// Result do engine de automação (retornado por POST /api/cards/[id]/move).
export interface AutomationExecution {
  automacao_id: string;
  nome: string;
  action: Automacao["action"];
  success: boolean;
  error?: string;
}
export interface AutomationResult {
  success: boolean;
  executions: AutomationExecution[];
  automation_error_id?: string;
}
