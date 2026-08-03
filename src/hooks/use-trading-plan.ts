import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useTradingPlan() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setPlan("");
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("trading_plan")
      .eq("id", user.id)
      .maybeSingle();
    setPlan((data?.trading_plan as string | null) ?? "");
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
      if (!error) setPlan(text);
      return { error };
    },
    [user],
  );

  return { plan, loading, save, refetch };
}
