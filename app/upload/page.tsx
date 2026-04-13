import AuthGate from "../list/AuthGate";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import UploadClient from "./UploadClient";
import LogoutButton from "../components/LogoutButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return <AuthGate />;

    return (
        <main className="p-10">
            <div className="mx-auto w-full max-w-4xl">
                <h1 className="text-3xl font-semibold mb-2">
                    Upload Image → Generate Captions
                </h1>
                <div className="mb-3 text-sm opacity-70">Signed in as: {user.email}</div>

                <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Link
                        href="/"
                        className="px-3 py-1 text-xs border rounded-md hover:bg-black/5"
                    >
                        Home
                    </Link>
                    <Link
                        href="/list"
                        className="px-3 py-1 text-xs border rounded-md hover:bg-black/5"
                    >
                        Feed
                    </Link>
                    <LogoutButton />
                </div>

                <div className="mb-6 text-sm opacity-80">
                    Pick an image, generate captions, then open Feed to vote.
                </div>

                <UploadClient />
            </div>
        </main>
    );
}
