import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Database } from "@/integrations/supabase/types";

export type TradingAccount = Database["public"]["Tables"]["trading_accounts"]["Row"];
export type RiskPreset = Database["public"]["Tables"]["risk_presets"]["Row"];

export function useTradingAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setAccounts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("trading_accounts")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });
    setAccounts((data as TradingAccount[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const defaultAccount = accounts.find((a) => a.is_default) ?? accounts[0] ?? null;

  return { accounts, defaultAccount, loading, refetch };
}

export function useRiskPresets() {
  const { user } = useAuth();
  const [presets, setPresets] = useState<RiskPreset[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setPresets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("risk_presets")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });
    setPresets((data as RiskPreset[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const defaultPreset = presets.find((p) => p.is_default) ?? presets[0] ?? null;

  return { presets, defaultPreset, loading, refetch };
}

export function riskProfileLabel(riskPct: number): {
  label: "Conservative" | "Moderate" | "Aggressive";
  tone: "pos" | "warn" | "neg";
  color: string;
} {
  if (riskPct < 2) return { label: "Conservative", tone: "pos", color: "var(--pos)" };
  if (riskPct <= 5) return { label: "Moderate", tone: "warn", color: "var(--champagne)" };
  return { label: "Aggressive", tone: "neg", color: "var(--neg)" };
}

/** Drawdown projection after N consecutive losses. Returns the resulting balance and pct lost. */
export function projectDrawdown(balance: number, riskPct: number, losses: number) {
  const r = riskPct / 100;
  const remaining = balance * Math.pow(1 - r, losses);
  const lost = balance - remaining;
  const lostPct = (lost / balance) * 100;
  return { remaining, lost, lostPct };
}

/** Suggested lot size for a given risk %, account balance, stop distance in pips, and pair. */
export function suggestLotSize(opts: {
  balance: number;
  riskPct: number;
  stopPips: number;
  pipValuePerLot: number;
}): number | null {
  if (opts.stopPips <= 0 || opts.balance <= 0 || opts.pipValuePerLot <= 0) return null;
  const riskAmount = opts.balance * (opts.riskPct / 100);
  const lots = riskAmount / (opts.stopPips * opts.pipValuePerLot);
  return Number(lots.toFixed(2));
}