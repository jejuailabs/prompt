import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TOOL_SEO, type ToolSlug } from '@/lib/tool-seo';

const base = process.env.NEXT_PUBLIC_APP_URL || 'https://prompt-two-theta.vercel.app';
export function generateStaticParams() { return Object.keys(TOOL_SEO).map((slug) => ({ slug })); }
export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const tool = TOOL_SEO[params.slug as ToolSlug]; if (!tool) return {};
  return { title: `${tool.title} | PLAYLAB`, description: tool.description, alternates: { canonical: `${base}/tools/${params.slug}` }, openGraph: { title: `${tool.title} | PLAYLAB`, description: tool.description, url: `${base}/tools/${params.slug}`, type: 'website' } };
}
export default function ToolSeoPage({ params }: { params: { slug: string } }) {
  const tool = TOOL_SEO[params.slug as ToolSlug]; if (!tool) notFound();
  const faqJson = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: tool.faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
  return <main className="mx-auto max-w-4xl px-5 py-16"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJson) }} /><p className="text-sm font-semibold text-primary">PLAYLAB AI TOOLS</p><h1 className="mt-3 text-4xl font-bold tracking-tight">{tool.title}</h1><p className="mt-5 text-lg leading-8 text-muted-foreground">{tool.description}</p><Link href={`/#${tool.view}?id=${tool.pipeline}`} className="mt-8 inline-flex rounded-md bg-primary px-5 py-3 font-medium text-primary-foreground">{tool.title} 시작하기</Link><section className="mt-16"><h2 className="text-2xl font-bold">사용 방법</h2><ol className="mt-5 space-y-4">{tool.steps.map((step, i) => <li key={step} className="rounded-lg border p-4"><b className="mr-2 text-primary">{i + 1}.</b>{step}</li>)}</ol></section><section className="mt-16"><h2 className="text-2xl font-bold">자주 묻는 질문</h2><div className="mt-5 space-y-3">{tool.faqs.map(([q, a]) => <article key={q} className="rounded-lg border p-5"><h3 className="font-semibold">{q}</h3><p className="mt-2 text-muted-foreground">{a}</p></article>)}</div></section></main>;
}
