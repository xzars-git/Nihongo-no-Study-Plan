import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

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
    <html lang="id" className={inter.variable} style={{ colorScheme: "dark" }}>
      <body className="bg-bg text-fg antialiased">{children}</body>
    </html>
  );
}
