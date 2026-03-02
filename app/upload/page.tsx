import AuthGate from "../list/AuthGate";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import UploadClient from "./UploadClient";
import LogoutButton from "../components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return <AuthGate />;

    return (
        <main className="p-10">
            <h1 className="text-3xl font-semibold mb-2">
                Upload Image → Generate Captions
            </h1>
            <div className="mb-6 flex items-center justify-between gap-3">
                <div className="text-sm opacity-70">Signed in as: {user.email}</div>
                <LogoutButton />
            </div>
            <UploadClient />
        </main>
    );
}
