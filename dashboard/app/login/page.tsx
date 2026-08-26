"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { buttonPrimary, ErrorNote, Field, inputClass } from "@/components/ui";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { builder, isReady, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isReady && builder) router.replace("/");
  }, [isReady, builder, router]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-600 text-lg font-bold text-white">
            P
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-900">PropTech Builder Console</h1>
          <p className="mt-1 text-sm text-slate-500">Analytics, leads and inventory for your projects</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {error ? <ErrorNote message={error} /> : null}
          <Field label="Email">
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="builder@acme.com"
              className={inputClass}
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </Field>
          <button type="submit" disabled={busy} className={`${buttonPrimary} w-full`}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Builder accounts are provisioned by the platform team.
        </p>
      </div>
    </div>
  );
}
