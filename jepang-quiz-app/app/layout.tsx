import type { Metadata, Viewport } from "next";
import { Inter, Noto_Serif_JP } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const notoSerifJp = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-serif-jp",
});

// Terapkan tema tersimpan SEBELUM paint pertama supaya tidak ada flash
// dark->traditional (atau sebaliknya) saat reload.
const THEME_INIT_SCRIPT = `
  try {
    var t = localStorage.getItem('jqa:theme');
    if (t === 'traditional') document.documentElement.setAttribute('data-theme', 'traditional');
  } catch (e) {}
`;

export const metadata: Metadata = {
  title: "Kuis Bahasa Jepang",
  description:
    "Aplikasi kuis belajar bahasa Jepang offline: JSON-driven quiz player dengan spaced repetition, furigana, kamus klik, dan text-to-speech.",
  manifest: "/manifest.json",
  icons: [{ rel: "icon", url: "/icon.svg", type: "image/svg+xml" }],
};

export const viewport: Viewport = {
  themeColor: "#0c0c0d",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${inter.variable} ${notoSerifJp.variable}`}>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
      </head>
      <body className="bg-bg text-fg antialiased">
        {children}
        <Script id="register-sw" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) { window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js')); }`}
        </Script>
      </body>
    </html>
  );
}
