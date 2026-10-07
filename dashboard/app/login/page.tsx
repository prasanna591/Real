"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

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
    <div className="app-shell relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-orange-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-indigo-200/30 blur-3xl" />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-lg font-bold text-white shadow-lg shadow-orange-500/25">
            P
          </div>
          <h1 className="mt-4 font-serif text-xl font-semibold tracking-tight text-slate-900">
            PropTech
          </h1>
          <p className="mt-1 text-sm text-slate-500">Builder Console</p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-premium backdrop-blur-sm"
        >
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
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Builder accounts are provisioned by the platform team.
        </p>
      </motion.div>
    </div>
  );
}
