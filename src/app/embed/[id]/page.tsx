import type { Metadata } from 'next';
import { ArtifactEmbed } from '@/components/experience/artifact-embed';

export const metadata: Metadata = { title: 'COAI · 작품 퍼가기', robots: { index: false, follow: true } };

export default async function EmbedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ArtifactEmbed key={id} id={id} />;
}
