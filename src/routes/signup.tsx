import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthShell, Field } from "./login";
import { PasswordField, isStrongPassword } from "@/components/auth/PasswordField";
import { lovable } from "@/integrations/lovable/index";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z"/>
    </svg>
  );
}

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — Vesper Journal" },
      { name: "description", content: "Create your free Vesper Journal trading journal account." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isStrongPassword(password)) {
      toast.error("Password too weak — please meet all requirements.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: { display_name: name || email.split("@")[0] },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created. You're in.");
    navigate({ to: "/dashboard" });
  }

  async function onGoogle() {
    setGoogleLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dashboard",
    });
    if (result.error) {
      setGoogleLoading(false);
      toast.error(result.error.message || "Google sign-in failed.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <AuthShell title="Create your journal" subtitle="Start tracking trades and psychology in 30 seconds.">
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Button type="button" variant="outline" onClick={onGoogle} disabled={googleLoading} className="h-11 bg-surface-2 border-border hover:bg-accent">
          {googleLoading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <GoogleIcon />}
          Continue with Google
        </Button>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-faint">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>
        <Field label="Display name">
          <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-surface-2 border-border h-11" placeholder="Trader X" />
        </Field>
        <Field label="Email">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="bg-surface-2 border-border h-11" />
        </Field>
        <Field label="Password">
          <PasswordField
            value={password}
            onChange={setPassword}
            showStrength
            autoComplete="new-password"
            placeholder="Create a strong password"
          />
        </Field>
        <Button
          type="submit"
          disabled={submitting || !isStrongPassword(password)}
          className="bg-champagne text-primary-foreground hover:bg-champagne/90 h-11 mt-2 disabled:opacity-50"
        >
          {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
          Create account
        </Button>
        <p className="text-sm text-soft text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-champagne hover:underline">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}