import type { Metadata, Viewport } from "next";
import { Gowun_Dodum, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  weight: "variable",
  display: "swap",
  preload: false,
});

const gowunDodum = Gowun_Dodum({
  variable: "--font-gowun-dodum",
  weight: "400",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "TwinLog — 오늘의 육아 기록",
  description: "쌍둥이와 다태아를 한눈에 비교하고 빠르게 기록하는 육아 로그",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f1e8" },
    { media: "(prefers-color-scheme: dark)", color: "#161a18" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${notoSansKr.variable} ${gowunDodum.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
