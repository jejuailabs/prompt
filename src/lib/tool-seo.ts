import { AI_STUDIO_TOOLS } from '@/lib/ai-studio-tools';

type ToolSeo = { title: string; description: string; view: string; pipeline: string; steps: string[]; faqs: [string, string][] };
const legacyTools: Record<string, ToolSeo> = {
  'shortform-video': { title: 'AI 숏폼 영상 제작 도구', description: '아이디어에서 숏폼 영상 제작까지, PLAYLAB AI 숏폼 영상 도구로 빠르게 시작하세요.', view: 'pipeline-run', pipeline: 'pipeline-shortform', steps: ['주제와 목표 시청자를 입력합니다.', '영상 구성과 생성 옵션을 선택합니다.', '생성 결과를 확인하고 프로젝트에 저장합니다.'], faqs: [['AI 숏폼 영상 도구는 무엇인가요?', '아이디어를 바탕으로 영상 제작 과정을 시작할 수 있는 PLAYLAB 도구입니다.'], ['결과물은 어디에 저장되나요?', '생성 결과는 로그인한 사용자의 프로젝트에서 다시 확인할 수 있습니다.']] },
  '3d-asset': { title: 'AI 3D 에셋 생성 도구', description: '텍스트와 이미지를 활용해 3D 에셋 제작 작업을 시작하는 PLAYLAB AI 도구입니다.', view: 'pipeline-run', pipeline: 'pipeline-3d', steps: ['에셋 콘셉트와 참고 정보를 정리합니다.', '생성 옵션을 선택해 작업을 시작합니다.', '결과물을 프로젝트에서 관리합니다.'], faqs: [['어떤 에셋을 만들 수 있나요?', '게임과 콘텐츠 제작에 활용할 수 있는 3D 에셋 작업을 지원하도록 설계되어 있습니다.'], ['준비 중인 기능도 있나요?', '관리자가 공개한 도구만 사용자 화면에 노출됩니다.']] },
  'detail-page': { title: 'AI 상세페이지 제작 도구', description: '상품 정보에서 설득력 있는 이커머스 상세페이지 제작을 시작하는 AI 도구입니다.', view: 'pipeline-run', pipeline: 'pipeline-detailpage', steps: ['상품과 고객 정보를 입력합니다.', '상세페이지 생성 작업을 시작합니다.', '생성된 콘텐츠를 검토하고 활용합니다.'], faqs: [['누구에게 유용한가요?', '쇼핑몰 운영자와 마케터가 상세페이지 제작 초안을 빠르게 만들 때 유용합니다.'], ['브랜드 톤을 반영할 수 있나요?', '브랜드 정보와 요청 사항을 프롬프트에 포함해 제작 방향을 설정할 수 있습니다.']] },
  'game-maker': { title: 'AI 게임 만들기 도구', description: '아이디어에서 웹 게임 제작까지 시작하고 PLAYLAB 게임룸에 공개할 수 있는 AI 도구입니다.', view: 'pipeline-run', pipeline: 'pipeline-game', steps: ['게임 아이디어와 핵심 규칙을 정리합니다.', '게임 생성 작업을 시작합니다.', '배포 주소를 게임룸 심사에 제출합니다.'], faqs: [['게임룸에 어떻게 공개하나요?', '배포된 HTTPS 게임 URL을 게임룸 등록 양식으로 제출하고 관리자 승인을 받습니다.'], ['외부에서 배포한 게임도 가능한가요?', 'iframe 실행이 가능한 공개 HTTPS 게임 URL이면 심사 후 등록할 수 있습니다.']] },
};

const studioTools: Record<string, ToolSeo> = Object.fromEntries(AI_STUDIO_TOOLS.map((tool) => [tool.id.replace('tool-', ''), {
  title: tool.titleKo,
  description: tool.descKo,
  view: 'ai-tools',
  pipeline: tool.id,
  steps: ['도구의 목적과 입력 정보를 확인합니다.', '필요한 내용을 입력하고 생성을 시작합니다.', '결과를 검토하고 프로젝트에 저장하거나 다운로드합니다.'],
  faqs: [['이 도구는 무엇을 하나요?', tool.descKo], ['도구를 숨길 수 있나요?', '관리자는 어드민 모듈 관리에서 해당 도구의 노출 스위치를 끌 수 있습니다.']],
}]));
export const TOOL_SEO: Record<string, ToolSeo> = { ...legacyTools, ...studioTools };
export type ToolSlug = string;
