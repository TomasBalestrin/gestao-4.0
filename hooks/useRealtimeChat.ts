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
    // Debounce de 300ms: rajadas de mensagens (varios eventos no mesmo
    // segundo) viram 1 invalidate so. Evita refetch em loop quando ha
    // varios usuarios digitando ou quando o NextTrack envia status updates.
    let invalidateTimer: ReturnType<typeof setTimeout> | null = null;
    function scheduleInvalidate() {
      if (invalidateTimer) clearTimeout(invalidateTimer);
      invalidateTimer = setTimeout(() => {
        invalidateTimer = null;
        void queryClient.invalidateQueries({
          queryKey: chatKeys.byLead(leadId as string),
        });
      }, 300);
    }

    channel = supabase
      .channel(`chat:${leadId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
        },
        scheduleInvalidate
      )
      .subscribe();

    return () => {
      if (invalidateTimer) clearTimeout(invalidateTimer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [leadId, queryClient]);
}
