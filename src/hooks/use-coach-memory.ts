import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Trade } from "@/lib/trade-utils";
import {
  buildMemoryContext,
  detectPatterns,
  type CoachMemoryRow,
  type PatternSnapshot,
} from "@/lib/coach-memory";

/**
 * Persistent memory layer for the AI Coach only.
 * Additive context — it never touches Vesper Score, Session Review or any other calculation.
 */
export function useCoachMemory(trades: Trade[]) {
  const { user } = useAuth();
  const [rows, setRows] = useState<CoachMemoryRow[]>([]);
  const snapshotsRef = useRef<PatternSnapshot[]>([]);
  snapshotsRef.current = detectPatterns(trades);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("coach_memory")
      .select("*")
      .order("last_updated_at", { ascending: false })
      .limit(20);
    setRows((data as CoachMemoryRow[]) ?? []);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const memoryContext = buildMemoryContext(rows, snapshotsRef.current);
  const hasFollowUp = Boolean(memoryContext);

  /** Called after an AI Coach analysis so the next session has continuity. */
  const recordAnalysis = useCallback(async () => {
    if (!user) return;
    const snapshots = snapshotsRef.current.filter((s) => s.count >= 1).slice(0, 8);
    if (snapshots.length === 0) return;

    const existing = new Map(rows.map((r) => [r.pattern_key, r]));
    const nowIso = new Date().toISOString();

    const payload = snapshots.map((s) => {
      const prev = existing.get(s.key);
      return {
        id: prev?.id,
        user_id: user.id,
        pattern_key: s.key,
        pattern_label: s.label,
        first_flagged_at: prev?.first_flagged_at ?? nowIso,
        first_occurrences: prev?.first_occurrences ?? s.count,
        first_impact: prev?.first_impact ?? s.impact,
        last_occurrences: s.recentCount,
        last_impact: s.recentImpact,
        last_updated_at: nowIso,
        last_shown_at: nowIso,
        times_shown: (prev?.times_shown ?? 0) + 1,
        status: s.recentCount === 0 ? "improving" : "open",
      };
    });

    const { error } = await supabase
      .from("coach_memory")
      .upsert(payload, { onConflict: "user_id,pattern_key" });
    if (!error) load();
  }, [user, rows, load]);

  return { memoryContext, hasFollowUp, recordAnalysis, reload: load };
}
