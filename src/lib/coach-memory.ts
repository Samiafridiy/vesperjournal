import type { Trade } from "./trade-utils";
import { fmtMoney } from "./trade-utils";
import type { Database } from "@/integrations/supabase/types";

export type CoachMemoryRow = Database["public"]["Tables"]["coach_memory"]["Row"];

export type PatternSnapshot = {
  key: string;
  label: string;
  /** occurrences in the trailing 7 days */
  recentCount: number;
  /** signed P&L of trades carrying this pattern in the trailing 7 days */
  recentImpact: number;
  /** occurrences in the trailing 30 days */
  count: number;
  /** signed P&L of trades carrying this pattern in the trailing 30 days */
  impact: number;
};

const DAY = 86_400_000;

function tagsOf(t: Trade): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  for (const m of t.mistakes ?? []) if (m) out.push({ key: `mistake:${m.toLowerCase()}`, label: m });
  for (const b of t.behavior_flags ?? []) if (b) out.push({ key: `behavior:${b.toLowerCase()}`, label: b });
  return out;
}

/** Deterministic pattern snapshot from the trader's recent trades. Read-only — never feeds scoring. */
export function detectPatterns(trades: Trade[]): PatternSnapshot[] {
  const now = Date.now();
  const acc = new Map<string, PatternSnapshot>();

  for (const t of trades) {
    const ts = new Date(t.trade_date).getTime();
    const age = now - ts;
    if (!Number.isFinite(age) || age > 30 * DAY || age < 0) continue;
    const pnl = t.pnl ?? 0;
    for (const { key, label } of tagsOf(t)) {
      const e =
        acc.get(key) ??
        acc.set(key, { key, label, recentCount: 0, recentImpact: 0, count: 0, impact: 0 }).get(key)!;
      e.count += 1;
      e.impact += pnl;
      if (age <= 7 * DAY) {
        e.recentCount += 1;
        e.recentImpact += pnl;
      }
    }
  }

  return [...acc.values()].sort((a, b) => a.impact - b.impact);
}

function daysAgo(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / DAY));
}

function agoLabel(iso: string): string {
  const d = daysAgo(iso);
  if (d <= 1) return "yesterday";
  if (d <= 10) return `${d} days ago`;
  if (d <= 20) return "about 2 weeks ago";
  return `${Math.round(d / 7)} weeks ago`;
}

/**
 * Builds the continuity block appended to the AI Coach context.
 * Returns null when there is nothing remembered yet.
 */
export function buildMemoryContext(rows: CoachMemoryRow[], snapshots: PatternSnapshot[]): string | null {
  const shown = rows.filter((r) => r.times_shown > 0);
  if (shown.length === 0) return null;

  const byKey = new Map(snapshots.map((s) => [s.key, s]));
  const lines: string[] = [];

  for (const r of shown.slice(0, 6)) {
    const s = byKey.get(r.pattern_key);
    const when = agoLabel(r.first_flagged_at);
    if (!s || s.recentCount === 0) {
      lines.push(
        `- "${r.pattern_label}" — flagged ${when} (${r.first_occurrences} trades, ${fmtMoney(Number(r.first_impact), { sign: true })}). IMPROVED: 0 occurrences in the last 7 days (was ${r.last_occurrences}).`,
      );
    } else {
      lines.push(
        `- "${r.pattern_label}" — flagged ${when} (${r.first_occurrences} trades, ${fmtMoney(Number(r.first_impact), { sign: true })}). STILL HAPPENING: ${s.recentCount} more trade(s) in the last 7 days, ${fmtMoney(s.recentImpact, { sign: true })}.`,
      );
    }
  }

  return `COACH MEMORY — patterns you have ALREADY flagged to this trader in earlier sessions:
${lines.join("\n")}

CONTINUITY RULES (apply only to how you word your reply — never change any score or metric):
- Never present a remembered pattern as a brand-new discovery. Frame it as a follow-up: "Last time I flagged X — since then you've taken N more, costing $Y." If it improved, acknowledge the progress with both numbers.
- When your reply leads with a remembered pattern, start the message with a single line tag: <continuity>Following up from ${agoLabel(shown[0].first_flagged_at)}</continuity>
- Brand-new patterns not listed above are still presented normally.`;
}

/** Instruction fragment telling the model a memory layer exists even when empty. */
export const MEMORY_NEW_PATTERN_NOTE =
  "No previously flagged patterns yet — present findings normally, without follow-up framing.";
