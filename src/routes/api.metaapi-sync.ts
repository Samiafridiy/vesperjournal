import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { calcRR, calcResult, type TradeInsert } from "@/lib/trade-utils";

/**
 * MetaApi cloud sync.
 * Pulls history-orders for the last 90 days, normalizes them into trades,
 * and inserts them with the caller's auth (RLS handles ownership).
 *
 * Body: { token: string, accountId: string, days?: number }
 */
export const Route = createFileRoute("/api/metaapi-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const accessToken = authHeader.replace(/^Bearer\s+/i, "");
        if (!accessToken) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const SUPABASE_URL = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
        const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!SUPABASE_URL || !SUPABASE_KEY) {
          return Response.json({ error: "Server misconfigured" }, { status: 500 });
        }

        // Verify the caller's identity
        const userClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
          global: { headers: { Authorization: `Bearer ${accessToken}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(accessToken);
        if (claimsErr || !claimsData?.claims?.sub) {
          return Response.json({ error: "Invalid token" }, { status: 401 });
        }
        const userId = claimsData.claims.sub;

        let body: { token?: string; accountId?: string; days?: number };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const { token, accountId, days = 90 } = body;
        if (!token || !accountId) {
          return Response.json({ error: "token and accountId required" }, { status: 400 });
        }

        const end = new Date();
        const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

        // MetaApi REST: /users/current/accounts/{accountId}/history-deals/time/{from}/{to}
        // We use the public history client endpoint.
        const url = `https://mt-client-api-v1.new-york.agiliumtrade.ai/users/current/accounts/${accountId}/history-deals/time/${start.toISOString()}/${end.toISOString()}`;

        let deals: any[];
        try {
          const r = await fetch(url, {
            headers: { "auth-token": token, "Accept": "application/json" },
          });
          if (!r.ok) {
            const text = await r.text();
            return Response.json(
              { error: `MetaApi error ${r.status}: ${text.slice(0, 200)}` },
              { status: 502 },
            );
          }
          deals = await r.json();
        } catch (e: any) {
          return Response.json({ error: `MetaApi request failed: ${e.message}` }, { status: 502 });
        }

        // Group deals into round-trip trades by positionId
        const positions = new Map<string, any[]>();
        for (const d of deals) {
          if (!d.positionId) continue;
          const arr = positions.get(d.positionId) ?? [];
          arr.push(d);
          positions.set(d.positionId, arr);
        }

        const trades: TradeInsert[] = [];
        for (const [, arr] of positions) {
          arr.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
          const open = arr.find((d) => d.entryType === "DEAL_ENTRY_IN");
          const close = arr.find((d) => d.entryType === "DEAL_ENTRY_OUT");
          if (!open) continue;

          const direction: "buy" | "sell" = open.type === "DEAL_TYPE_BUY" ? "buy" : "sell";
          const pnl = arr.reduce((sum, d) => sum + (Number(d.profit) || 0), 0);

          trades.push({
            user_id: user.id,
            pair: String(open.symbol ?? "").toUpperCase().replace(/[^A-Z0-9]/g, ""),
            direction,
            lot_size: Number(open.volume) || 0,
            entry_price: Number(open.price) || 0,
            close_price: close ? Number(close.price) || null : null,
            pnl,
            rr: calcRR({
              direction,
              entry: Number(open.price) || 0,
              stop: null,
              close: close ? Number(close.price) : null,
            }),
            result: calcResult(pnl),
            trade_date: open.time ?? new Date().toISOString(),
            strategy: "MetaApi sync",
          });
        }

        if (trades.length === 0) {
          return Response.json({ imported: 0 });
        }

        const { error, count } = await userClient
          .from("trades")
          .insert(trades, { count: "exact" });

        if (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }

        return Response.json({ imported: count ?? trades.length });
      },
    },
  },
});