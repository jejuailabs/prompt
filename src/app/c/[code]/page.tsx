import type { Metadata, Viewport } from 'next';
import { ClassRoom } from '@/modules/class-studio/class-room';

export const metadata: Metadata = { title: 'COAI 수업 · 이미지 만들기', robots: { index: false, follow: false } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', interactiveWidget: 'resizes-content' };

export default async function ClassRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <ClassRoom code={code.toUpperCase()} />;
}
