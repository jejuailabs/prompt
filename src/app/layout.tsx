import type { Metadata } from "next";
import { GOOGLE_SITE_VERIFICATION, NAVER_SITE_VERIFICATION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";
import Providers from "@/components/providers";


export const metadata: Metadata = {
  title: "PLAYLAB — 바이브코딩 올인원 플랫폼",
  description:
    "아이디어 구상부터 수익화까지. 프롬프트 전시실, 멀티모델 비교, AI 파이프라인, 스모크테스트까지 바이브코딩 전 과정을 하나의 여정으로.",
  keywords: ["PLAYLAB", "바이브코딩", "바이브코딩 매뉴얼", "AI 코딩", "프롬프트", "vibe coding"],
  icons: { icon: "/logo.svg" },
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "ko_KR",
    title: "PLAYLAB — 바이브코딩 올인원 플랫폼",
    description: "아이디어 구상부터 수익화까지, 바이브코딩 전 과정을 하나의 여정으로.",
  },
  robots: { index: true, follow: true },
  verification: {
    ...(GOOGLE_SITE_VERIFICATION ? { google: GOOGLE_SITE_VERIFICATION } : {}),
    ...(NAVER_SITE_VERIFICATION ? { other: { "naver-site-verification": NAVER_SITE_VERIFICATION } } : {}),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className="antialiased bg-background text-foreground"
      >
        <Providers previewMode={process.env.NODE_ENV === 'development' && process.env.PLAYLAB_DESIGN_PREVIEW === '1'} authConfigured={Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)}>{children}</Providers>
        {process.env.NODE_ENV === 'development' && process.env.PLAYLAB_DESIGN_PREVIEW === '1' && <div className="preview-notice">디자인 미리보기 · 공개 작품 스냅샷 · 저장/생성 비활성</div>}
      </body>
    </html>
  );
}
