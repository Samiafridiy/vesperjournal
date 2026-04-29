import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Brain, Loader2, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Link } from "@tanstack/react-router";
import type { Trade } from "@/lib/trade-utils";
import { buildTraderContext } from "@/lib/coach-context";
import { askVesper } from "@/server/coach.functions";
import { useAuth } from "@/lib/auth";

function tipKey(uid: string) {
  const day = new Date().toISOString().slice(0, 10);
  return `vesper.daily-tip.${uid}.${day}`;
}

export function DailyTipModal({ trades }: { trades: Trade[] }) {
  const { user } = useAuth();
  const ask = useServerFn(askVesper);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || trades.length < 3) return;
    const key = tipKey(user.id);
    if (typeof window === "undefined" || localStorage.getItem(key) === "1") return;

    let cancelled = false;
    setOpen(true);
    setLoading(true);
    const ctx = buildTraderContext(trades.slice(0, 30));
    ask({
      data: {
        context: ctx,
        mode: "insight",
        messages: [
          {
            role: "user",
            content:
              "Give me ONE specific actionable insight for today based on my recent trades. Pick the highest-impact pattern (worst session, recurring mistake, or best setup). Reference real numbers.",
          },
        ],
      },
    })
      .then((res) => {
        if (cancelled) return;
        setMsg(res.error ? `⚠️ ${res.error}` : res.reply);
        localStorage.setItem(key, "1");
      })
      .catch(() => !cancelled && setMsg("⚠️ Failed to load tip."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, trades.length >= 3]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="size-8 rounded-lg bg-champagne/10 ring-1 ring-champagne/30 flex items-center justify-center">
              <Brain className="size-4 text-champagne" />
            </div>
            <DialogTitle>Vesper's tip for today</DialogTitle>
          </div>
          <DialogDescription>One focused insight from your recent trades.</DialogDescription>
        </DialogHeader>
        <div className="py-2 min-h-[80px]">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-soft">
              <Loader2 className="size-3.5 animate-spin" /> Analyzing your data…
            </div>
          )}
          {msg && (
            <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <ReactMarkdown>{msg}</ReactMarkdown>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Got it
          </Button>
          <Link to="/coach" onClick={() => setOpen(false)}>
            <Button className="bg-champagne text-primary-foreground hover:bg-champagne/90 gap-1.5">
              <MessageSquare className="size-4" /> Ask Vesper
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}