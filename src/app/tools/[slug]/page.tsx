import type { Metadata } from 'next';
import { TOOL_SEO, type ToolSlug } from '@/lib/tool-seo';
import PlaylabApp from '@/components/playlab-app';

const base = process.env.NEXT_PUBLIC_APP_URL || 'https://prompt-two-theta.vercel.app';
export function generateStaticParams() { return Object.keys(TOOL_SEO).map((slug) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tool = TOOL_SEO[slug as ToolSlug]; if (!tool) return {};
  return { title: `${tool.title} | PLAYLAB`, description: tool.description, alternates: { canonical: `${base}/tools/${slug}` }, openGraph: { title: `${tool.title} | PLAYLAB`, description: tool.description, url: `${base}/tools/${slug}`, type: 'website' } };
}
export default async function ToolSeoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!TOOL_SEO[slug as ToolSlug]) return <PlaylabApp />;
  return <PlaylabApp />;
}
