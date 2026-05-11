"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { notificationsKeys } from "@/hooks/useNotifications";

// Assina o canal Realtime de notificações do usuário atual.
// (Único useEffect "permitido": é uma subscrição, não fetch.)
export function useRealtimeNotifications() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            void queryClient.invalidateQueries({
              queryKey: notificationsKeys.all,
            });
            const titulo = (payload.new as { titulo?: string } | null)?.titulo;
            if (titulo) toast(titulo);
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
