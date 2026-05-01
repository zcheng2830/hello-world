import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Caption App",
  description: "Upload photos, generate captions, and vote on your favorites.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
