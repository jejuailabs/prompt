// Quick action bar config (docs/09 §3-3) — driven by module/pipeline registry
export interface QuickAction {
  key: string;
  icon: string;
  ko: string;
  en: string;
  kind: 'dialog' | 'view';
  view?: string;
  params?: Record<string, string>;
}

export const QUICK_ACTIONS: QuickAction[] = [
  { key: 'prompt', icon: 'pen-line', ko: '프롬프트 작성', en: 'New Prompt', kind: 'dialog' },
  { key: 'lab', icon: 'flask-conical', ko: '모델 실험', en: 'Model Lab', kind: 'view', view: 'lab' },
  { key: 'p3d', icon: 'box', ko: '3D 에셋 생성', en: '3D Asset', kind: 'view', view: 'pipeline-run', params: { id: 'pipeline-3d' } },
  { key: 'shortform', icon: 'clapperboard', ko: '숏폼 영상', en: 'Shortform', kind: 'view', view: 'pipeline-run', params: { id: 'pipeline-shortform' } },
  { key: 'detailpage', icon: 'layout-panel-left', ko: '상세페이지 제작', en: 'Detail Page', kind: 'view', view: 'pipeline-run', params: { id: 'pipeline-detailpage' } },
  { key: 'game', icon: 'gamepad-2', ko: '게임 만들기', en: 'Make a Game', kind: 'view', view: 'pipeline-run', params: { id: 'pipeline-game' } },
];
