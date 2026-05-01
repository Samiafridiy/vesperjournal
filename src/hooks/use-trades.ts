import { useEffect, useState, useCallback, useId } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Trade } from "@/lib/trade-utils";

export function useTrades() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const instanceId = useId();

  const refetch = useCallback(async () => {
    if (!user) {
      setTrades([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .order("trade_date", { ascending: false });
    if (!error && data) setTrades(data as Trade[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Realtime updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`trades-changes-${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trades", filter: `user_id=eq.${user.id}` },
        () => refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetch, instanceId]);

  return { trades, loading, refetch };
}

export function useRequireAuth() {
  const { user, loading } = useAuth();
  return { user, loading, ready: !loading };
}