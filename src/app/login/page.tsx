"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <div className="h-8 w-8 rounded-sm bg-signal/90 flex items-center justify-center">
            <div className="h-2 w-4 border-2 border-ink rounded-[1px]" />
          </div>
          <div>
            <p className="font-mono text-xs text-muted tracking-wide uppercase">
              Partitioned Assistant
            </p>
          </div>
        </div>

        <h1 className="text-2xl font-semibold mb-1">
          {mode === "signin" ? "Sign in" : "Create your account"}
        </h1>
        <p className="text-muted text-sm mb-6">
          One account, many isolated workspaces. Documents in one never leak into another.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-mono uppercase text-muted mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-panel border border-line rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-signal/50"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase text-muted mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-panel border border-line rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-signal/50"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-danger text-sm border border-danger/30 bg-danger/10 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-signal text-ink font-medium rounded-md py-2 text-sm hover:brightness-95 disabled:opacity-60 transition"
          >
            {loading ? "Working..." : mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 text-sm text-muted hover:text-signal2 transition"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
