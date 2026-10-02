import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MANUAL_PATH, MANUAL_TITLE, MANUAL_UPDATED, getManualDoc, getManualDocs } from '@/components/views/vibe-setup/manual';
import { ManualDocBody, docFaq } from '@/components/views/vibe-setup/manual-content';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return getManualDocs().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const doc = getManualDoc(slug);
  if (!doc) return {};
  const url = `${MANUAL_PATH}/${slug}`;
  return {
    title: `${doc.seo.title} | ${MANUAL_TITLE}`,
    description: doc.seo.description,
    keywords: [...doc.seo.keywords, '바이브코딩'],
    alternates: { canonical: url },
    openGraph: { title: doc.seo.title, description: doc.seo.description, url, type: 'article', siteName: SITE_NAME, locale: 'ko_KR' },
  };
}

export default async function ManualDocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getManualDoc(slug);
  if (!doc) notFound();
  const docs = getManualDocs();
  const idx = docs.findIndex((d) => d.slug === slug);
  const prev = docs[idx - 1];
  const next = docs[idx + 1];
  const url = `${SITE_URL}${MANUAL_PATH}/${slug}`;
  const faq = docFaq(doc);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: doc.seo.title,
      description: doc.seo.description,
      inLanguage: 'ko-KR',
      dateModified: MANUAL_UPDATED,
      timeRequired: `PT${doc.item.minutes}M`,
      keywords: doc.seo.keywords.join(', '),
      author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      mainEntityOfPage: url,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: MANUAL_TITLE, item: `${SITE_URL}${MANUAL_PATH}` },
        { '@type': 'ListItem', position: 3, name: doc.seo.title, item: url },
      ],
    },
    ...(faq.length > 0 ? [{
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    }] : []),
  ];

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="breadcrumb" className="mb-4 text-sm text-muted-foreground">
        <Link href={MANUAL_PATH} className="hover:underline">{MANUAL_TITLE}</Link> › {doc.step.step}단계 {doc.step.title}
      </nav>
      <h1 className="text-3xl font-bold leading-tight">{doc.seo.title}</h1>
      <p className="mb-6 mt-2 text-sm text-muted-foreground">{doc.item.summary} · 약 {doc.item.minutes}분 · {MANUAL_UPDATED} 기준</p>

      <ManualDocBody doc={doc} />

      <a href="/#vibe-setup" className="mt-8 block rounded-xl border-2 border-primary/40 bg-primary/5 p-4 text-sm hover:bg-primary/10">
        <strong>화면을 보면서 따라 하고 싶다면?</strong> PLAYLAB의 바이브코딩 시작하기에서 단계별 모션 가이드와 복사 버튼으로 진행할 수 있어요 →
      </a>

      <nav className="mt-8 grid gap-3 sm:grid-cols-2" aria-label="이전/다음 문서">
        {prev ? <Link href={`${MANUAL_PATH}/${prev.slug}`} className="rounded-xl border p-3 text-sm hover:bg-muted/50"><span className="text-muted-foreground">← 이전</span><br /><strong>{prev.seo.title}</strong></Link> : <span />}
        {next && <Link href={`${MANUAL_PATH}/${next.slug}`} className="rounded-xl border p-3 text-right text-sm hover:bg-muted/50"><span className="text-muted-foreground">다음 →</span><br /><strong>{next.seo.title}</strong></Link>}
      </nav>
    </article>
  );
}
