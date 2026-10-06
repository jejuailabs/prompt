'use client';

import { createContext, useContext } from 'react';

export const RuntimeContext = createContext({ previewMode: false, authConfigured: false });
export const useRuntime = () => useContext(RuntimeContext);

export function PreviewNotice() {
  const { previewMode } = useRuntime();
  if (!previewMode) return null;
  return <p role="status" className="my-5 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm leading-6">지금은 미리보기입니다. 입력 화면을 살펴볼 수 있으며, 로그인·저장·AI 생성은 운영 서비스 연결 후 사용할 수 있어요. 게임 플레이·프롬프트 복사·QR 생성·파일 변환은 바로 이용할 수 있어요.</p>;
}
