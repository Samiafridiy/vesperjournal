import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import type { Warning } from "@/lib/intervention";

export function BehaviorWarningModal({
  open,
  warnings,
  onCancel,
  onContinue,
}: {
  open: boolean;
  warnings: Warning[];
  onCancel: () => void;
  onContinue: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-champagne">
            <AlertTriangle className="size-5" />
            Behavior Warning
          </DialogTitle>
          <DialogDescription className="text-soft">
            Vesper detected patterns that often hurt performance. Take a moment before you continue.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2 mt-2">
          {warnings.map((w) => (
            <li
              key={w.key}
              className="rounded-md border border-neg/30 bg-neg/5 px-3 py-2"
            >
              <div className="text-sm font-medium text-neg">{w.title}</div>
              <div className="text-xs text-soft mt-0.5">{w.message}</div>
            </li>
          ))}
        </ul>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onContinue}>
            Continue Anyway
          </Button>
          <Button
            type="button"
            onClick={onCancel}
            className="bg-champagne text-primary-foreground hover:bg-champagne/90"
          >
            Cancel Trade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}