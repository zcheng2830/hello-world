"use client";

import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

export default function AuthGate() {
  const signInWithGoogle = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1>Sign in required</h1>
      <p>This route is protected. Please sign in to continue.</p>
      <button onClick={signInWithGoogle}>Continue with Google</button>
    </main>
  );
}
