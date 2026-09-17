export const INSIGHT_STORAGE_KEY = "vesper.daily-insight.full";

/** Remove any structured coach tags/blocks so raw markup is never shown to the user. */
export function stripCoachTags(text: string): string {
  return text
    .replace(/<followups>[\s\S]*?(<\/followups>|$)/gi, "")
    .replace(/<\/?followups>/gi, "")
    .replace(/<continuity>[\s\S]*?(<\/continuity>|$)/gi, "")
    .replace(/<\/?continuity>/gi, "")
    .replace(/```(plan|bars)[^\n]*\n[\s\S]*?```/gi, "")
    .trim();
}

/** Extract the follow-up continuity label (if the coach referenced a remembered pattern). */
export function continuityFrom(text: string): string | null {
  const m = text.match(/<continuity>([\s\S]*?)(?:<\/continuity>|$)/i);
  const label = m?.[1]?.trim();
  return label ? label : null;
}

/** Extract a single short headline sentence from a longer coach message. */
export function headlineFrom(text: string): string {
  const line =
    text
      .split("\n")
      .map((l) => l.replace(/^[#>\-*\d.\s]+/, "").trim())
      .find((l) => l.length > 20) ?? text.trim();
  const clean = line.replace(/\*\*/g, "").replace(/`/g, "");
  const sentence = clean.match(/^[\s\S]*?[.!?](\s|$)/)?.[0]?.trim() ?? clean;
  return sentence.length > 220 ? `${sentence.slice(0, 217)}…` : sentence;
}
