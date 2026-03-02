"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

export default function LogoutButton() {
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    const handleLogout = async () => {
        setBusy(true);
        try {
            const supabase = createSupabaseBrowserClient();
            await supabase.auth.signOut();
            router.push("/");
            router.refresh();
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            onClick={handleLogout}
            disabled={busy}
            className="px-3 py-1 text-xs border rounded-lg hover:shadow disabled:opacity-50"
        >
            {busy ? "Signing out..." : "Logout"}
        </button>
    );
}
