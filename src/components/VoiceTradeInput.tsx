import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mic, Square, RotateCcw, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extractTradeFromVoice, type VoiceExtraction } from "@/lib/voice-trade.functions";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function VoiceTradeInput({ onExtracted }: { onExtracted: (r: VoiceExtraction) => void }) {
  const [open, setOpen] = useState(false);
  const [supported, setSupported] = useState(true);
  const [recording, setRecording] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<any>(null);
  const extract = useServerFn(extractTradeFromVoice);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR);
    return () => recRef.current?.abort?.();
  }, []);

  const start = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    setError(null);
    setFinalText("");
    setInterim("");
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      let fin = "";
      let tmp = "";
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) fin += t + " ";
        else tmp += t;
      }
      setFinalText(fin);
      setInterim(tmp);
    };
    rec.onerror = (e: any) => {
      if (e.error !== "aborted") setError(e.error === "not-allowed" ? "Microphone access was blocked." : "Dictation stopped unexpectedly.");
      setRecording(false);
    };
    rec.onend = () => setRecording(false);
    recRef.current = rec;
    rec.start();
    setRecording(true);
  };

  const stop = () => recRef.current?.stop();

  const useNote = async () => {
    const text = (finalText + " " + interim).trim();
    if (text.length < 3) return;
    setBusy(true);
    setError(null);
    const res = await extract({ data: { transcript: text } });
    setBusy(false);
    if (res.error || !res.result) {
      setError(res.error ?? "Couldn't process the voice note. You can fill the form manually.");
      return;
    }
    onExtracted(res.result);
    setOpen(false);
  };

  const transcript = (finalText + interim).trim();

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)} className="gap-2 border-champagne/40 text-champagne">
        <Mic className="h-4 w-4" /> Log by voice
      </Button>
    );
  }

  return (
    <div className="surface-card p-5 flex flex-col gap-4 tl-fade-up">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.18em] text-soft">Voice note</div>
        <button type="button" className="text-xs text-soft hover:text-foreground" onClick={() => { recRef.current?.abort?.(); setOpen(false); }}>
          Close
        </button>
      </div>
      {!supported ? (
        <p className="text-sm text-soft">Voice dictation isn't available in this browser. Try Chrome, Edge or Safari.</p>
      ) : (
        <>
          <p className="text-sm text-soft">Say the pair, direction, prices, how you felt and why you took it.</p>
          <div className="flex items-center gap-3">
            {!recording ? (
              <Button type="button" onClick={start} className="gap-2" disabled={busy}>
                {transcript ? <RotateCcw className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {transcript ? "Re-record" : "Record"}
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={stop} className="gap-2">
                <Square className="h-4 w-4" /> Stop
              </Button>
            )}
            {recording && (
              <span className="flex items-center gap-1.5 text-xs text-champagne">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="w-1 h-4 rounded-full bg-champagne animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
                Listening…
              </span>
            )}
          </div>
          {transcript && (
            <div className="rounded-md border border-border bg-surface-2 p-3 text-sm leading-relaxed">
              {finalText}
              <span className="text-soft">{interim}</span>
            </div>
          )}
          {transcript && !recording && (
            <Button type="button" onClick={useNote} disabled={busy} className="gap-2 self-start">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {busy ? "Reading your note…" : "Fill the form"}
            </Button>
          )}
        </>
      )}
      {error && <p className="text-sm text-warn">{error}</p>}
    </div>
  );
}
