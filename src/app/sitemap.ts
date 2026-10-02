import type { MetadataRoute } from 'next';
import { TOOL_SEO } from '@/lib/tool-seo';
import { MANUAL_PATH, MANUAL_UPDATED, getManualDocs } from '@/components/views/vibe-setup/manual';
import { SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const manualDate = new Date(MANUAL_UPDATED);
  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}${MANUAL_PATH}`, lastModified: manualDate, changeFrequency: 'monthly', priority: 0.9 },
    ...getManualDocs().map((d) => ({ url: `${SITE_URL}${MANUAL_PATH}/${d.slug}`, lastModified: manualDate, changeFrequency: 'monthly' as const, priority: 0.8 })),
    ...Object.keys(TOOL_SEO).map((slug) => ({ url: `${SITE_URL}/tools/${slug}`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.6 })),
  ];
}
