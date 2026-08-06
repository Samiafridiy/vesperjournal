export const INSIGHT_STORAGE_KEY = "vesper.daily-insight.full";

/** Remove any structured coach tags/blocks so raw markup is never shown to the user. */
export function stripCoachTags(text: string): string {
  return text
    .replace(/<followups>[\s\S]*?(<\/followups>|$)/gi, "")
    .replace(/<\/?followups>/gi, "")
    .replace(/```(plan|bars)[^\n]*\n[\s\S]*?```/gi, "")
    .trim();
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
