import Link from "next/link";

export default function Home() {
    return (
        <main className="p-10 text-2xl">
            <div>Hello World 👋</div>

            <div className="mt-6 text-base">
                <Link className="underline" href="/list">
                    Go to List Page →
                </Link>
            </div>
        </main>
    );
}
