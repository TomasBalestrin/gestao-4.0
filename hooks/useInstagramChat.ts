import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  IgContentType,
  IgDirection,
  Json,
} from "@/lib/database.types";

export interface IgMessage {
  id: string;
  thread_id: string;
  meta_message_id: string | null;
  direction: IgDirection;
  from_me: boolean;
  content_type: IgContentType;
  text: string | null;
  media_url: string | null;
  media_path: string | null;
  media_mime_type: string | null;
  payload: Json | null;
  ig_timestamp: string;
  read_at: string | null;
  failed_reason: string | null;
}

export interface IgThreadSummary {
  id: string;
  lead_id: string;
  window_expires_at: string | null;
  ig_sender_username: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface IgMessagesResponse {
  messages: IgMessage[];
  thread: IgThreadSummary | null;
  can_send: boolean;
}

export const igChatKeys = {
  byLead: (leadId: string) => ["ig-chat", leadId] as const,
};

async function fetchMessages(leadId: string): Promise<IgMessagesResponse> {
  const res = await fetch(
    `/api/chats/instagram/leads/${leadId}/messages?limit=50`
  );
  const body = (await res.json().catch(() => null)) as
    | { data?: IgMessagesResponse; error?: string }
    | null;
  if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
  return body?.data ?? { messages: [], thread: null, can_send: false };
}

export function useIgMessages(leadId: string | null) {
  return useQuery({
    queryKey: leadId ? igChatKeys.byLead(leadId) : ["ig-chat", "noop"],
    queryFn: () => fetchMessages(leadId as string),
    enabled: !!leadId,
    staleTime: 15_000,
  });
}

export function useSendIgMessage(leadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(
        `/api/chats/instagram/leads/${leadId}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        }
      );
      const body = (await res.json().catch(() => null)) as
        | { data?: { message: IgMessage }; error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
      return body?.data?.message;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: igChatKeys.byLead(leadId) });
    },
  });
}
