// llms.txt — a plain-text map of the site for AI search engines (GEO).
import { MANUAL_DESCRIPTION, MANUAL_PATH, MANUAL_TITLE, getManualDocs } from '@/components/views/vibe-setup/manual';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

export function GET() {
  const docs = getManualDocs();
  const lines = [
    '# PLAYLAB',
    '',
    '> 아이디어 구상부터 프롬프트 실험, AI 파이프라인, 배포와 수익화까지 바이브코딩 전 과정을 돕는 AI 네이티브 플랫폼.',
    '',
    `## ${MANUAL_TITLE}`,
    '',
    MANUAL_DESCRIPTION,
    '',
    `- [${MANUAL_TITLE} (전체 목차)](${SITE_URL}${MANUAL_PATH}): 설치부터 첫 배포까지 4단계`,
    ...docs.map((d) => `- [${d.seo.title}](${SITE_URL}${MANUAL_PATH}/${d.slug}): ${d.seo.answer}`),
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
