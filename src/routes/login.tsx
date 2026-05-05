import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PasswordField } from "@/components/auth/PasswordField";
import { lovable } from "@/integrations/lovable/index";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z"/>
    </svg>
  );
}

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Vesper Journal" },
      { name: "description", content: "Sign in to your Vesper Journal trading journal." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("invalid login")) toast.error("Invalid email or password.");
      else if (msg.includes("not found") || msg.includes("user not")) toast.error("Email not found.");
      else if (msg.includes("email not confirmed")) toast.error("Please verify your email first.");
      else toast.error(error.message);
      return;
    }
    toast.success("Welcome back.");
    navigate({ to: "/dashboard" });
  }

  return <AuthShell title="Welcome back" subtitle="Sign in to your Vesper Journal journal.">
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Button type="button" variant="outline" onClick={onGoogle} disabled={googleLoading} className="h-11 bg-surface-2 border-border hover:bg-accent">
        {googleLoading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <GoogleIcon />}
        Continue with Google
      </Button>
      <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-faint">
        <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
      </div>
      <Field label="Email">
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="bg-surface-2 border-border h-11" />
      </Field>
      <Field label="Password">
        <PasswordField value={password} onChange={setPassword} autoComplete="current-password" />
        <div className="flex justify-end -mt-1">
          <Link to="/forgot-password" className="text-xs text-soft hover:text-champagne transition-colors">
            Forgot password?
          </Link>
        </div>
      </Field>
      <Button type="submit" disabled={submitting} className="bg-champagne text-primary-foreground hover:bg-champagne/90 h-11 mt-2">
        {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
        Sign in
      </Button>
      <p className="text-sm text-soft text-center">
        New here?{" "}
        <Link to="/signup" className="text-champagne hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  </AuthShell>;
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground flex items-center justify-center px-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 w-[50vw] h-[50vw] bg-champagne/[0.05] rounded-full blur-[140px]" />
      </div>
      <div className="relative z-10 w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="size-9 rounded-lg bg-champagne/10 ring-1 ring-champagne/30 flex items-center justify-center">
            <TrendingUp className="size-4 text-champagne" />
          </div>
          <span className="text-base font-semibold">Vesper Journal</span>
        </Link>
        <div className="surface-card-elevated top-accent p-8">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-soft mt-1.5 mb-6">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs uppercase tracking-[0.12em] text-faint">{label}</Label>
      {children}
    </div>
  );
}