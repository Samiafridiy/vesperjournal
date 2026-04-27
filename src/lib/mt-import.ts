import Papa from "papaparse";
import type { TradeInsert } from "./trade-utils";
import { calcPnl, calcRR, calcResult } from "./trade-utils";

export type ParsedRow = Omit<TradeInsert, "user_id"> & { _key: string };

/**
 * Parse an MT4 / MT5 HTML statement export.
 * Both MT4 and MT5 export "Detailed report" / "Statement" as .htm files
 * containing a giant <table>. We grab the rows that have a recognizable
 * "buy" or "sell" column and map them into Trade inserts.
 */
export function parseMtHtml(html: string): ParsedRow[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const rows = Array.from(doc.querySelectorAll("tr"));
  const out: ParsedRow[] = [];

  for (const tr of rows) {
    const cells = Array.from(tr.querySelectorAll("td")).map((td) =>
      (td.textContent ?? "").trim(),
    );
    if (cells.length < 10) continue;

    // Heuristic: find a "buy" or "sell" cell
    const dirIdx = cells.findIndex((c) => /^(buy|sell)$/i.test(c));
    if (dirIdx === -1) continue;

    // MT4 closed-trade row layout (typical):
    // [ticket, openTime, type, size, symbol, openPrice, sl, tp, closeTime, closePrice, commission, taxes, swap, profit]
    // MT5 is similar but column order can shift. We anchor off `dirIdx`.
    const direction = cells[dirIdx].toLowerCase() as "buy" | "sell";
    const openTime = cells[dirIdx - 1] ?? "";
    const lot = num(cells[dirIdx + 1]);
    const symbol = (cells[dirIdx + 2] ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const entry = num(cells[dirIdx + 3]);
    const sl = num(cells[dirIdx + 4]);
    const tp = num(cells[dirIdx + 5]);
    // close price + profit are near the end
    const profit = num(cells[cells.length - 1]);
    const closePrice = num(cells[dirIdx + 7]) ?? num(cells[cells.length - 5]);

    if (!symbol || !entry || !lot) continue;

    const tradeDate = parseMtDate(openTime) ?? new Date().toISOString();
    const pnl = profit ?? calcPnl({ pair: symbol, direction, entry, close: closePrice, lot });
    const rr = calcRR({ direction, entry, stop: sl, takeProfit: tp, close: closePrice });

    out.push({
      _key: `${symbol}-${openTime}-${entry}-${lot}`,
      pair: symbol,
      direction,
      lot_size: lot,
      entry_price: entry,
      stop_loss: sl,
      take_profit: tp,
      close_price: closePrice,
      pnl,
      rr,
      result: calcResult(pnl ?? null),
      trade_date: tradeDate,
      strategy: "MT import",
    });
  }

  return out;
}

/**
 * Parse a CSV export. We support a flexible header set so most broker
 * exports (MT5 "Reports → CSV", cTrader, TradeLocker) work out of the box.
 *
 * Recognized headers (case-insensitive):
 *   symbol/pair, side/type/direction, lot/volume/size, openprice/entry,
 *   sl/stoploss, tp/takeprofit, closeprice/exit, profit/pnl, opentime/date
 */
export function parseCsv(text: string): ParsedRow[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/[\s_-]+/g, ""),
  });

  const out: ParsedRow[] = [];
  for (const row of result.data) {
    const direction = pickDirection(row);
    const symbol = pick(row, ["symbol", "pair", "instrument"])?.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const lot = num(pick(row, ["lot", "lots", "lotsize", "volume", "size", "quantity"]));
    const entry = num(pick(row, ["openprice", "entryprice", "entry", "open", "price"]));
    const closePrice = num(pick(row, ["closeprice", "exitprice", "close", "exit"]));
    const sl = num(pick(row, ["sl", "stoploss", "stop"]));
    const tp = num(pick(row, ["tp", "takeprofit", "target"]));
    const profit = num(pick(row, ["profit", "pnl", "netpnl", "pl", "gain"]));
    const dateStr = pick(row, ["opentime", "openat", "date", "time", "tradedate", "datetime"]);

    if (!symbol || !entry || !lot || !direction) continue;

    const pnl = profit ?? calcPnl({ pair: symbol, direction, entry, close: closePrice, lot });
    const rr = calcRR({ direction, entry, stop: sl, takeProfit: tp, close: closePrice });

    out.push({
      _key: `${symbol}-${dateStr ?? ""}-${entry}-${lot}`,
      pair: symbol,
      direction,
      lot_size: lot,
      entry_price: entry,
      stop_loss: sl,
      take_profit: tp,
      close_price: closePrice,
      pnl,
      rr,
      result: calcResult(pnl ?? null),
      trade_date: parseMtDate(dateStr) ?? new Date().toISOString(),
      strategy: "CSV import",
    });
  }

  return out;
}

/* ---------- helpers ---------- */

function num(v: string | undefined | null): number | null {
  if (v == null) return null;
  const cleaned = String(v).replace(/[\s,$]/g, "").replace(/[^\d.\-]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function pick(row: Record<string, string>, keys: string[]): string | undefined {
  for (const k of keys) if (row[k] != null && row[k] !== "") return row[k];
  return undefined;
}

function pickDirection(row: Record<string, string>): "buy" | "sell" | null {
  const raw = pick(row, ["side", "type", "direction", "action", "ordertype"])?.toLowerCase() ?? "";
  if (/buy|long/.test(raw)) return "buy";
  if (/sell|short/.test(raw)) return "sell";
  return null;
}

function parseMtDate(s: string | undefined | null): string | null {
  if (!s) return null;
  // MT often uses "2024.05.12 14:30:55"
  const normalized = s.replace(/\./g, "-");
  const d = new Date(normalized);
  if (!isNaN(d.getTime())) return d.toISOString();
  return null;
}