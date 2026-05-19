"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { igChatKeys } from "@/hooks/useInstagramChat";

// Subscription Supabase Realtime na tabela ig_messages, filtrando pelo
// thread_id quando passamos leadId (resolvido na primeira fetch).
// Debounce 300ms igual ao do WPP pra evitar refetch em rajada.
export function useRealtimeInstagram(leadId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!leadId) return;
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let invalidateTimer: ReturnType<typeof setTimeout> | null = null;

    function scheduleInvalidate() {
      if (invalidateTimer) clearTimeout(invalidateTimer);
      invalidateTimer = setTimeout(() => {
        invalidateTimer = null;
        void queryClient.invalidateQueries({
          queryKey: igChatKeys.byLead(leadId as string),
        });
      }, 300);
    }

    channel = supabase
      .channel(`ig-chat:${leadId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ig_messages",
        },
        scheduleInvalidate
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ig_threads",
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
