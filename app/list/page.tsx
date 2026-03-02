import AuthGate from "./AuthGate";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { voteCaption } from "./actions";
import LogoutButton from "../components/LogoutButton";

export const dynamic = "force-dynamic";

type ImageRow = {
  id: string;
  created_datetime_utc: string | null;
  url: string | null;
  image_description: string | null;
  is_public: boolean;
  profile_id: string | null;
};

type CaptionRow = {
  id: string;
  image_id: string;
  content: string | null;
  is_public: boolean;
  profile_id: string | null;
};

function formatUtcDateTime(value: string | null) {
  if (!value) return "";
  // Keep this deterministic across server/client by avoiding Date/Intl locale formatting.
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
      .select("id, created_datetime_utc, url, image_description, is_public, profile_id")
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
          .select("id, image_id, content, is_public, profile_id")
          .in("image_id", imageIds)
          .or(`is_public.eq.true,profile_id.eq.${user.id}`)
          .order("created_datetime_utc", { ascending: false })
          .order("id", { ascending: true })
      : { data: [], error: null };

  const captionRows = (captions ?? []) as CaptionRow[];

  // Group captions by image_id
  const captionsByImageId = new Map<string, CaptionRow[]>();
  for (const c of captionRows) {
    const arr = captionsByImageId.get(c.image_id) ?? [];
    arr.push(c);
    captionsByImageId.set(c.image_id, arr);
  }

  const error = imgError ?? capError;

  // Helper render: image-only card (for images with no visible captions)
  const renderImageOnlyCard = (row: ImageRow) => (
      <div
          key={row.id}
          className="border rounded-xl p-4 transition-transform hover:scale-[1.01] hover:shadow-lg"
      >
        <div className="text-xs opacity-70 mb-2">
          {formatUtcDateTime(row.created_datetime_utc)}
        </div>

        {row.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={row.url}
                alt={row.image_description ?? "image"}
                className="w-full h-48 object-cover rounded-lg"
            />
        ) : (
            <div className="w-full h-48 rounded-lg border flex items-center justify-center text-sm opacity-70">
              No image URL
            </div>
        )}

        <div className="mt-3 text-sm">
          <div className="font-semibold line-clamp-2">
            {row.image_description ? (
                row.image_description
            ) : (
                <span className="opacity-50 italic">(no description)</span>
            )}
          </div>

          <div className="mt-3 text-xs opacity-60 italic">
            (no captions available for this image yet)
          </div>

          <div className="mt-3 text-xs opacity-70 break-all">image_id: {row.id}</div>
          <div className="mt-1 text-xs">{row.is_public ? "public" : "not public"}</div>
        </div>
      </div>
  );

  // Helper render: one-caption card (splits multiple captions into separate cards)
  const renderCaptionCard = (row: ImageRow, c: CaptionRow) => (
      <div
          key={c.id}
          className="border rounded-xl p-4 transition-transform hover:scale-[1.01] hover:shadow-lg"
      >
        <div className="text-xs opacity-70 mb-2">
          {formatUtcDateTime(row.created_datetime_utc)}
        </div>

        {row.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={row.url}
                alt={row.image_description ?? "image"}
                className="w-full h-48 object-cover rounded-lg"
            />
        ) : (
            <div className="w-full h-48 rounded-lg border flex items-center justify-center text-sm opacity-70">
              No image URL
            </div>
        )}

        <div className="mt-3 text-sm">
          <div className="font-semibold line-clamp-2">
            {row.image_description ? (
                row.image_description
            ) : (
                <span className="opacity-50 italic">(no description)</span>
            )}
          </div>

          <div className="mt-3 border rounded-lg p-3">
            <div className="text-sm">{c.content ?? "(no caption content)"}</div>

            <div className="mt-2 flex gap-2">
              <form
                  action={async () => {
                    "use server";
                    await voteCaption(c.id, 1); // ✅ caption id
                  }}
              >
                <button
                    type="submit"
                    className="px-3 py-1 text-xs border rounded-lg hover:shadow"
                >
                  👍 Upvote
                </button>
              </form>

              <form
                  action={async () => {
                    "use server";
                    await voteCaption(c.id, -1); // ✅ caption id
                  }}
              >
                <button
                    type="submit"
                    className="px-3 py-1 text-xs border rounded-lg hover:shadow"
                >
                  👎 Downvote
                </button>
              </form>
            </div>

            <div className="mt-2 text-[11px] opacity-60 break-all">caption_id: {c.id}</div>
          </div>

          <div className="mt-3 text-xs opacity-70 break-all">image_id: {row.id}</div>
          <div className="mt-1 text-xs">{row.is_public ? "public" : "not public"}</div>
        </div>
      </div>
  );

  return (
      <main className="p-10">
        <h1 className="text-3xl font-semibold mb-2">Image Feed (Supabase)</h1>
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="text-sm opacity-70">Signed in as: {user.email}</div>
          <LogoutButton />
        </div>

        {error ? (
            <div className="border rounded-lg p-4">
              <p className="font-semibold mb-2">Error fetching rows:</p>
              <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(error, null, 2)}
          </pre>
            </div>
        ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rows.flatMap((row) => {
                const caps = captionsByImageId.get(row.id) ?? [];
                if (caps.length === 0) return [renderImageOnlyCard(row)];
                return caps.map((c) => renderCaptionCard(row, c));
              })}
            </div>
        )}
      </main>
  );
}
