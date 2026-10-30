"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);

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

    router.push("/admin/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm p-6 sm:p-8 bg-white border border-gray-200 rounded-2xl shadow-sm"
      >
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Admin Portal</h1>
          <p className="text-xs text-gray-500 mt-1">Authenticate to manage quotations &amp; catalog</p>
        </div>

        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5" htmlFor="admin-email">
              Email Address
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              placeholder="admin@quotzen.com"
              className="w-full p-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading || cooldownSeconds > 0}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5" htmlFor="admin-password">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••••••"
              className="w-full p-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading || cooldownSeconds > 0}
            />
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <span aria-hidden="true">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {cooldownSeconds > 0 && (
          <p className="text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-xs mb-4 text-center font-medium">
            Too many attempts. Please wait {cooldownSeconds}s before retrying.
          </p>
        )}

        <button
          type="submit"
          disabled={loading || cooldownSeconds > 0}
          className="w-full bg-black text-white p-2.5 text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
        >
          {loading ? "Signing in..." : cooldownSeconds > 0 ? `Locked (${cooldownSeconds}s)` : "Sign In"}
        </button>
      </form>
    </div>
  );
}
