import type { Metadata } from 'next';
import { ClassBoard } from '@/modules/class-studio/class-board';

export const metadata: Metadata = { title: 'COAI 수업 · 전시 보드', robots: { index: false, follow: false } };

export default async function ClassBoardPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <ClassBoard code={code.toUpperCase()} />;
}
