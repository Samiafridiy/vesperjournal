import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { TradingRule } from "@/lib/rule-engine";
import { useDemoMode } from "@/lib/demo-mode";
import { DEMO_RULES } from "@/lib/demo-data";

export function useRules() {
  const { user } = useAuth();
  const { demo } = useDemoMode();
  const [rules, setRules] = useState<TradingRule[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setRules([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("trading_rules")
      .select("*")
      .order("created_at", { ascending: true });
    if (!error && data) setRules(data as TradingRule[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`rules-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trading_rules", filter: `user_id=eq.${user.id}` },
        () => refetch(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refetch]);

  if (demo) return { rules: DEMO_RULES, loading: false, refetch };

  return { rules, loading, refetch };
}