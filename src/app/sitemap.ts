import type { MetadataRoute } from 'next';
import { TOOL_SEO } from '@/lib/tool-seo';
export default function sitemap(): MetadataRoute.Sitemap { const base = process.env.NEXT_PUBLIC_APP_URL || 'https://prompt-two-theta.vercel.app'; return [{ url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 }, ...Object.keys(TOOL_SEO).map((slug) => ({ url: `${base}/tools/${slug}`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.8 }))]; }
