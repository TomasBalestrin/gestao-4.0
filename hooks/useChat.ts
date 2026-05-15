import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ChatMessageWithMedia, ChatThread, Lead } from "@/types/domain";

export const chatKeys = {
  byLead: (leadId: string) => ["chat", leadId] as const,
};

export interface ChatMessagesResponse {
  messages: ChatMessageWithMedia[];
  thread: ChatThread | null;
  can_send: boolean;
  lead?: Pick<Lead, "id" | "nome" | "telefone">;
}

async function fetchMessages(leadId: string): Promise<ChatMessagesResponse> {
  const res = await fetch(
    `/api/chats/leads/${leadId}/messages?limit=50`
  );
  const body = (await res.json().catch(() => null)) as
    | { data?: ChatMessagesResponse; error?: string }
    | null;
  if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
  return (
    body?.data ?? { messages: [], thread: null, can_send: false }
  );
}

export function useChatMessages(leadId: string | null) {
  return useQuery({
    queryKey: leadId ? chatKeys.byLead(leadId) : ["chat", "noop"],
    queryFn: () => fetchMessages(leadId as string),
    enabled: !!leadId,
    staleTime: 5_000,
  });
}

export function useSendMessage(leadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { text?: string; file?: File; caption?: string }) => {
      let res: Response;
      if (input.file) {
        const form = new FormData();
        form.append("file", input.file);
        if (input.caption) form.append("caption", input.caption);
        res = await fetch(`/api/chats/leads/${leadId}/send`, {
          method: "POST",
          body: form,
        });
      } else {
        res = await fetch(`/api/chats/leads/${leadId}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: input.text ?? "" }),
        });
      }
      const body = (await res.json().catch(() => null)) as
        | { data?: { message: ChatMessageWithMedia }; error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
      return body?.data?.message;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chatKeys.byLead(leadId) });
    },
  });
}

export function useMarkChatRead(leadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/chats/leads/${leadId}/mark-read`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? `Erro ${res.status}`);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chatKeys.byLead(leadId) });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
