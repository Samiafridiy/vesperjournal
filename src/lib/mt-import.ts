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
/**
 * MT4 / MT5 statement parser.
 *
 * MT statements include a header row that varies between builds and languages,
 * but the canonical English headers are:
 *
 *   MT5 Positions / Deals:
 *     Time | Position | Symbol | Type | Volume | Price | S/L | T/P | Time | Price | Commission | Swap | Profit
 *   MT4 Closed Transactions:
 *     Ticket | Open Time | Type | Size | Item | Price | S/L | T/P | Close Time | Price | Commission | Taxes | Swap | Profit
 *
 * Strategy: detect the header row, build a name→index map, and read each row
 * by NAME — never by absolute offset. That fixes the "Symbol shows ticket"
 * and "P&L wrong" bugs caused by the previous offset-based heuristic.
 */
export function parseMtHtml(html: string): ParsedRow[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const rows = Array.from(doc.querySelectorAll("tr"));
  const out: ParsedRow[] = [];

  let headerMap: Record<string, number> | null = null;

  for (const tr of rows) {
    const cells = Array.from(tr.querySelectorAll("td, th")).map((c) =>
      (c.textContent ?? "").trim(),
    );
    if (cells.length < 6) continue;

    // Try to detect a header row anywhere in the document (some MT exports
    // contain multiple sub-tables: orders / deals / positions).
    const headerCandidate = detectHeader(cells);
    if (headerCandidate) {
      headerMap = headerCandidate;
      continue;
    }
    if (!headerMap) continue;

    const get = (key: string): string | undefined => {
      const idx = headerMap![key];
      return idx == null ? undefined : cells[idx];
    };

    const dirRaw = (get("type") ?? "").toLowerCase();
    const direction: "buy" | "sell" | null = /^(buy|sell)/.test(dirRaw)
      ? (dirRaw.startsWith("buy") ? "buy" : "sell")
      : null;
    if (!direction) continue;

    const symbol = (get("symbol") ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const lot = num(get("size"));
    const entry = num(get("openPrice"));
    const closePrice = num(get("closePrice"));
    const sl = num(get("sl"));
    const tp = num(get("tp"));
    const profit = num(get("profit"));
    const openTime = get("openTime") ?? "";

    if (!symbol || !entry || !lot) continue;

    const pnl =
      profit != null
        ? profit
        : calcPnl({ pair: symbol, direction, entry, close: closePrice, lot });
    const rr = calcRR({ pair: symbol, direction, entry, stop: sl, takeProfit: tp, close: closePrice });

    out.push({
      _key: `${symbol}-${openTime}-${entry}-${lot}-${profit ?? ""}`,
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
      trade_date: parseMtDate(openTime) ?? new Date().toISOString(),
      strategy: "MT import",
    });
  }

  return out;
}

/**
 * Look at a row of cells. If it looks like an MT header row, return a map of
 * { canonicalKey -> column index }. Otherwise null.
 *
 * MT headers we care about:
 *   - symbol  : "Symbol" / "Item"
 *   - type    : "Type"
 *   - size    : "Size" / "Volume" / "Lots"
 *   - openPrice / closePrice : two "Price" columns (first = open, second = close)
 *   - sl      : "S / L" / "Stop Loss" / "S/L"
 *   - tp      : "T / P" / "Take Profit" / "T/P"
 *   - profit  : "Profit" / "Net Profit" / "P/L"
 *   - openTime / closeTime : two "Time" columns
 */
function detectHeader(cells: string[]): Record<string, number> | null {
  const norm = cells.map((c) => c.toLowerCase().replace(/\s+/g, ""));
  const has = (re: RegExp) => norm.some((c) => re.test(c));

  // Must look like an MT statement header
  if (!has(/^type$/) || !(has(/^symbol$/) || has(/^item$/))) return null;

  const map: Record<string, number> = {};
  let priceCount = 0;
  let timeCount = 0;

  norm.forEach((c, i) => {
    if (c === "symbol" || c === "item") map.symbol = i;
    else if (c === "type") map.type = i;
    else if (c === "size" || c === "volume" || c === "lots") map.size = i;
    else if (c === "s/l" || c === "sl" || c === "stoploss") map.sl = i;
    else if (c === "t/p" || c === "tp" || c === "takeprofit") map.tp = i;
    else if (c === "profit" || c === "netprofit" || c === "p/l") map.profit = i;
    else if (c === "price") {
      if (priceCount === 0) map.openPrice = i;
      else map.closePrice = i;
      priceCount++;
    } else if (c === "time") {
      if (timeCount === 0) map.openTime = i;
      else map.closeTime = i;
      timeCount++;
    }
  });

  if (map.symbol == null || map.type == null || map.openPrice == null) return null;
  return map;
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
    const rr = calcRR({ pair: symbol, direction, entry, stop: sl, takeProfit: tp, close: closePrice });

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