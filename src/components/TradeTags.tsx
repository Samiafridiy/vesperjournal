import { computeTradeTags, tagToneClasses } from "@/lib/trade-tags";
import type { Trade } from "@/lib/trade-utils";

export function TradeTags({ trade, max = 4 }: { trade: Trade; max?: number }) {
  const tags = computeTradeTags(trade).slice(0, max);
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t, i) => (
        <span
          key={`${t.label}-${i}`}
          title={t.title ?? t.label}
          className={
            "px-1.5 py-0.5 rounded-md text-[10px] font-medium tracking-wide " +
            tagToneClasses(t.tone)
          }
        >
          {t.label}
        </span>
      ))}
    </div>
  );
}