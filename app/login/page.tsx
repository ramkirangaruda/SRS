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

          {/* Demo credentials so you can log in immediately after seeding. */}
          <div className="mt-6 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Demo accounts (from seed):</p>
            <p>Principal — principal@school.edu / password123</p>
            <p>Parent — parent@school.edu / password123</p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
