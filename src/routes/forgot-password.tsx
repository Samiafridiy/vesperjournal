import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { AuthShell, Field } from "./login";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Vesper Journal" },
      { name: "description", content: "Reset your Vesper Journal password." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("Reset link sent — check your inbox.");
  }

  return (
    <AuthShell
      title={sent ? "Check your email" : "Forgot password?"}
      subtitle={sent
        ? "We sent a password reset link to your email. The link expires in 1 hour."
        : "Enter your email and we'll send you a secure reset link."}
    >
      {sent ? (
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-champagne/30 bg-champagne/5 p-5 flex items-start gap-3">
            <Mail className="size-5 text-champagne mt-0.5 shrink-0" />
            <div className="text-sm text-soft leading-relaxed">
              Sent to <span className="text-foreground font-medium">{email}</span>.
              Didn't get it? Check spam or try another email.
            </div>
          </div>
          <Button
            type="button"
            onClick={() => navigate({ to: "/login" })}
            className="bg-champagne text-primary-foreground hover:bg-champagne/90 h-11"
          >
            Back to sign in
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <Field label="Email">
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-surface-2 border-border h-11"
              placeholder="you@example.com"
            />
          </Field>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-champagne text-primary-foreground hover:bg-champagne/90 h-11 mt-2"
          >
            {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
            Send reset link
          </Button>
          <p className="text-sm text-soft text-center">
            Remember it?{" "}
            <Link to="/login" className="text-champagne hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}