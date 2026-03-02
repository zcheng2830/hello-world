"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

const API_BASE = "https://api.almostcrackd.ai";

const SUPPORTED_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
]);

export default function UploadClient() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState<string>("");
    const [cdnUrl, setCdnUrl] = useState<string>("");
    const [imageId, setImageId] = useState<string>("");
    const [result, setResult] = useState<any[] | null>(null);

    async function getAccessToken() {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase.auth.getSession();
        if (error) throw new Error(error.message);

        const token = data.session?.access_token;
        if (!token) throw new Error("No access token (are you logged in?)");
        return token;
    }

    async function handleUpload() {
        if (!file) return;

        // Some browsers may give empty file.type for HEIC; default to jpeg if missing.
        const contentType = file.type || "image/jpeg";
        if (!SUPPORTED_TYPES.has(contentType)) {
            alert(`Unsupported file type: ${contentType}`);
            return;
        }

        setBusy(true);
        setStatus("");
        setResult(null);
        setCdnUrl("");
        setImageId("");

        try {
            const token = await getAccessToken();

            // Step 1: Generate presigned URL
            setStatus("Step 1/4: generating presigned URL…");
            const presignRes = await fetch(`${API_BASE}/pipeline/generate-presigned-url`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ contentType }),
            });

            if (!presignRes.ok) {
                const txt = await presignRes.text();
                throw new Error(`Presign failed: ${presignRes.status} ${txt}`);
            }

            const { presignedUrl, cdnUrl: returnedCdnUrl } = await presignRes.json();
            if (!presignedUrl || !returnedCdnUrl) {
                throw new Error("Bad presign response (missing presignedUrl/cdnUrl)");
            }
            setCdnUrl(returnedCdnUrl);

            // Step 2: Upload image bytes to presignedUrl
            setStatus("Step 2/4: uploading bytes…");
            const putRes = await fetch(presignedUrl, {
                method: "PUT",
                headers: {
                    "Content-Type": contentType,
                },
                body: file,
            });

            if (!putRes.ok) {
                const txt = await putRes.text();
                throw new Error(`Upload PUT failed: ${putRes.status} ${txt}`);
            }

            // Step 3: Register image URL
            setStatus("Step 3/4: registering image URL…");
            const regRes = await fetch(`${API_BASE}/pipeline/upload-image-from-url`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    imageUrl: returnedCdnUrl,
                    isCommonUse: false,
                }),
            });

            if (!regRes.ok) {
                const txt = await regRes.text();
                throw new Error(`Register failed: ${regRes.status} ${txt}`);
            }

            const regJson = await regRes.json();
            if (!regJson?.imageId) throw new Error("Bad register response (missing imageId)");
            setImageId(regJson.imageId);

            // Step 4: Generate captions
            setStatus("Step 4/4: generating captions…");
            const capRes = await fetch(`${API_BASE}/pipeline/generate-captions`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ imageId: regJson.imageId }),
            });

            if (!capRes.ok) {
                const txt = await capRes.text();
                throw new Error(`Generate captions failed: ${capRes.status} ${txt}`);
            }

            const captions = await capRes.json();
            setResult(Array.isArray(captions) ? captions : []);
            setStatus("Done ✅ Captions generated.");
        } catch (e: any) {
            console.error(e);
            setStatus(`Error: ${e?.message ?? String(e)}`);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="max-w-xl space-y-4">
            <div className="border rounded-xl p-4">
                <div className="text-sm font-semibold mb-2">Choose an image</div>

                <input
                    type="file"
                    accept="image/*"
                    disabled={busy}
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />

                <div className="mt-3 flex gap-2">
                    <button
                        onClick={handleUpload}
                        disabled={!file || busy}
                        className="px-4 py-2 border rounded-lg disabled:opacity-50"
                    >
                        {busy ? "Working…" : "Upload + Generate Captions"}
                    </button>

                    <button
                        onClick={() => router.push("/list")}
                        className="px-4 py-2 border rounded-lg"
                    >
                        Go to Feed
                    </button>
                </div>

                {status && <div className="mt-3 text-sm opacity-80">{status}</div>}

                {cdnUrl && (
                    <div className="mt-3 text-xs opacity-70 break-all">
                        cdnUrl: {cdnUrl}
                    </div>
                )}

                {imageId && (
                    <div className="mt-1 text-xs opacity-70 break-all">
                        imageId: {imageId}
                    </div>
                )}
            </div>

            {result && (
                <div className="border rounded-xl p-4">
                    <div className="text-sm font-semibold mb-2">Generated captions</div>
                    <pre className="text-xs whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
                </div>
            )}
        </div>
    );
}