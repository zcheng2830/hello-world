"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

export default function AuthGate() {
  const [busy, setBusy] = useState(false);

  const signInWithGoogle = async () => {
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="p-10">
      <div className="max-w-xl border rounded-xl p-6">
        <h1 className="text-3xl font-semibold mb-2">Sign In Required</h1>
        <p className="mt-2 text-sm opacity-70">
          This page is protected. Sign in with your Google account to continue.
        </p>

        <button
          onClick={signInWithGoogle}
          disabled={busy}
          className="mt-6 px-4 py-2 border rounded-lg hover:shadow disabled:opacity-50"
        >
          {busy ? "Signing in..." : "Continue with Google"}
        </button>
      </div>
    </main>
  );
}
