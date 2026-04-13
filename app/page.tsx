import Link from "next/link";

export default function Home() {
    return (
        <main className="p-10">
            <div className="mx-auto w-full max-w-4xl">
                <h1 className="text-3xl font-semibold">Caption App</h1>
                <p className="mt-2 text-sm opacity-75">
                    Start in Feed to upload, generate captions, and vote in one place.
                </p>

                <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm opacity-80">
                    <li>Open Feed</li>
                    <li>Upload an image</li>
                    <li>Generate captions</li>
                    <li>Vote in feed</li>
                </ol>

                <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                        href="/list"
                        className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-black/5"
                    >
                        Start in Feed
                    </Link>
                    <Link
                        href="/upload"
                        className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-black/5"
                    >
                        Standalone Upload
                    </Link>
                </div>
            </div>
        </main>
    );
}
