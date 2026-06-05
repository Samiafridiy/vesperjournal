import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { VESPER_SYSTEM_PROMPT } from "@/lib/coach-context";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8000),
});

const InputSchema = z.object({
  context: z.string().min(1).max(20000),
  messages: z.array(MessageSchema).min(1).max(40),
  mode: z.enum(["chat", "insight"]).default("chat"),
  extraSystem: z.string().max(4000).optional(),
});

export const askVesper = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) {
      return { reply: "", error: "AI is not configured. LOVABLE_API_KEY missing." };
    }

    const systemPrompt =
      data.mode === "insight"
        ? `${VESPER_SYSTEM_PROMPT}\n\nTASK: Produce ONE short, specific coaching insight (2-3 sentences) based on the trader's data below. Reference real numbers/pairs/mistakes. No greeting, no preamble, just the insight.`
        : VESPER_SYSTEM_PROMPT;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "system", content: data.context },
            ...(data.extraSystem ? [{ role: "system", content: data.extraSystem }] : []),
            ...data.messages,
          ],
        }),
      });

      if (res.status === 429) {
        return { reply: "", error: "Rate limit reached. Try again in a moment." };
      }
      if (res.status === 402) {
        return { reply: "", error: "AI credits exhausted. Add credits in workspace settings." };
      }
      if (!res.ok) {
        const txt = await res.text();
        console.error("Vesper AI error:", res.status, txt);
        return { reply: "", error: `AI gateway error (${res.status}).` };
      }

      const json = await res.json();
      const reply = json?.choices?.[0]?.message?.content?.trim() ?? "";
      return { reply, error: null as string | null };
    } catch (e) {
      console.error("askVesper error:", e);
      return { reply: "", error: "Network error reaching AI." };
    }
  });