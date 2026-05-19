// lib/database.types.ts
//
// ⚙️ Este arquivo deveria ser gerado por:
//   npx supabase gen types typescript --linked > lib/database.types.ts
// Enquanto o projeto Supabase não está provisionado, mantemos esta versão
// escrita à mão, fiel ao schema em docs/schema.md. Regenerar quando o projeto
// estiver linkado.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole =
  | "admin"
  | "social_selling"
  | "closer"
  | "sdr"
  | "financeiro"
  | "lider";

export type CustomFieldType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "multi_select"
  | "currency"
  | "phone"
  | "email"
  | "textarea";

export type AutomacaoAction = "move_to" | "duplicate_to";

export type CallStatus = "scheduled" | "completed" | "cancelled" | "no_show";

export type AuditEventType =
  | "card_created"
  | "card_updated"
  | "card_moved"
  | "card_deleted"
  | "lead_created"
  | "lead_updated"
  | "lead_deleted"
  | "call_scheduled"
  | "call_cancelled"
  | "call_completed"
  | "call_no_show"
  | "automation_executed"
  | "automation_failed"
  | "funil_created"
  | "funil_updated"
  | "funil_archived"
  | "etapa_created"
  | "etapa_updated"
  | "etapa_deleted"
  | "user_created"
  | "user_updated"
  | "user_deactivated"
  | "user_deleted"
  | "wa_instance_connected"
  | "wa_instance_disconnected"
  | "venda_created"
  | "venda_updated"
  | "venda_deleted"
  | "card_copied_to_financeiro";

export type AuditEntityType =
  | "card"
  | "lead"
  | "funil"
  | "etapa"
  | "user"
  | "call"
  | "automacao"
  | "wa_instance"
  | "venda";

export type NotificationType =
  | "card_assigned"
  | "card_moved_to_my_funil"
  | "call_scheduled"
  | "call_cancelled"
  | "automation_failed"
  | "chat_message_received"
  | "daily_digest"
  | "system";

export type DiaSemana =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type WaInstanceStatus =
  | "pending"
  | "qr_pending"
  | "connected"
  | "disconnected";

export type ChatDirection = "inbound" | "outbound";

export type ChatContentType =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "document"
  | "sticker"
  | "location"
  | "unsupported";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          nome: string;
          foto_url: string | null;
          role: UserRole;
          is_active: boolean;
          must_change_password: boolean;
          theme_preference: string;
          numero_status: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          nome: string;
          foto_url?: string | null;
          role?: UserRole;
          is_active?: boolean;
          must_change_password?: boolean;
          theme_preference?: string;
          numero_status?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          nome?: string;
          foto_url?: string | null;
          role?: UserRole;
          is_active?: boolean;
          must_change_password?: boolean;
          theme_preference?: string;
          numero_status?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      funis: {
        Row: {
          id: string;
          nome: string;
          cor: string;
          descricao: string | null;
          role_alvo: UserRole;
          is_archived: boolean;
          agenda_call_enabled: boolean;
          funil_destino_id: string | null;
          etapa_destino_id: string | null;
          funil_financeiro_id: string | null;
          etapa_envio_financeiro_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          cor?: string;
          descricao?: string | null;
          role_alvo: UserRole;
          is_archived?: boolean;
          agenda_call_enabled?: boolean;
          funil_destino_id?: string | null;
          etapa_destino_id?: string | null;
          funil_financeiro_id?: string | null;
          etapa_envio_financeiro_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          cor?: string;
          descricao?: string | null;
          role_alvo?: UserRole;
          is_archived?: boolean;
          agenda_call_enabled?: boolean;
          funil_destino_id?: string | null;
          etapa_destino_id?: string | null;
          funil_financeiro_id?: string | null;
          etapa_envio_financeiro_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "funis_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "funis_funil_destino_id_fkey";
            columns: ["funil_destino_id"];
            referencedRelation: "funis";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "funis_etapa_destino_id_fkey";
            columns: ["etapa_destino_id"];
            referencedRelation: "etapas";
            referencedColumns: ["id"];
          },
        ];
      };
      etapas: {
        Row: {
          id: string;
          funil_id: string;
          nome: string;
          cor: string;
          ordem: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          funil_id: string;
          nome: string;
          cor?: string;
          ordem: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          funil_id?: string;
          nome?: string;
          cor?: string;
          ordem?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "etapas_funil_id_fkey";
            columns: ["funil_id"];
            referencedRelation: "funis";
            referencedColumns: ["id"];
          },
        ];
      };
      user_funis: {
        Row: {
          user_id: string;
          funil_id: string;
          is_spectator: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          funil_id: string;
          is_spectator?: boolean;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          funil_id?: string;
          is_spectator?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_funis_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_funis_funil_id_fkey";
            columns: ["funil_id"];
            referencedRelation: "funis";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          id: string;
          nome: string;
          email: string | null;
          telefone: string | null;
          instagram: string | null;
          empresa: string | null;
          nicho: string | null;
          faturamento_mensal: number | null;
          tem_socio: boolean | null;
          funil_origem: string | null;
          sdr_id: string | null;
          produto_ofertado: string | null;
          dor_principal: string | null;
          observacoes: string | null;
          data_followup: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          nome: string;
          email?: string | null;
          telefone?: string | null;
          instagram?: string | null;
          empresa?: string | null;
          nicho?: string | null;
          faturamento_mensal?: number | null;
          tem_socio?: boolean | null;
          funil_origem?: string | null;
          sdr_id?: string | null;
          produto_ofertado?: string | null;
          dor_principal?: string | null;
          observacoes?: string | null;
          data_followup?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          nome?: string;
          email?: string | null;
          telefone?: string | null;
          instagram?: string | null;
          empresa?: string | null;
          nicho?: string | null;
          faturamento_mensal?: number | null;
          tem_socio?: boolean | null;
          funil_origem?: string | null;
          sdr_id?: string | null;
          produto_ofertado?: string | null;
          dor_principal?: string | null;
          observacoes?: string | null;
          data_followup?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "leads_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_sdr_id_fkey";
            columns: ["sdr_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      cards: {
        Row: {
          id: string;
          lead_id: string;
          funil_id: string;
          etapa_id: string;
          assigned_to: string | null;
          created_by: string | null;
          parent_card_id: string | null;
          ordem_na_etapa: number;
          follow_up_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          lead_id: string;
          funil_id: string;
          etapa_id: string;
          assigned_to?: string | null;
          created_by?: string | null;
          parent_card_id?: string | null;
          ordem_na_etapa?: number;
          follow_up_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          lead_id?: string;
          funil_id?: string;
          etapa_id?: string;
          assigned_to?: string | null;
          created_by?: string | null;
          parent_card_id?: string | null;
          ordem_na_etapa?: number;
          follow_up_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cards_lead_id_fkey";
            columns: ["lead_id"];
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cards_funil_id_fkey";
            columns: ["funil_id"];
            referencedRelation: "funis";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cards_etapa_id_fkey";
            columns: ["etapa_id"];
            referencedRelation: "etapas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cards_assigned_to_fkey";
            columns: ["assigned_to"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cards_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cards_parent_card_id_fkey";
            columns: ["parent_card_id"];
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
        ];
      };
      automacoes: {
        Row: {
          id: string;
          etapa_id: string;
          nome: string;
          action: AutomacaoAction;
          config: Json;
          notificacoes: Json;
          ativo: boolean;
          ordem: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          etapa_id: string;
          nome: string;
          action: AutomacaoAction;
          config?: Json;
          notificacoes?: Json;
          ativo?: boolean;
          ordem?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          etapa_id?: string;
          nome?: string;
          action?: AutomacaoAction;
          config?: Json;
          notificacoes?: Json;
          ativo?: boolean;
          ordem?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "automacoes_etapa_id_fkey";
            columns: ["etapa_id"];
            referencedRelation: "etapas";
            referencedColumns: ["id"];
          },
        ];
      };
      automation_errors: {
        Row: {
          id: string;
          automacao_id: string | null;
          card_id: string | null;
          payload: Json;
          error_message: string;
          error_code: string | null;
          retry_count: number;
          resolved_at: string | null;
          resolved_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          automacao_id?: string | null;
          card_id?: string | null;
          payload: Json;
          error_message: string;
          error_code?: string | null;
          retry_count?: number;
          resolved_at?: string | null;
          resolved_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          automacao_id?: string | null;
          card_id?: string | null;
          payload?: Json;
          error_message?: string;
          error_code?: string | null;
          retry_count?: number;
          resolved_at?: string | null;
          resolved_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "automation_errors_automacao_id_fkey";
            columns: ["automacao_id"];
            referencedRelation: "automacoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "automation_errors_card_id_fkey";
            columns: ["card_id"];
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "automation_errors_resolved_by_fkey";
            columns: ["resolved_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      closer_horarios: {
        Row: {
          id: string;
          closer_id: string;
          dia_semana: DiaSemana;
          blocos: Json;
          slot_duration_min: number;
          buffer_min: number;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          closer_id: string;
          dia_semana: DiaSemana;
          blocos?: Json;
          slot_duration_min?: number;
          buffer_min?: number;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          closer_id?: string;
          dia_semana?: DiaSemana;
          blocos?: Json;
          slot_duration_min?: number;
          buffer_min?: number;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "closer_horarios_closer_id_fkey";
            columns: ["closer_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      calls: {
        Row: {
          id: string;
          card_id: string;
          closer_id: string;
          scheduled_by: string;
          slot_start: string;
          slot_end: string;
          status: CallStatus;
          notes: string | null;
          cancelled_by: string | null;
          cancelled_at: string | null;
          attended_marked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          closer_id: string;
          scheduled_by: string;
          slot_start: string;
          slot_end: string;
          status?: CallStatus;
          notes?: string | null;
          cancelled_by?: string | null;
          cancelled_at?: string | null;
          attended_marked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string;
          closer_id?: string;
          scheduled_by?: string;
          slot_start?: string;
          slot_end?: string;
          status?: CallStatus;
          notes?: string | null;
          cancelled_by?: string | null;
          cancelled_at?: string | null;
          attended_marked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calls_card_id_fkey";
            columns: ["card_id"];
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calls_closer_id_fkey";
            columns: ["closer_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calls_scheduled_by_fkey";
            columns: ["scheduled_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calls_cancelled_by_fkey";
            columns: ["cancelled_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          id: string;
          entity_type: AuditEntityType;
          entity_id: string;
          event_type: AuditEventType;
          user_id: string | null;
          before: Json | null;
          after: Json | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          entity_type: AuditEntityType;
          entity_id: string;
          event_type: AuditEventType;
          user_id?: string | null;
          before?: Json | null;
          after?: Json | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          entity_type?: AuditEntityType;
          entity_id?: string;
          event_type?: AuditEventType;
          user_id?: string | null;
          before?: Json | null;
          after?: Json | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          tipo: NotificationType;
          titulo: string;
          descricao: string | null;
          link: string | null;
          metadata: Json | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tipo: NotificationType;
          titulo: string;
          descricao?: string | null;
          link?: string | null;
          metadata?: Json | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tipo?: NotificationType;
          titulo?: string;
          descricao?: string | null;
          link?: string | null;
          metadata?: Json | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      configuracoes_globais: {
        Row: {
          key: string;
          value: Json;
          description: string | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          description?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          description?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "configuracoes_globais_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      wa_instances: {
        Row: {
          id: string;
          user_id: string;
          nextapi_instance_id: string;
          nextapi_instance_token: string | null;
          phone_number: string | null;
          status: WaInstanceStatus;
          last_qr_code: string | null;
          last_qr_at: string | null;
          last_connected_at: string | null;
          last_disconnected_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          nextapi_instance_id: string;
          nextapi_instance_token?: string | null;
          phone_number?: string | null;
          status?: WaInstanceStatus;
          last_qr_code?: string | null;
          last_qr_at?: string | null;
          last_connected_at?: string | null;
          last_disconnected_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          nextapi_instance_id?: string;
          nextapi_instance_token?: string | null;
          phone_number?: string | null;
          status?: WaInstanceStatus;
          last_qr_code?: string | null;
          last_qr_at?: string | null;
          last_connected_at?: string | null;
          last_disconnected_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wa_instances_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_threads: {
        Row: {
          id: string;
          lead_id: string;
          wa_instance_id: string;
          remote_jid: string;
          last_message_at: string | null;
          last_message_preview: string | null;
          unread_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          wa_instance_id: string;
          remote_jid: string;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          unread_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          wa_instance_id?: string;
          remote_jid?: string;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          unread_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_threads_lead_id_fkey";
            columns: ["lead_id"];
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_threads_wa_instance_id_fkey";
            columns: ["wa_instance_id"];
            referencedRelation: "wa_instances";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_messages: {
        Row: {
          id: string;
          thread_id: string;
          nextapi_message_id: string | null;
          direction: ChatDirection;
          from_me: boolean;
          content_type: ChatContentType;
          text: string | null;
          media_path: string | null;
          media_mime_type: string | null;
          media_size_bytes: number | null;
          metadata: Json | null;
          wa_timestamp: string;
          delivered_at: string | null;
          read_at: string | null;
          failed_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          nextapi_message_id?: string | null;
          direction: ChatDirection;
          from_me: boolean;
          content_type: ChatContentType;
          text?: string | null;
          media_path?: string | null;
          media_mime_type?: string | null;
          media_size_bytes?: number | null;
          metadata?: Json | null;
          wa_timestamp: string;
          delivered_at?: string | null;
          read_at?: string | null;
          failed_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          nextapi_message_id?: string | null;
          direction?: ChatDirection;
          from_me?: boolean;
          content_type?: ChatContentType;
          text?: string | null;
          media_path?: string | null;
          media_mime_type?: string | null;
          media_size_bytes?: number | null;
          metadata?: Json | null;
          wa_timestamp?: string;
          delivered_at?: string | null;
          read_at?: string | null;
          failed_reason?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey";
            columns: ["thread_id"];
            referencedRelation: "chat_threads";
            referencedColumns: ["id"];
          },
        ];
      };
      vendas: {
        Row: {
          id: string;
          lead_id: string;
          card_id: string | null;
          valor: number;
          vigencia: string | null;
          produto: string | null;
          nome_completo: string;
          nacionalidade: string | null;
          estado_civil: string | null;
          cpf: string | null;
          rg: string | null;
          cnpj: string | null;
          endereco: string | null;
          bairro: string | null;
          cidade: string | null;
          cep: string | null;
          instagram: string | null;
          email: string | null;
          whatsapp: string | null;
          data_nascimento: string | null;
          forma_pagamento: string | null;
          data_venda: string | null;
          funil_id: string | null;
          sdr_id: string | null;
          registered_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          card_id?: string | null;
          valor: number;
          vigencia?: string | null;
          produto?: string | null;
          nome_completo: string;
          nacionalidade?: string | null;
          estado_civil?: string | null;
          cpf?: string | null;
          rg?: string | null;
          cnpj?: string | null;
          endereco?: string | null;
          bairro?: string | null;
          cidade?: string | null;
          cep?: string | null;
          instagram?: string | null;
          email?: string | null;
          whatsapp?: string | null;
          data_nascimento?: string | null;
          forma_pagamento?: string | null;
          data_venda?: string | null;
          funil_id?: string | null;
          sdr_id?: string | null;
          registered_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          card_id?: string | null;
          valor?: number;
          vigencia?: string | null;
          produto?: string | null;
          nome_completo?: string;
          nacionalidade?: string | null;
          estado_civil?: string | null;
          cpf?: string | null;
          rg?: string | null;
          cnpj?: string | null;
          endereco?: string | null;
          bairro?: string | null;
          cidade?: string | null;
          cep?: string | null;
          instagram?: string | null;
          email?: string | null;
          whatsapp?: string | null;
          data_nascimento?: string | null;
          forma_pagamento?: string | null;
          data_venda?: string | null;
          funil_id?: string | null;
          sdr_id?: string | null;
          registered_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendas_lead_id_fkey";
            columns: ["lead_id"];
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vendas_card_id_fkey";
            columns: ["card_id"];
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vendas_funil_id_fkey";
            columns: ["funil_id"];
            referencedRelation: "funis";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vendas_sdr_id_fkey";
            columns: ["sdr_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vendas_registered_by_fkey";
            columns: ["registered_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      follow_ups: {
        Row: {
          id: string;
          card_id: string;
          user_id: string;
          due_date: string;
          done_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          user_id: string;
          due_date: string;
          done_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string;
          user_id?: string;
          due_date?: string;
          done_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follow_ups_card_id_fkey";
            columns: ["card_id"];
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_ups_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      v_cards_with_lead: {
        Row: {
          id: string | null;
          funil_id: string | null;
          etapa_id: string | null;
          assigned_to: string | null;
          created_by: string | null;
          parent_card_id: string | null;
          ordem_na_etapa: number | null;
          created_at: string | null;
          updated_at: string | null;
          lead_id: string | null;
          lead_nome: string | null;
          lead_email: string | null;
          lead_telefone: string | null;
          lead_instagram: string | null;
          lead_empresa: string | null;
          lead_nicho: string | null;
          lead_faturamento_mensal: number | null;
          lead_tem_socio: boolean | null;
          lead_funil_origem: string | null;
          lead_sdr_id: string | null;
          lead_produto_ofertado: string | null;
          lead_dor_principal: string | null;
          lead_observacoes: string | null;
          lead_data_followup: string | null;
          etapa_nome: string | null;
          etapa_cor: string | null;
          assigned_nome: string | null;
          assigned_foto: string | null;
        };
        Relationships: [];
      };
      v_calls_with_context: {
        Row: {
          id: string | null;
          slot_start: string | null;
          slot_end: string | null;
          status: CallStatus | null;
          notes: string | null;
          created_at: string | null;
          card_id: string | null;
          lead_nome: string | null;
          lead_telefone: string | null;
          closer_id: string | null;
          closer_nome: string | null;
          scheduled_by_id: string | null;
          scheduled_by_nome: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      auth_user_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      custom_field_type: CustomFieldType;
      automacao_action: AutomacaoAction;
      call_status: CallStatus;
      audit_event_type: AuditEventType;
      audit_entity_type: AuditEntityType;
      notification_type: NotificationType;
      dia_semana: DiaSemana;
      wa_instance_status: WaInstanceStatus;
      chat_direction: ChatDirection;
      chat_content_type: ChatContentType;
    };
    CompositeTypes: Record<string, never>;
  };
}
