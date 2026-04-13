import Link from "next/link";
import AuthGate from "./AuthGate";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import LogoutButton from "../components/LogoutButton";
import VoteControls from "./VoteControls";

export const dynamic = "force-dynamic";

type ImageRow = {
  id: string;
  created_datetime_utc: string | null;
  url: string | null;
};

type CaptionRow = {
  id: string;
  image_id: string;
  content: string | null;
};

type VoteRow = {
  caption_id: string;
  vote_value: number;
};

function formatUtcDateTime(value: string | null) {
  if (!value) return "";
  // Keep deterministic formatting without relying on Date/Intl.
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (match) {
    return `${match[1]} ${match[2]}:${match[3]} UTC`;
  }
  return value.replace("T", " ").replace("+00:00", " UTC");
}

export default async function ListPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <AuthGate />;

  // 1) Fetch images: public OR owned by current user
  const { data: images, error: imgError } = await supabase
      .from("images")
      .select("id, created_datetime_utc, url")
      .or(`is_public.eq.true,profile_id.eq.${user.id}`)
      .order("created_datetime_utc", { ascending: false })
      .order("id", { ascending: true })
      .limit(100);

  const rows = (images ?? []) as ImageRow[];
  const imageIds = rows.map((r) => r.id);

  // 2) Fetch captions: public OR owned by current user, for those images
  const { data: captions, error: capError } = imageIds.length
      ? await supabase
          .from("captions")
          .select("id, image_id, content")
          .in("image_id", imageIds)
          .or(`is_public.eq.true,profile_id.eq.${user.id}`)
          .order("created_datetime_utc", { ascending: false })
          .order("id", { ascending: true })
      : { data: [], error: null };

  const captionRows = (captions ?? []) as CaptionRow[];
  const captionIds = captionRows.map((c) => c.id);

  // 3) Fetch current user's votes for visible captions (for button state)
  const { data: votes, error: voteError } = captionIds.length
      ? await supabase
          .from("caption_votes")
          .select("caption_id, vote_value")
          .eq("profile_id", user.id)
          .in("caption_id", captionIds)
      : { data: [], error: null };

  const voteRows = (votes ?? []) as VoteRow[];
  const voteByCaptionId = new Map<string, 1 | -1>();
  for (const vote of voteRows) {
    if (vote.vote_value === 1 || vote.vote_value === -1) {
      voteByCaptionId.set(vote.caption_id, vote.vote_value);
    }
  }

  // Group captions by image_id
  const captionsByImageId = new Map<string, CaptionRow[]>();
  for (const c of captionRows) {
    const arr = captionsByImageId.get(c.image_id) ?? [];
    arr.push(c);
    captionsByImageId.set(c.image_id, arr);
  }

  const error = imgError ?? capError ?? voteError;
  const errorMessage =
      error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message ?? "")
          : "";

  // Helper render: image-only card (for images with no visible captions)
  const renderImageOnlyCard = (row: ImageRow) => (
      <div
          key={row.id}
          className="border rounded-lg p-4 transition-transform hover:shadow-lg"
      >
        <div className="text-xs opacity-70 mb-2">
          {formatUtcDateTime(row.created_datetime_utc)}
        </div>

        {row.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={row.url}
                alt="Uploaded image"
                className="w-full h-48 object-cover rounded-lg"
            />
        ) : (
            <div className="w-full h-48 rounded-lg border flex items-center justify-center text-sm opacity-70">
              No image URL
            </div>
        )}

        <div className="mt-3 text-sm">
          <div className="text-xs opacity-60 italic">
            Captions are still being generated for this image.
          </div>
        </div>
      </div>
  );

  // Helper render: one-caption card (splits multiple captions into separate cards)
  const renderCaptionCard = (row: ImageRow, c: CaptionRow, currentVote: 1 | -1 | 0) => (
      <div
          key={c.id}
          className="border rounded-lg p-4 transition-transform hover:shadow-lg"
      >
        <div className="text-xs opacity-70 mb-2">
          {formatUtcDateTime(row.created_datetime_utc)}
        </div>

        {row.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={row.url}
                alt="Uploaded image"
                className="w-full h-48 object-cover rounded-lg"
            />
        ) : (
            <div className="w-full h-48 rounded-lg border flex items-center justify-center text-sm opacity-70">
              No image URL
            </div>
        )}

        <div className="mt-3 text-sm">
          <div className="border rounded-lg p-3">
            <div className="text-base">{c.content ?? "(no caption content)"}</div>
            <VoteControls captionId={c.id} initialVote={currentVote} />
          </div>
        </div>
      </div>
  );

  return (
      <main className="p-10">
        <div className="mx-auto w-full max-w-6xl">
          <h1 className="text-3xl font-semibold mb-2">Caption Feed</h1>
          <div className="mb-2 text-sm opacity-70">Signed in as: {user.email}</div>
          <div className="mb-4 text-sm opacity-80">
            Vote for the funniest caption under each image.
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Link
                href="/upload"
                className="px-3 py-1 text-xs border rounded-md hover:bg-black/5"
            >
              Upload Page
            </Link>
            <Link
                href="/"
                className="px-3 py-1 text-xs border rounded-md hover:bg-black/5"
            >
              Home
            </Link>
            <LogoutButton />
          </div>

          {error ? (
              <div className="border rounded-lg p-4">
                <p className="font-semibold">Could not load the feed right now.</p>
                {errorMessage ? (
                    <p className="mt-1 text-sm opacity-70">{errorMessage}</p>
                ) : null}
              </div>
          ) : rows.length === 0 ? (
              <div className="border rounded-lg p-4">
                <p className="font-semibold">No images yet.</p>
                <p className="mt-1 text-sm opacity-70">
                  Upload your first image to generate captions and start voting.
                </p>
                <div className="mt-3">
                  <Link
                      href="/upload"
                      className="px-3 py-1 text-xs border rounded-md hover:bg-black/5"
                  >
                    Go to Upload
                  </Link>
                </div>
              </div>
          ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rows.flatMap((row) => {
                  const caps = captionsByImageId.get(row.id) ?? [];
                  if (caps.length === 0) return [renderImageOnlyCard(row)];
                  return caps.map((c) =>
                      renderCaptionCard(row, c, voteByCaptionId.get(c.id) ?? 0),
                  );
                })}
              </div>
          )}
        </div>
      </main>
  );
}
