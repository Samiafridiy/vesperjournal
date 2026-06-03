import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  eventKey: z.string().min(1).max(64),
  observation: z.string().min(1).max(500),
  /** Optional reflective answer from the user. */
  reflection: z.string().max(1000).optional(),
});

const MENTOR_SYSTEM_PROMPT = `You are Vesper, a calm, intelligent trading mentor.
You do NOT lecture. You do NOT spam. You speak briefly, like a senior coach.

You must always reply with STRICT JSON in this exact shape (no markdown, no prose outside JSON):
{
  "observation": string, // 1 short sentence restating what you noticed
  "question": string,    // 1 reflective question to the trader
  "insight": string,     // 1 sentence naming the behavioral pattern
  "action": string       // ONE clear, specific rule, max 12 words, imperative
}

Rules:
- Exactly ONE action. Never multiple suggestions.
- Tone: calm, professional, non-judgmental.
- No greetings, no emojis, no preamble.
- If the user has already reflected, acknowledge it inside "insight" before naming the pattern.`;

export const askMentor = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) {
      return { result: null, error: "AI is not configured. LOVABLE_API_KEY missing." };
    }

    const userMsg = data.reflection
      ? `Event: ${data.eventKey}\nObservation: ${data.observation}\nTrader's reflection: "${data.reflection}"`
      : `Event: ${data.eventKey}\nObservation: ${data.observation}\nThe trader has not reflected yet.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: MENTOR_SYSTEM_PROMPT },
            { role: "user", content: userMsg },
          ],
        }),
      });

      if (res.status === 429) {
        return { result: null, error: "Rate limit reached. Try again in a moment." };
      }
      if (res.status === 402) {
        return { result: null, error: "AI credits exhausted." };
      }
      if (!res.ok) {
        return { result: null, error: `AI gateway error (${res.status}).` };
      }

      const json = await res.json();
      const raw = json?.choices?.[0]?.message?.content?.trim() ?? "";
      try {
        const parsed = JSON.parse(raw);
        return {
          result: {
            observation: String(parsed.observation ?? data.observation),
            question: String(parsed.question ?? ""),
            insight: String(parsed.insight ?? ""),
            action: String(parsed.action ?? ""),
          },
          error: null as string | null,
        };
      } catch {
        return { result: null, error: "Mentor returned an unreadable response." };
      }
    } catch (e) {
      console.error("askMentor error:", e);
      return { result: null, error: "Network error reaching AI." };
    }
  });