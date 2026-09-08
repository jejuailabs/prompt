import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PLAYLAB — 바이브코딩 올인원 플랫폼",
  description:
    "아이디어 구상부터 수익화까지. 프롬프트 전시실, 멀티모델 비교, AI 파이프라인, 스모크테스트까지 바이브코딩 전 과정을 하나의 여정으로.",
  keywords: ["PLAYLAB", "바이브코딩", "AI", "프롬프트", "vibe coding"],
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
