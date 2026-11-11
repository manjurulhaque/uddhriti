"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Input, Button, FormErrorBanner } from "@/components/ui";

export default function AdminLoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (cooldownSeconds > 0) return;

    setLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);

      // Best-effort audit logging for failed login attempts
      fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          status: "FAILED",
          error: error.message,
        }),
      }).catch(() => {});

      // Progressive delay against automated credential-stuffing
      if (nextAttempts >= 5) {
        setCooldownSeconds(30);
        const timer = setInterval(() => {
          setCooldownSeconds((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }

      setError(error.message);
      setLoading(false);
      return;
    }

    // Record successful admin login event in the audit trail
    try {
      await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          status: "SUCCESS",
        }),
      });
    } catch {
      // Non-blocking: prevent audit log network failure from stopping legitimate admin access
    }

    router.push("/admin/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm p-6 sm:p-8 bg-white border border-stone-200/90 rounded-2xl shadow-2xs space-y-5"
      >
        <div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">Admin Portal</h1>
          <p className="text-xs text-stone-500 mt-1">Authenticate to manage quotations &amp; catalog</p>
        </div>

        <FormErrorBanner error={error} onDismiss={() => setError(null)} />

        <div className="space-y-4">
          <Input
            id="admin-email"
            type="email"
            label="Email Address"
            autoComplete="username"
            placeholder="admin@quotzen.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading || cooldownSeconds > 0}
          />

          <Input
            id="admin-password"
            type="password"
            label="Password"
            autoComplete="current-password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading || cooldownSeconds > 0}
          />
        </div>

        {cooldownSeconds > 0 && (
          <p className="text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-xs text-center font-medium">
            Too many attempts. Please wait {cooldownSeconds}s before retrying.
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          isLoading={loading}
          disabled={loading || cooldownSeconds > 0}
          className="w-full justify-center"
        >
          {loading ? "Signing in..." : cooldownSeconds > 0 ? `Locked (${cooldownSeconds}s)` : "Sign In"}
        </Button>
      </form>
    </div>
  );
}
