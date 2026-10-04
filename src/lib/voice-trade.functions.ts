import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PAIRS, SESSIONS, EMOTIONS_BEFORE, EMOTIONS_AFTER, MISTAKES, WINS_WELL } from "@/lib/trade-utils";

const Input = z.object({ transcript: z.string().min(3).max(6000) });

export type VoiceExtraction = {
  pair: string | null;
  direction: "buy" | "sell" | null;
  entry: number | null;
  stop: number | null;
  takeProfit: number | null;
  close: number | null;
  session: string | null;
  emotionBefore: string | null;
  emotionAfter: string | null;
  mistakes: string[];
  winsWell: string[];
  followedPlan: boolean | null;
  notes: string | null;
};

const SYSTEM = `You extract trade journal fields from a trader's spoken voice note.
Reply with STRICT JSON only, keys:
pair, direction ("buy"|"sell"|null), entry, stop, takeProfit, close (numbers or null),
session, emotionBefore, emotionAfter (string or null), mistakes (array), winsWell (array),
followedPlan (true|false|null), notes (string or null).
Rules:
- NUMBERS: only if the trader explicitly said that exact price. If unclear, partially heard, or ambiguous, use null. Never guess or compute.
- pair must be one of: ${PAIRS.join(", ")} (map "gold" to XAUUSD, "cable" to GBPUSD, "fiber" to EURUSD, "nasdaq" to NAS100) else null.
- session one of: ${SESSIONS.join(", ")} or null.
- emotionBefore one of: ${EMOTIONS_BEFORE.join(", ")} or null.
- emotionAfter one of: ${EMOTIONS_AFTER.join(", ")} or null.
- mistakes subset of: ${MISTAKES.join(", ")} (e.g. "impatient and jumped in" -> FOMO, Early entry).
- winsWell subset of: ${WINS_WELL.join(", ")}.
- notes: the trader's reasoning and anything not mapped to a field, in their own words, concise. null if nothing.`;

function pick<T extends string>(v: unknown, list: readonly T[]): T | null {
  return typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : null;
}
function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && isFinite(n) && n > 0 ? n : null;
}

export const extractTradeFromVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { result: null, error: "AI is not configured." };
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": key,
          Authorization: `Bearer ${key}`,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: "openai/gpt-6-astra",
          stream: true,
          store: false,
          reasoning: { effort: "low" },
          instructions: SYSTEM,
          input: [{ role: "user", content: `Voice note transcript:\n"""${data.transcript}"""` }],
        }),
      });
      if (res.status === 429) return { result: null, error: "Rate limit reached. Try again in a moment." };
      if (res.status === 402) return { result: null, error: "AI credits exhausted." };
      if (!res.ok || !res.body) {
        console.error("voice extract", res.status, await res.text().catch(() => ""));
        return { result: null, error: `AI error (${res.status}).` };
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const ev = JSON.parse(payload);
            if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
          } catch {
            /* ignore */
          }
        }
      }
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) return { result: null, error: "Couldn't understand the voice note." };
      const p = JSON.parse(m[0]);
      const dir = p.direction === "buy" || p.direction === "sell" ? p.direction : null;
      const result: VoiceExtraction = {
        pair: pick(p.pair, PAIRS as readonly string[]),
        direction: dir,
        entry: num(p.entry),
        stop: num(p.stop),
        takeProfit: num(p.takeProfit),
        close: num(p.close),
        session: pick(p.session, SESSIONS),
        emotionBefore: pick(p.emotionBefore, EMOTIONS_BEFORE),
        emotionAfter: pick(p.emotionAfter, EMOTIONS_AFTER),
        mistakes: Array.isArray(p.mistakes) ? p.mistakes.filter((x: unknown) => pick(x, MISTAKES)) : [],
        winsWell: Array.isArray(p.winsWell) ? p.winsWell.filter((x: unknown) => pick(x, WINS_WELL)) : [],
        followedPlan: typeof p.followedPlan === "boolean" ? p.followedPlan : null,
        notes: typeof p.notes === "string" && p.notes.trim() ? p.notes.trim() : null,
      };
      return { result, error: null as string | null };
    } catch (e) {
      console.error("extractTradeFromVoice", e);
      return { result: null, error: "Couldn't process the voice note." };
    }
  });
