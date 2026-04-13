"use client";

import { useEffect, useRef, useState } from "react";
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

type HumorFlavorOption = {
    id: number;
    slug: string | null;
    description: string | null;
};

type UploadClientProps = {
    mode?: "standalone" | "feed";
};

export default function UploadClient({ mode = "standalone" }: UploadClientProps) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState<string>("");
    const [captions, setCaptions] = useState<string[]>([]);
    const [humorFlavors, setHumorFlavors] = useState<HumorFlavorOption[]>([]);
    const [selectedHumorFlavorId, setSelectedHumorFlavorId] = useState<string>("");
    const [flavorsLoading, setFlavorsLoading] = useState(true);
    const [flavorsError, setFlavorsError] = useState<string>("");

    const hasError = status.startsWith("Error:");
    const isFeedMode = mode === "feed";

    useEffect(() => {
        let mounted = true;

        async function loadHumorFlavors() {
            const supabase = createSupabaseBrowserClient();
            setFlavorsLoading(true);
            setFlavorsError("");

            const { data, error } = await supabase
                .from("humor_flavors")
                .select("id, slug, description")
                .order("id", { ascending: false })
                .limit(100);

            if (!mounted) return;

            if (error) {
                setFlavorsError(error.message);
                setHumorFlavors([]);
            } else {
                setHumorFlavors((data ?? []) as HumorFlavorOption[]);
            }

            setFlavorsLoading(false);
        }

        void loadHumorFlavors();

        return () => {
            mounted = false;
        };
    }, []);

    function getCaptionText(value: unknown): string | null {
        if (typeof value === "string" && value.trim().length > 0) return value.trim();

        if (value && typeof value === "object") {
            const row = value as {
                content?: unknown;
                caption?: unknown;
                text?: unknown;
            };
            const candidate = row.content ?? row.caption ?? row.text;
            if (typeof candidate === "string" && candidate.trim().length > 0) {
                return candidate.trim();
            }
        }

        return null;
    }

    function normalizeCaptionResponse(payload: unknown): string[] {
        if (Array.isArray(payload)) {
            return payload
                .map((entry) => getCaptionText(entry))
                .filter((entry): entry is string => Boolean(entry));
        }

        if (payload && typeof payload === "object") {
            const maybeCaptions = (payload as { captions?: unknown }).captions;
            if (Array.isArray(maybeCaptions)) {
                return maybeCaptions
                    .map((entry) => getCaptionText(entry))
                    .filter((entry): entry is string => Boolean(entry));
            }
        }

        const singleCaption = getCaptionText(payload);
        return singleCaption ? [singleCaption] : [];
    }

    async function waitForPersistedCaptions(imageIdToCheck: string, timeoutMs = 20000) {
        const supabase = createSupabaseBrowserClient();
        const deadline = Date.now() + timeoutMs;

        while (Date.now() < deadline) {
            const { data, error } = await supabase
                .from("captions")
                .select("content")
                .eq("image_id", imageIdToCheck)
                .limit(20);

            if (!error && Array.isArray(data) && data.length > 0) {
                return data
                    .map((entry) => getCaptionText(entry))
                    .filter((entry): entry is string => Boolean(entry));
            }

            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        return [];
    }

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
        setCaptions([]);

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

            // Step 4: Generate captions
            setStatus("Step 4/4: generating captions…");
            const parsedFlavorId = Number.parseInt(selectedHumorFlavorId, 10);
            const hasFlavorOverride =
                selectedHumorFlavorId.length > 0 && Number.isFinite(parsedFlavorId);
            const capRes = await fetch(`${API_BASE}/pipeline/generate-captions`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(
                    hasFlavorOverride
                        ? { imageId: regJson.imageId, humorFlavorId: parsedFlavorId }
                        : { imageId: regJson.imageId },
                ),
            });
            const capBodyText = await capRes.text();

            if (!capRes.ok) {
                throw new Error(`Generate captions failed: ${capRes.status} ${capBodyText}`);
            }

            let captionPayload: unknown = null;
            if (capBodyText) {
                try {
                    captionPayload = JSON.parse(capBodyText);
                } catch {
                    captionPayload = capBodyText;
                }
            }
            const immediateCaptions = normalizeCaptionResponse(captionPayload);

            setStatus("Step 4/4: waiting for captions to persist…");
            const persistedCaptions = await waitForPersistedCaptions(regJson.imageId);

            if (persistedCaptions.length > 0) {
                setCaptions(persistedCaptions);
                setStatus("Done ✅ Captions generated and persisted.");
            } else {
                setCaptions(immediateCaptions);
                setStatus("Done ✅ Caption request accepted (captions may still be processing).");
            }
        } catch (e: unknown) {
            console.error(e);
            const message = e instanceof Error ? e.message : String(e);
            setStatus(`Error: ${message}`);
        } finally {
            setBusy(false);
        }
    }

    function resetUploadForm() {
        setFile(null);
        setStatus("");
        setCaptions([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    return (
        <div className="max-w-xl space-y-4">
            <div className="border rounded-lg p-4">
                <div className="text-sm font-semibold mb-2">Upload a photo</div>
                <div className="text-xs opacity-70">
                    {isFeedMode
                        ? "JPG, PNG, WEBP, GIF, or HEIC. New captions will appear after refresh."
                        : "JPG, PNG, WEBP, GIF, or HEIC"}
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    disabled={busy}
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />

                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={busy}
                        className="px-3 py-1 text-xs border rounded-md disabled:opacity-50 hover:bg-black/5"
                    >
                        Choose Photo
                    </button>
                    <div className="text-sm">
                        {file ? file.name : <span className="opacity-60">No file selected</span>}
                    </div>
                </div>

                <div className="mt-3">
                    <label className="text-sm font-semibold" htmlFor="humor-flavor-select">
                        Humor flavor
                    </label>
                    <select
                        id="humor-flavor-select"
                        className="mt-1 w-full border rounded-lg p-2 text-sm"
                        disabled={busy || flavorsLoading}
                        value={selectedHumorFlavorId}
                        onChange={(e) => setSelectedHumorFlavorId(e.target.value)}
                    >
                        <option value="">Default pipeline flavor</option>
                        {humorFlavors.map((flavor) => (
                            <option key={flavor.id} value={String(flavor.id)}>
                                {flavor.slug ?? flavor.description ?? "Custom flavor"}
                            </option>
                        ))}
                    </select>
                    {flavorsLoading ? (
                        <div className="mt-1 text-xs opacity-70">Loading flavors…</div>
                    ) : null}
                    {flavorsError ? (
                        <div className="mt-1 text-xs text-red-600">
                            Could not load flavors: {flavorsError}
                        </div>
                    ) : null}
                </div>

                <div className="mt-3 flex gap-2">
                    <button
                        onClick={handleUpload}
                        disabled={!file || busy}
                        className="px-4 py-2 border rounded-md disabled:opacity-50 hover:bg-black/5"
                    >
                        {busy
                            ? "Working…"
                            : isFeedMode
                              ? "Upload & Generate Captions"
                              : "Generate Captions"}
                    </button>

                    {!isFeedMode ? (
                        <button
                            onClick={() => router.push("/list")}
                            disabled={busy}
                            className="px-4 py-2 border rounded-md disabled:opacity-50 hover:bg-black/5"
                        >
                            Go to Feed
                        </button>
                    ) : null}

                    {!isFeedMode ? (
                        <button
                            onClick={() => router.push("/")}
                            disabled={busy}
                            className="px-4 py-2 border rounded-md disabled:opacity-50 hover:bg-black/5"
                        >
                            Home
                        </button>
                    ) : null}
                </div>

                {status && (
                    <div className={`mt-3 text-sm ${hasError ? "text-red-600" : "opacity-80"}`}>
                        {status}
                    </div>
                )}
            </div>

            {captions.length > 0 && (
                <div className="border rounded-lg p-4">
                    <div className="text-sm font-semibold mb-2">Generated captions</div>
                    <ol className="list-decimal space-y-2 pl-5 text-sm">
                        {captions.map((caption, index) => (
                            <li key={`${caption}-${index}`}>{caption}</li>
                        ))}
                    </ol>

                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={resetUploadForm}
                            className="px-3 py-1 text-xs border rounded-md hover:bg-black/5"
                        >
                            Upload Another
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                isFeedMode ? router.refresh() : router.push("/list")
                            }
                            className="px-3 py-1 text-xs border rounded-md hover:bg-black/5"
                        >
                            {isFeedMode ? "Refresh Feed" : "Vote in Feed"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
