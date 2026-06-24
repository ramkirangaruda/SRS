// The login page ("/login"). This is a Client Component ("use client") because
// it manages form state and reacts to user input — things that need to run in
// the browser.
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  // If middleware bounced the user here from a protected page, NextAuth puts the
  // intended destination in a `callbackUrl` query param. We honor it after login.
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  // If the user landed here after a password change / session expiry, explain why.
  const reason = searchParams.get("reason");
  const reasonMessage = reason === "password-changed"
    ? "Your password was changed. Please log in again."
    : reason === "session-expired"
      ? "Your session expired. Please log in again."
      : null;

  // Local form state — controlled inputs keep React as the source of truth.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); // Stop the browser's default full-page form submit.
    setError(null);
    setLoading(true);

    // Call NextAuth's credentials provider. redirect:false means "don't navigate
    // for me" — we want to handle success/failure ourselves so we can show errors.
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (!result || result.error) {
      // authorize() returned null → NextAuth reports a generic credentials error.
      // We keep the message vague on purpose (don't reveal which field was wrong).
      setError("Invalid email or password.");
      return;
    }

    // Success! The session cookie is now set. Send them to the home redirector
    // (or back to wherever they were headed). router.refresh() re-reads the
    // server session so the UI updates immediately.
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">SchoolSync</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Why the user was sent back to login (password change / expiry). */}
          {reasonMessage && (
            <p className="mb-4 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">{reasonMessage}</p>
          )}
          {/* noValidate: we rely on our own validation + server checks. */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Only render the error box when there's an error to show. */}
            {error && (
              <p
                role="alert"
                className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          {/* Public legal links — required to be reachable without logging in. */}
          <div className="mt-4 text-center text-xs text-muted-foreground">
            <a href="/settings/privacy-policy" className="hover:underline">Privacy Policy</a>
            <span className="mx-2">·</span>
            <a href="/settings/terms" className="hover:underline">Terms of Service</a>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
