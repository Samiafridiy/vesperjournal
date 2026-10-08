import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload, X, Plus } from "lucide-react";

export const MAX_SCREENSHOTS = 4;
export const TIMEFRAMES = ["1M", "5M", "15M", "30M", "1H", "4H", "D", "W"];

export type ScreenshotSlot = {
  key: string;
  id?: string;
  path?: string;
  file?: File;
  preview?: string;
  timeframe: string;
  notes: string;
};

let k = 0;
const newKey = () => `s${Date.now()}-${k++}`;

async function signed(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = await supabase.storage.from("screenshots").createSignedUrl(path, 60 * 15);
  return data?.signedUrl;
}

/** Load a trade's screenshots; falls back to the legacy single screenshot_url. */
export async function loadTradeScreenshots(tradeId: string, legacyPath: string | null): Promise<ScreenshotSlot[]> {
  const { data } = await supabase
    .from("trade_screenshots")
    .select("id,path,timeframe,notes,position")
    .eq("trade_id", tradeId)
    .order("position");
  const rows = data ?? [];
  const slots: ScreenshotSlot[] = rows.length
    ? rows.map((r) => ({ key: newKey(), id: r.id, path: r.path, timeframe: r.timeframe, notes: r.notes }))
    : legacyPath
      ? [{ key: newKey(), path: legacyPath, timeframe: "", notes: "" }]
      : [];
  await Promise.all(slots.map(async (s) => { if (s.path) s.preview = await signed(s.path); }));
  return slots;
}

/** Upload new files and sync rows. Returns the first path (for the legacy column). */
export async function saveTradeScreenshots(userId: string, tradeId: string, slots: ScreenshotSlot[]) {
  const { data: existing } = await supabase.from("trade_screenshots").select("id").eq("trade_id", tradeId);
  const keepIds = new Set(slots.map((s) => s.id).filter(Boolean));
  const toDelete = (existing ?? []).map((r) => r.id).filter((id) => !keepIds.has(id));
  if (toDelete.length) await supabase.from("trade_screenshots").delete().in("id", toDelete);

  let first: string | null = null;
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    let path = s.path;
    if (s.file) {
      const ext = s.file.name.split(".").pop() ?? "png";
      path = `${userId}/${Date.now()}-${i}.${ext}`;
      const { error } = await supabase.storage.from("screenshots").upload(path, s.file);
      if (error) throw new Error("Screenshot upload failed: " + error.message);
    }
    if (!path) continue;
    if (!first) first = path;
    const row = { trade_id: tradeId, user_id: userId, path, timeframe: s.timeframe, notes: s.notes, position: i };
    if (s.id) await supabase.from("trade_screenshots").update(row).eq("id", s.id);
    else await supabase.from("trade_screenshots").insert(row);
  }
  return first;
}

export function ScreenshotEditor({ slots, onChange }: { slots: ScreenshotSlot[]; onChange: (s: ScreenshotSlot[]) => void }) {
  const update = (key: string, patch: Partial<ScreenshotSlot>) =>
    onChange(slots.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  return (
    <div className="space-y-3">
      {slots.map((s, i) => (
        <div key={s.key} className="flex gap-3 rounded-lg border border-border bg-surface-2 p-3">
          <label className="relative shrink-0 size-24 rounded-md border border-dashed border-border bg-surface cursor-pointer overflow-hidden flex items-center justify-center text-soft">
            {s.preview ? <img src={s.preview} alt={`Screenshot ${i + 1}`} className="size-full object-cover" /> : <Upload className="size-5" />}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) update(s.key, { file: f, preview: URL.createObjectURL(f) });
              }}
            />
          </label>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                list="tf-list"
                value={s.timeframe}
                onChange={(e) => update(s.key, { timeframe: e.target.value.slice(0, 12) })}
                placeholder="Timeframe (e.g. 4H)"
                className="bg-surface border-border h-9 w-40"
              />
              <span className="text-xs text-faint flex-1 truncate">{s.file?.name ?? (s.path ? "Saved" : "No image yet")}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange(slots.filter((x) => x.key !== s.key))} aria-label="Remove screenshot">
                <X className="size-4" />
              </Button>
            </div>
            <Textarea
              value={s.notes}
              onChange={(e) => update(s.key, { notes: e.target.value.slice(0, 1500) })}
              rows={2}
              placeholder="What do you see on this chart?"
              className="bg-surface border-border resize-none text-sm"
            />
          </div>
        </div>
      ))}
      <datalist id="tf-list">{TIMEFRAMES.map((t) => <option key={t} value={t} />)}</datalist>
      {slots.length < MAX_SCREENSHOTS && (
        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed gap-2 h-10"
          onClick={() => onChange([...slots, { key: newKey(), timeframe: "", notes: "" }])}
        >
          <Plus className="size-4" /> Add screenshot ({slots.length}/{MAX_SCREENSHOTS})
        </Button>
      )}
    </div>
  );
}

export function ScreenshotGallery({ slots }: { slots: ScreenshotSlot[] }) {
  if (!slots.length) return null;
  return (
    <div className="mb-5 space-y-3">
      <div className="text-xs uppercase tracking-wider text-faint">Screenshots</div>
      {slots.map((s, i) => (
        <div key={s.key} className="rounded-lg border border-border bg-surface p-3">
          {s.preview && (
            <a href={s.preview} target="_blank" rel="noreferrer">
              <img src={s.preview} alt={`Screenshot ${i + 1}`} className="rounded-md border border-border w-full" />
            </a>
          )}
          {(s.timeframe || s.notes) && (
            <div className="mt-2 text-sm">
              {s.timeframe && <span className="px-2 py-0.5 rounded-md bg-surface-2 text-champagne text-xs font-mono mr-2">{s.timeframe}</span>}
              <span className="text-soft">{s.notes}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function useTradeScreenshots(tradeId: string | undefined, legacy: string | null | undefined) {
  const [slots, setSlots] = useState<ScreenshotSlot[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let off = false;
    setSlots([]);
    if (!tradeId) return;
    setLoading(true);
    loadTradeScreenshots(tradeId, legacy ?? null).then((s) => { if (!off) { setSlots(s); setLoading(false); } });
    return () => { off = true; };
  }, [tradeId, legacy]);
  return { slots, loading };
}
