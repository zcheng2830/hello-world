import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export default async function ListPage() {
    const { data, error } = await supabase
        .from("images")
        .select("id, created_datetime_utc, url, image_description, is_public")
        .eq("is_public", true)
        .order("created_datetime_utc", { ascending: false })
        .limit(30);

    return (
        <main className="p-10">
            <h1 className="text-3xl font-semibold mb-6">
                Image Feed (Supabase)
            </h1>

            {error ? (
                <div className="border rounded-lg p-4">
                    <p className="font-semibold mb-2">Error fetching rows:</p>
                    <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(error, null, 2)}
          </pre>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {(data ?? []).map((row: any) => (
                        <div
                            key={row.id}
                            className="border rounded-xl p-4 transition-transform hover:scale-[1.01] hover:shadow-lg"
                        >
                            <div className="text-xs opacity-70 mb-2">
                                {row.created_datetime_utc
                                    ? new Date(row.created_datetime_utc).toLocaleString()
                                    : ""}
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

                                <div className="mt-2 text-xs opacity-70 break-all">
                                    id: {row.id}
                                </div>

                                <div className="mt-1 text-xs">
                                    {row.is_public ? "public" : "not public"}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
