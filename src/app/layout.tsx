import type { Metadata } from "next";
import { GOOGLE_SITE_VERIFICATION, NAVER_SITE_VERIFICATION, SITE_NAME, SITE_URL } from "@/lib/site";
// Self-hosted Pretendard: an external CDN stylesheet blocked first paint for seconds.
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import Providers from "@/components/providers";


export const metadata: Metadata = {
  title: "COAI — 쉽게 보고, 바로 써보는 AI 커뮤니티",
  description:
    "AI를 같이 배우고, 같이 쓰고, 같이 만드는 커뮤니티. AI 뉴스와 행사, 프롬프트, 바로 쓰는 AI 도구, 배우기와 만들어보기까지 한곳에서.",
  keywords: ["COAI", "AI 커뮤니티", "AI 스터디", "프롬프트", "AI 뉴스", "바이브코딩"],
  icons: { icon: "/coai/brand/icon.png", apple: "/coai/brand/apple-icon.png" },
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "ko_KR",
    title: "COAI — 쉽게 보고, 바로 써보는 AI 커뮤니티",
    description: "AI를 같이 배우고, 같이 쓰고, 같이 만드는 커뮤니티.",
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
    <html lang="ko" data-playlab-design="coai" suppressHydrationWarning>
      <body
        className="antialiased bg-background text-foreground"
      >
        <Providers previewMode={process.env.NODE_ENV === 'development' && process.env.PLAYLAB_DESIGN_PREVIEW === '1'} authConfigured={Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)}>{children}</Providers>
        {process.env.NODE_ENV === 'development' && process.env.PLAYLAB_DESIGN_PREVIEW === '1' && <div className="preview-notice">디자인 미리보기 · 공개 작품 스냅샷 · 저장/생성 비활성</div>}
      </body>
    </html>
  );
}
