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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/admin/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm p-6 border rounded-lg"
      >
        <h1 className="text-xl font-bold mb-4">Super Admin Login</h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full mb-3 p-2 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full mb-4 p-2 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <p className="text-red-600 text-sm mb-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white p-2 rounded"
        >
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>
    </div>
  );
}