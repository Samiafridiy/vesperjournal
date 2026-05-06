import { useState, useMemo, useEffect, useRef } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PAIRS } from "@/lib/trade-utils";

const RECENT_KEY = "vesper.recentPairs";
const MAX_RECENT = 6;

export function getRecentPairs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function pushRecentPair(pair: string) {
  if (typeof window === "undefined" || !pair) return;
  const list = getRecentPairs().filter((p) => p !== pair);
  list.unshift(pair);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
}

const FLAGS: Record<string, string> = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", JPY: "🇯🇵", CHF: "🇨🇭",
  CAD: "🇨🇦", AUD: "🇦🇺", NZD: "🇳🇿", CNY: "🇨🇳",
};

export function pairIcon(pair: string): string {
  const p = pair.toUpperCase();
  if (p.startsWith("XAU")) return "🥇";
  if (p.startsWith("XAG")) return "🥈";
  if (p === "BTCUSD") return "₿";
  if (p === "ETHUSD") return "Ξ";
  if (p === "BNBUSD") return "🟡";
  if (["US30", "US500", "SPX500", "NAS100"].includes(p)) return "🇺🇸";
  if (p === "UK100") return "🇬🇧";
  if (p === "GER40") return "🇩🇪";
  if (p === "JPN225") return "🇯🇵";
  const base = p.slice(0, 3);
  return FLAGS[base] ?? "📊";
}

function highlight(text: string, query: string) {
  if (!query) return text;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <span className="text-champagne font-semibold">{text.slice(i, i + query.length)}</span>
      {text.slice(i + query.length)}
    </>
  );
}

export function PairSelector({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setRecent(getRecentPairs());
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const q = query.trim().toUpperCase();
  const filtered = useMemo(
    () => (q ? PAIRS.filter((p) => p.includes(q)) : PAIRS),
    [q],
  );
  const exactMatch = PAIRS.includes(q);
  const showCustom = q.length >= 3 && !exactMatch && /^[A-Z0-9]+$/.test(q);

  function pick(p: string) {
    onChange(p);
    pushRecentPair(p);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center justify-between w-full h-11 px-3 rounded-md border border-border bg-surface-2 text-sm font-mono",
            "hover:border-champagne/40 focus:outline-none focus:ring-1 focus:ring-champagne/40 transition-all",
            className,
          )}
        >
          <span className="flex items-center gap-2 min-w-0">
            <span className="text-base leading-none">{pairIcon(value)}</span>
            <span className="truncate">{value || "Select pair"}</span>
          </span>
          <ChevronDown className="size-4 text-faint shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[280px] p-0 overflow-hidden border-border bg-popover animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150"
      >
        <div className="flex items-center gap-2 px-3 h-10 border-b border-border bg-surface">
          <Search className="size-3.5 text-faint" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or type custom pair…"
            className="h-8 border-0 bg-transparent px-0 text-sm font-mono focus-visible:ring-0 focus-visible:outline-none shadow-none"
          />
        </div>
        <div className="max-h-[280px] overflow-y-auto py-1">
          {recent.length > 0 && !q && (
            <div className="pb-1">
              <div className="px-3 py-1 text-[9px] uppercase tracking-wider text-faint">Recent</div>
              {recent.map((p) => (
                <PairRow key={"r-" + p} pair={p} onPick={pick} active={p === value} query="" />
              ))}
              <div className="h-px bg-border mx-2 my-1" />
              <div className="px-3 py-1 text-[9px] uppercase tracking-wider text-faint">All pairs</div>
            </div>
          )}
          {filtered.map((p) => (
            <PairRow key={p} pair={p} onPick={pick} active={p === value} query={q} />
          ))}
          {filtered.length === 0 && !showCustom && (
            <div className="px-3 py-6 text-center text-xs text-faint">No pairs found</div>
          )}
          {showCustom && (
            <button
              type="button"
              onClick={() => pick(q)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-mono hover:bg-accent transition-colors border-t border-border mt-1"
            >
              <Plus className="size-3.5 text-champagne" />
              <span>Use custom pair</span>
              <span className="text-champagne ml-auto">{q}</span>
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PairRow({
  pair,
  onPick,
  active,
  query,
}: {
  pair: string;
  onPick: (p: string) => void;
  active: boolean;
  query: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(pair)}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-sm font-mono hover:bg-accent transition-colors",
        active && "bg-accent text-champagne",
      )}
    >
      <span className="text-base leading-none">{pairIcon(pair)}</span>
      <span>{highlight(pair, query)}</span>
    </button>
  );
}