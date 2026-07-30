import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kuis Bahasa Jepang",
  description:
    "Aplikasi kuis belajar bahasa Jepang: JSON-driven quiz player dengan furigana, kamus klik, dan text-to-speech.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
