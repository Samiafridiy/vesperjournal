import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useDemoMode } from "@/lib/demo-mode";
import { DEMO_PLAN } from "@/lib/demo-data";

export function useTradingPlan() {
  const { user } = useAuth();
  const { demo } = useDemoMode();
  const [plan, setPlan] = useState<string>("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setPlan("");
      setUpdatedAt(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("trading_plan, updated_at")
      .eq("id", user.id)
      .maybeSingle();
    setPlan((data?.trading_plan as string | null) ?? "");
    setUpdatedAt((data?.updated_at as string | null) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { refetch(); }, [refetch]);

  const save = useCallback(
    async (text: string) => {
      if (!user) return { error: new Error("Not signed in") };
      const { error } = await supabase
        .from("profiles")
        .update({ trading_plan: text })
        .eq("id", user.id);
      if (!error) {
        setPlan(text);
        setUpdatedAt(new Date().toISOString());
      }
      return { error };
    },
    [user],
  );

  if (demo) {
    return { plan: DEMO_PLAN, updatedAt: new Date().toISOString(), loading: false, save, refetch };
  }

  return { plan, updatedAt, loading, save, refetch };
}
