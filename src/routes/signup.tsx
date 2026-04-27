import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthShell, Field } from "./login";

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

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
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

  return (
    <AuthShell title="Create your journal" subtitle="Start tracking trades and psychology in 30 seconds.">
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Field label="Display name">
          <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-surface-2 border-border h-11" placeholder="Trader X" />
        </Field>
        <Field label="Email">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="bg-surface-2 border-border h-11" />
        </Field>
        <Field label="Password">
          <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="bg-surface-2 border-border h-11" placeholder="At least 6 characters" />
        </Field>
        <Button type="submit" disabled={submitting} className="bg-champagne text-primary-foreground hover:bg-champagne/90 h-11 mt-2">
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