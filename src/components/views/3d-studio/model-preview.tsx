'use client';

import { createElement, useEffect, useState } from 'react';

export function ModelPreview({ src }: { src: string }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    import('@google/model-viewer').then(() => { if (active) setReady(true); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);
  if (failed) return <p className="p-6">3D 뷰어를 불러오지 못했습니다. 아래 GLB 다운로드를 이용해주세요.</p>;
  if (!ready) return <p className="p-6" role="status">3D 뷰어를 불러오는 중…</p>;
  return createElement('model-viewer', {
    src, alt: '생성된 3D 에셋', 'camera-controls': true,
    'shadow-intensity': '1', 'touch-action': 'pan-y',
    style: { width: '100%', height: '400px' },
  });
}
