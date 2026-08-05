import { Eye, X } from "lucide-react";
import { useDemoMode } from "@/lib/demo-mode";

export function DemoBanner() {
  const { demo, setDemo } = useDemoMode();
  if (!demo) return null;
  return (
    <div className="sticky top-14 md:top-0 z-30 border-b border-champagne/25 bg-champagne/10 backdrop-blur">
      <div className="max-w-[1400px] mx-auto flex items-center gap-3 px-5 md:px-10 py-2.5">
        <Eye className="size-4 text-champagne shrink-0" />
        <p className="text-xs text-champagne flex-1 leading-snug">
          Viewing sample data — log your first trade to see your real stats.
        </p>
        <button
          onClick={() => setDemo(false)}
          className="inline-flex items-center gap-1.5 rounded-md border border-champagne/30 px-2.5 py-1 text-[11px] font-medium text-champagne transition-colors hover:bg-champagne/15"
        >
          <X className="size-3" /> Exit demo
        </button>
      </div>
    </div>
  );
}
