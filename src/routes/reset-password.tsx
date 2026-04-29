import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthShell, Field } from "./login";
import { PasswordField, isStrongPassword } from "@/components/auth/PasswordField";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set new password — Vesper Journal" },
      { name: "description", content: "Choose a new password for your Vesper Journal account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  // Supabase auto-exchanges the recovery token from the URL hash on load.
  // We just listen for the PASSWORD_RECOVERY event and unlock the form.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    // Fallback: if a session already exists from the recovery link
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isStrongPassword(password)) {
      toast.error("Password too weak — please meet all requirements.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated. You're signed in.");
    navigate({ to: "/dashboard" });
  }

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a strong password to secure your account."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Field label="New password">
          <PasswordField
            value={password}
            onChange={setPassword}
            showStrength
            autoComplete="new-password"
            placeholder="New password"
          />
        </Field>
        <Field label="Confirm password">
          <PasswordField
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            placeholder="Repeat new password"
          />
        </Field>
        {!ready && (
          <div className="text-xs text-soft text-center -mt-2">
            Verifying reset link…
          </div>
        )}
        <Button
          type="submit"
          disabled={submitting || !ready || !isStrongPassword(password) || password !== confirm}
          className="bg-champagne text-primary-foreground hover:bg-champagne/90 h-11 mt-2 disabled:opacity-50"
        >
          {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
          Update password
        </Button>
      </form>
    </AuthShell>
  );
}