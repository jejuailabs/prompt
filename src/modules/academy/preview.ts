import type { AcademyPlaylistDTO } from '@/lib/types';

// Design-only curriculum. No real video, author or provider analysis is fabricated.
export const academyPreview: AcademyPlaylistDTO[] = [{
  id: 'curriculum-preview', title: '아이디어에서 첫 웹사이트까지',
  description: '준비하고, 만들고, 다듬고, 공개하기. 하나의 결과물을 완성하는 순서로 배우는 바이브코딩 입문 과정.',
  sortOrder: 0, isExample: true,
  videos: [
    ['만들고 싶은 것을 구체화하기', '아이디어를 한 문장으로 정리하고 첫 작업의 범위를 정해요.', '만들고 싶은 서비스의 사용자와 필요한 기능을 정리해보세요.'],
    ['작업 환경과 첫 프로젝트', '도구를 준비하고 내 PC에서 첫 페이지를 열어요.', '설치할 도구를 확인하고 프로젝트 폴더를 준비해보세요.'],
    ['프롬프트로 화면 다듬기', '원하는 화면을 설명하고 결과를 확인하며 개선해요.', '화면의 목적, 구성, 동작을 나눠 요청문을 작성해보세요.'],
    ['테스트하고 세상에 공개하기', '클릭과 모바일 화면을 점검하고 다른 사람과 공유해요.', '주요 버튼과 화면 이동을 직접 확인하는 체크리스트를 만들어보세요.'],
  ].map(([title, description, exercise], index) => ({
    id: `preview-lesson-${index + 1}`, videoId: '', title, description, sortOrder: index,
    sampleNote: `## 이번 차시의 학습 목표\n${description}\n\n## 직접 해보기\n${exercise}\n\n## 복습 체크\n- 배운 내용을 내 말로 설명할 수 있나요?\n- 직접 만든 결과물을 저장했나요?\n\n실제 강의를 등록하면 영상 자막을 기반으로 생성한 학습노트가 이 위치에 표시됩니다.`,
  })),
}];
