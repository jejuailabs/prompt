'use client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
export function CancelVideo({ projectId }: { projectId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const qc = useQueryClient();
  return <div onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}><Button variant="destructive" size="sm" disabled={busy} onClick={async () => {
    setBusy(true); setMessage('');
    try {
      const result = await api.post<{ status: string }>(`/api/video-studio/projects/${projectId}/render/cancel`, {});
      setMessage(result.status === 'CANCELLED' ? '생성이 중지되었습니다.' : '중지 요청을 보냈습니다. 서버 상태를 확인 중입니다.');
      await qc.invalidateQueries({ queryKey: ['video-studio-render-status', projectId] });
    } catch (error) { setMessage(error instanceof Error ? error.message : '중지 요청 실패'); }
    finally { setBusy(false); }
  }}>{busy ? '중지 요청 중…' : '생성 중지'}</Button>{message && <p role="status" className="mt-2 text-xs">{message}</p>}</div>;
}
