"use client";

import { useState } from "react";
import { voteCaption } from "./actions";

type VoteValue = 1 | -1 | 0;

type VoteControlsProps = {
    captionId: string;
    initialVote: VoteValue;
};

export default function VoteControls({ captionId, initialVote }: VoteControlsProps) {
    const [vote, setVote] = useState<VoteValue>(initialVote);
    const [pendingVote, setPendingVote] = useState<VoteValue>(0);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string>("");

    async function submitVote(nextVote: 1 | -1) {
        if (busy) return;

        setBusy(true);
        setPendingVote(nextVote);
        setMessage("");

        try {
            await voteCaption(captionId, nextVote);
            setVote(nextVote);
            setMessage(nextVote === 1 ? "Upvote saved." : "Downvote saved.");
        } catch (error: unknown) {
            const details = error instanceof Error ? error.message : "Unknown error";
            setMessage(`Could not save vote: ${details}`);
        } finally {
            setBusy(false);
            setPendingVote(0);
        }
    }

    const upvoteActive = vote === 1;
    const downvoteActive = vote === -1;

    return (
        <div className="mt-2">
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => submitVote(1)}
                    disabled={busy}
                    aria-pressed={upvoteActive}
                    className={`px-3 py-1 text-xs border rounded-md disabled:opacity-50 ${
                        upvoteActive ? "bg-green-600 text-white border-green-600" : "hover:bg-black/5"
                    }`}
                >
                    {busy && pendingVote === 1 ? "Saving…" : "👍 Upvote"}
                </button>

                <button
                    type="button"
                    onClick={() => submitVote(-1)}
                    disabled={busy}
                    aria-pressed={downvoteActive}
                    className={`px-3 py-1 text-xs border rounded-md disabled:opacity-50 ${
                        downvoteActive ? "bg-red-600 text-white border-red-600" : "hover:bg-black/5"
                    }`}
                >
                    {busy && pendingVote === -1 ? "Saving…" : "👎 Downvote"}
                </button>
            </div>

            <div className="mt-1 min-h-4 text-xs opacity-80" aria-live="polite">
                {message}
            </div>
        </div>
    );
}
