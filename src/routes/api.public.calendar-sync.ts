import { createFileRoute } from "@tanstack/react-router";
import { syncCalendarNow } from "@/lib/market-intel.functions";

/**
 * Scheduled economic-calendar sync. Safe to call from an external scheduler;
 * it only reads a public calendar feed and writes normalized public rows.
 */
export const Route = createFileRoute("/api/public/calendar-sync")({
  server: {
    handlers: {
      GET: async () => {
        const r = await syncCalendarNow();
        return Response.json({ ok: !r.error, ...r, at: new Date().toISOString() });
      },
      POST: async () => {
        const r = await syncCalendarNow();
        return Response.json({ ok: !r.error, ...r, at: new Date().toISOString() });
      },
    },
  },
});
