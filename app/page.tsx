import Link from "next/link";

export default function Home() {
    return (
        <main className="p-10">
            <h1 className="text-3xl font-semibold">Caption App</h1>
            <p className="mt-2 text-sm opacity-75">
                Upload an image, generate captions, then vote in the feed.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
                <Link
                    href="/upload"
                    className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-black/5"
                >
                    Upload Image
                </Link>
                <Link
                    href="/list"
                    className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-black/5"
                >
                    Open Feed
                </Link>
            </div>
        </main>
    );
}
