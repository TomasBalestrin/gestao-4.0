import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type DigestPayload = {
  callsCount: number;
  followUpsCount: number;
  titulo: string;
  descricao: string;
  link: string;
};

function todayISO(): string {
  const now = new Date();
  // yyyy-mm-dd em horario local (data civil).
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dayRangeISO(date: string): { startISO: string; endISO: string } {
  // Considera o dia "civil" do server (UTC). Suficiente pra MVP.
  const start = new Date(`${date}T00:00:00Z`);
  const end = new Date(`${date}T23:59:59.999Z`);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

export async function generateDailyDigest(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<DigestPayload> {
  const today = todayISO();
  const { startISO, endISO } = dayRangeISO(today);

  const [callsRes, followUpsRes] = await Promise.all([
    supabase
      .from("calls")
      .select("id", { count: "exact", head: true })
      .eq("closer_id", userId)
      .eq("status", "scheduled")
      .gte("slot_start", startISO)
      .lte("slot_start", endISO),
    supabase
      .from("follow_ups")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("done_at", null)
      .eq("due_date", today),
  ]);

  const callsCount = callsRes.count ?? 0;
  const followUpsCount = followUpsRes.count ?? 0;

  const partes: string[] = [];
  if (callsCount > 0) {
    partes.push(`${callsCount} call${callsCount > 1 ? "s" : ""}`);
  }
  if (followUpsCount > 0) {
    partes.push(
      `${followUpsCount} follow-up${followUpsCount > 1 ? "s" : ""}`
    );
  }

  const titulo = "Suas tarefas de hoje";
  const descricao =
    partes.length === 0
      ? "Nenhuma call ou follow-up agendado para hoje."
      : `Você tem ${partes.join(" e ")} para hoje.`;

  return {
    callsCount,
    followUpsCount,
    titulo,
    descricao,
    link: "/agenda",
  };
}
