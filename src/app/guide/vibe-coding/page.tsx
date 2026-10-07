import type { Metadata } from 'next';
import Link from 'next/link';
import { COLUMNS } from '@/components/views/vibe-setup/data';
import { MANUAL_DESCRIPTION, MANUAL_PATH, MANUAL_TITLE, MANUAL_UPDATED, getManualDocs } from '@/components/views/vibe-setup/manual';
import { ManualFullCollapsible } from '@/components/views/vibe-setup/manual-content';
import { SITE_NAME, SITE_URL } from '@/lib/site';

const title = `${MANUAL_TITLE}: 설치부터 첫 배포까지 (2026)`;

export const metadata: Metadata = {
  title,
  description: MANUAL_DESCRIPTION,
  keywords: ['바이브코딩', '바이브코딩 시작하기', '바이브코딩 매뉴얼', 'vibe coding', 'AI 코딩 입문', '코딩 몰라도 웹사이트 만들기', 'git 설치', 'vercel 배포', 'claude code', 'cursor 대신'],
  alternates: { canonical: MANUAL_PATH },
  openGraph: { title, description: MANUAL_DESCRIPTION, url: MANUAL_PATH, type: 'article', siteName: SITE_NAME, locale: 'ko_KR' },
};

export default function ManualHubPage() {
  const docs = getManualDocs();
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      description: MANUAL_DESCRIPTION,
      inLanguage: 'ko-KR',
      dateModified: MANUAL_UPDATED,
      author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      mainEntityOfPage: `${SITE_URL}${MANUAL_PATH}`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: MANUAL_TITLE,
      itemListElement: docs.map((d, i) => ({ '@type': 'ListItem', position: i + 1, name: d.seo.title, url: `${SITE_URL}${MANUAL_PATH}/${d.slug}` })),
    },
  ];

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="text-3xl font-bold leading-tight md:text-4xl">{MANUAL_TITLE}</h1>
      <p className="mt-2 text-sm text-muted-foreground">설치부터 첫 배포까지 · {MANUAL_UPDATED} 기준</p>
      <p className="mt-6 rounded-lg border-l-4 border-primary bg-primary/5 px-4 py-3 text-[15px] leading-7">
        바이브코딩은 코드를 직접 짜는 대신 AI에게 말로 요청해 서비스를 만드는 방식입니다. 시작하려면 ① PC에 Git·Node.js·VS Code를 설치하고 PowerShell PATH를 설정한 뒤,
        ② Claude·ChatGPT Codex·Antigravity 중 AI 코딩 도구를 하나 고르고, ③ GitHub·Vercel·Firebase에 가입한 다음,
        ④ 프로젝트마다 리포지토리·DB·환경변수를 만들어 Vercel로 배포하면 됩니다. 처음 한 번은 1시간 정도 걸립니다.
      </p>

      {COLUMNS.map((col) => (
        <section key={col.id} className="mt-10">
          <h2 className="text-xl font-bold"><span className="text-primary">{col.step}단계</span> {col.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{col.desc}</p>
          <ul className="mt-3 divide-y rounded-xl border">
            {docs.filter((d) => d.step.id === col.id).map((d) => (
              <li key={d.slug}>
                <Link href={`${MANUAL_PATH}/${d.slug}`} className="block px-4 py-3 hover:bg-muted/50">
                  <span className="font-semibold">{d.seo.title}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{d.seo.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="mt-12">
        <ManualFullCollapsible docs={docs} />
      </div>
    </article>
  );
}
