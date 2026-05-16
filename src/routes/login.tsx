import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && session) {
      void navigate({ to: "/my-goals" });
    }
  }, [loading, navigate, session]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      await navigate({ to: "/my-goals" });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onForgotPassword = async () => {
    if (!email.trim()) {
      setErrorMessage("Enter your email to reset your password.");
      return;
    }

    setErrorMessage(null);
    setInfoMessage(null);

    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setInfoMessage("Check your email for a password reset link.");
  };

  return (
    <div className="min-h-screen bg-background px-4">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center py-12">
        <div className="mb-6 text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Aspire</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            Aspire Goal Tracking Portal
          </h1>
        </div>
        <Card className="w-full border-border bg-card shadow-soft">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-semibold tracking-tight">Welcome back</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Sign in to manage your goals and approvals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    aria-label="Remember me"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-primary transition hover:text-primary/80"
                >
                  Forgot password?
                </button>
              </div>
              {errorMessage ? (
                <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger" role="alert">
                  {errorMessage}
                </p>
              ) : null}
              {infoMessage ? (
                <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success" role="status">
                  {infoMessage}
                </p>
              ) : null}
              <Button
                type="submit"
                className="h-11 w-full rounded-xl"
                disabled={isSubmitting || !email.trim() || !password}
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
