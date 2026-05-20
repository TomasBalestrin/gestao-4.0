import type { Database } from "@/lib/database.types";
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
export type Venda = Tables["vendas"]["Row"];
export type FollowUp = Tables["follow_ups"]["Row"];

export interface VendaWithUser extends Venda {
  registered_by_user?: Pick<User, "id" | "nome" | "foto_url"> | null;
}

export type UserRole = Database["public"]["Enums"]["user_role"];
export type CallStatus = Database["public"]["Enums"]["call_status"];
export type NotificationType = Database["public"]["Enums"]["notification_type"];
export type AuditEventType = Database["public"]["Enums"]["audit_event_type"];
export type AuditEntityType = Database["public"]["Enums"]["audit_entity_type"];
export type WaInstanceStatus = Database["public"]["Enums"]["wa_instance_status"];
export type ChatDirection = Database["public"]["Enums"]["chat_direction"];
export type ChatContentType = Database["public"]["Enums"]["chat_content_type"];

// ===== Google Drive + Call Analysis =====
export type GoogleDriveIntegration = Tables["google_drive_integrations"]["Row"];
export type CallAnalysisRow = Tables["call_analyses"]["Row"];
export type GoogleDriveStatus = Database["public"]["Enums"]["google_drive_status"];
export type CallAnalysisStatus = Database["public"]["Enums"]["call_analysis_status"];

// Versao publica (sem tokens) pra retornar no GET /api/google/integrations/me.
export type GoogleDriveIntegrationPublic = Omit<
  GoogleDriveIntegration,
  "access_token" | "refresh_token"
>;

export interface CallAnalysisJson {
  resumo?: string;
  pontos_fortes?: string[];
  pontos_fracos?: string[];
  sugestoes?: string[];
  // Schema flexivel: outros campos do template do sistema antigo entram aqui.
  [key: string]: unknown;
}

// CallAnalysis com analysis_json tipado.
export interface CallAnalysis extends Omit<CallAnalysisRow, "analysis_json"> {
  analysis_json: CallAnalysisJson | null;
}

export interface CallAnalysisWithRelations extends CallAnalysis {
  closer?: Pick<User, "id" | "nome" | "foto_url"> | null;
  lead?: Pick<Lead, "id" | "nome" | "telefone"> | null;
}

export interface GoogleDriveFolderOption {
  id: string;
  name: string;
  parents?: string[];
}

// ===== Composite types =====

export interface EtapaWithAutomacoes extends Etapa {
  automacoes: Automacao[];
}

export interface FunilWithEtapas extends Funil {
  etapas: Etapa[];
}

export interface FunilWithEtapasAndAutomacoes extends Funil {
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
