'use client';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';
import { looksLikeFbx, motionCategories } from '@/lib/motion-upload';
import { Button } from '@/components/ui/button';

type State = 'waiting' | 'hashing' | 'uploading' | 'verifying' | 'done' | 'failed';
type Item = { id: string; file: File; state: State; error?: string };
interface Ticket { complete: boolean; uploaded?: boolean; bucket: string; path: string; token: string; }
const labels: Record<State, string> = { waiting: '대기', hashing: '파일 확인', uploading: '업로드 중', verifying: '검증·등록 중', done: '등록 완료', failed: '실패' };

export function MotionUpload() {
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [category, setCategory] = useState<(typeof motionCategories)[number]>('Other');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const stop = useRef(false);
  const running = useRef(false);
  const alive = useRef(true);
  const queries = useQueryClient();
  useEffect(() => {
    alive.current = true;
    const warn = (e: BeforeUnloadEvent) => { if (running.current) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => { alive.current = false; stop.current = true; window.removeEventListener('beforeunload', warn); };
  }, []);
  const update = (id: string, state: State, error?: string) => {
    if (alive.current) setItems(rows => rows.map(row => row.id === id ? { ...row, state, error } : row));
  };
  const run = async () => {
    if (running.current) return;
    running.current = true; stop.current = false; setBusy(true); setMessage('');
    const queue = items.filter(item => item.state === 'waiting' || item.state === 'failed');
    let cursor = 0;
    const worker = async () => {
      while (!stop.current && cursor < queue.length) {
        const item = queue[cursor++];
        try {
          if (!/\.fbx$/i.test(item.file.name) || item.file.size < 24 || item.file.size > 28_000_000) throw new Error('FBX만 가능하며 파일당 28MB 이하여야 합니다.');
          update(item.id, 'hashing');
          const bytes = await item.file.arrayBuffer();
          if (!looksLikeFbx(new Uint8Array(bytes))) throw new Error('FBX 파일 형식이 아닙니다.');
          const digest = await crypto.subtle.digest('SHA-256', bytes);
          const hash = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
          const ticket = await api.post<Ticket>('/api/admin/motions/upload', { hash, name: item.file.name, size: item.file.size, category });
          if (!ticket.complete) {
            if (!ticket.uploaded) {
              update(item.id, 'uploading');
              const result = await createClient().storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, item.file, { contentType: 'application/octet-stream' });
              if (result.error) throw new Error(result.error.message);
            }
            update(item.id, 'verifying');
            await api.patch('/api/admin/motions/upload', { hash });
          }
          update(item.id, 'done');
        } catch (e) { update(item.id, 'failed', e instanceof Error ? e.message : String(e)); }
      }
    };
    try { await Promise.all([worker(), worker(), worker()]); }
    finally {
      running.current = false;
      if (alive.current) { setBusy(false); setMessage(stop.current ? '대기열을 멈췄습니다. 진행 중이던 파일은 처리했습니다.' : '일괄 처리가 끝났습니다. 실패 항목은 다시 시도할 수 있습니다.'); }
      await queries.invalidateQueries({ queryKey: ['character-motions'] });
    }
  };
  const done = items.filter(i => i.state === 'done').length;
  const failed = items.filter(i => i.state === 'failed').length;
  return <div className="space-y-4 rounded-xl border p-5">
    <h2 className="text-lg font-semibold">애니메이션 일괄 업로드</h2>
    <p className="text-sm text-muted-foreground">Mixamo FBX를 최대 1,000개 선택하세요. 3개씩 전송하며 파일당 28MB까지 지원합니다. 카테고리는 이번 대기 파일에 공통 적용됩니다. 같은 파일은 중복 등록하지 않습니다.</p>
    <p className="text-sm text-muted-foreground">원본은 비공개로 저장됩니다. 등록 완료는 업로드 검증 완료이며 리깅·모션 적용 성공을 뜻하지는 않습니다.</p>
    <input ref={input} type="file" accept=".fbx" multiple hidden onChange={e => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 1000) { setMessage('한 번에 최대 1,000개를 선택해주세요.'); return; }
      setItems(files.map(file => ({ id: crypto.randomUUID(), file, state: 'waiting' }))); setMessage(''); e.target.value = '';
    }} />
    <div className="flex flex-wrap items-center gap-3">
      <Button disabled={busy} onClick={() => input.current?.click()}>애니메이션 파일 선택 (여러 개)</Button>
      <label className="text-sm">카테고리 <select className="rounded border p-2" disabled={busy} value={category} onChange={e => setCategory(e.target.value as typeof category)}>{motionCategories.map(c => <option key={c}>{c}</option>)}</select></label>
      <Button disabled={busy || !items.some(i => i.state === 'waiting' || i.state === 'failed')} onClick={run}>{failed ? '대기·실패 파일 업로드' : '일괄 업로드 시작'}</Button>
      {busy && <Button variant="outline" onClick={() => { stop.current = true; setMessage('현재 전송 중인 파일을 마친 뒤 멈춥니다.'); }}>대기열 중지</Button>}
    </div>
    {!!items.length && <><progress className="w-full" max={items.length} value={done + failed} aria-label="일괄 업로드 진행률" /><p aria-live="polite">전체 {items.length}개 · 완료 {done}개 · 실패 {failed}개 · 미완료 {items.length - done - failed}개</p></>}
    {message && <p role="status" className="text-sm">{message}</p>}
    <div className="max-h-96 overflow-auto">{items.map(item => <div key={item.id} className="flex flex-wrap justify-between gap-2 border-b py-2 text-sm"><span className="break-all">{item.file.name} ({(item.file.size / 1_000_000).toFixed(1)}MB)</span><span>{labels[item.state]}</span>{item.error && <p className="w-full text-destructive">{item.error}</p>}</div>)}</div>
    <p className="text-xs text-muted-foreground">업로드 중에는 이 화면을 열어두세요. 새로고침했다면 같은 파일을 다시 선택하면 됩니다. 이미 등록된 파일은 건너뜁니다. 재시도해도 첫 등록의 이름·카테고리는 유지합니다.</p>
  </div>;
}
