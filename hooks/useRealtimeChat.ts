"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { chatKeys } from "@/hooks/useChat";

// Assina chat_messages para a thread aberta atualmente.
// Único useEffect "permitido" — é subscrição, não fetch.
export function useRealtimeChat(leadId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!leadId) return;
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;

    channel = supabase
      .channel(`chat:${leadId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: chatKeys.byLead(leadId),
          });
        }
      )
      .subscribe();

    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, [leadId, queryClient]);
}
