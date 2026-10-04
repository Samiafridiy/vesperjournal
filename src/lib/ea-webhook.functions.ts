import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getEaWebhookToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { eaToken } = await import("./ea-webhook.server");
    return { uid: context.userId, token: eaToken(context.userId) };
  });
