import type { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/database.types";
import type { NotificacaoConfig } from "@/lib/schemas/automacao";
import type { NotificationType } from "@/types/domain";

type AdminClient = ReturnType<typeof createAdminClient>;

export interface InAppNotificationParams {
  userIds: string[];
  tipo: NotificationType;
  titulo: string;
  descricao?: string | null;
  link?: string | null;
  metadata?: Json | null;
}

export async function sendInAppNotification(
  admin: AdminClient,
  params: InAppNotificationParams
): Promise<void> {
  if (params.userIds.length === 0) return;
  const rows = params.userIds.map((uid) => ({
    user_id: uid,
    tipo: params.tipo,
    titulo: params.titulo,
    descricao: params.descricao ?? null,
    link: params.link ?? null,
    metadata: params.metadata ?? null,
  }));
  const { error } = await admin.from("notifications").insert(rows);
  if (error) throw new Error(`notificação in-app falhou: ${error.message}`);
}

// Adapters de mensageria — stubs no MVP.
export function sendWhatsAppNotification(message: string): void {
  console.warn(
    "[notifications] WhatsApp adapter not implemented (MVP stub):",
    message
  );
}

export function sendInstagramNotification(message: string): void {
  console.warn(
    "[notifications] Instagram adapter not implemented (MVP stub):",
    message
  );
}

// Resolve destinatários e despacha uma notificação configurada numa automação.
export async function dispatchNotification(
  admin: AdminClient,
  notif: NotificacaoConfig,
  context: { cardId: string; funilId: string }
): Promise<void> {
  if (notif.tipo === "whatsapp") {
    sendWhatsAppNotification(notif.mensagem ?? "");
    return;
  }
  if (notif.tipo === "instagram") {
    sendInstagramNotification(notif.mensagem ?? "");
    return;
  }

  // in_app
  let userIds: string[] = [];
  if (notif.target_user_id) {
    userIds = [notif.target_user_id];
  } else if (notif.target_role) {
    const { data } = await admin
      .from("users")
      .select("id")
      .eq("role", notif.target_role)
      .eq("is_active", true);
    userIds = (data ?? []).map((u) => u.id);
  }

  await sendInAppNotification(admin, {
    userIds,
    tipo: "card_moved_to_my_funil",
    titulo: notif.mensagem ?? "Card atualizado por automação",
    link: `/crm/${context.funilId}`,
    metadata: { card_id: context.cardId } as Json,
  });
}
