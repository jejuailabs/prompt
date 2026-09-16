'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { H3_PRESETS, type H3Preset } from '@/lib/h3-presets';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import type { ArtifactDTO } from '@/lib/types';

export function H3Tests() {
  const [preset, setPreset] = useState<H3Preset>('turbo8');
  const [gpu, setGpu] = useState<'5090' | 'blackwell'>('5090');
  const [speed, setSpeed] = useState<H3Preset>('turbo8');
  const [quality, setQuality] = useState<H3Preset>('standard20');
  const [prompt, setPrompt] = useState('해 질 무렵 바닷가를 천천히 걷는 사람. 카메라는 직선으로 전진한다. 음성 없음.');
  const [preview, setPreview] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { api.get<{speed: H3Preset; quality: H3Preset; gpu: '5090' | 'blackwell'}>('/api/admin/h3-presets').then(c => { setSpeed(c.speed); setQuality(c.quality); setGpu(c.gpu); setLoaded(true); }).catch(e => setMessage(String(e))); }, []);
  async function run() {
    setBusy(true); setMessage('요청 접수 중…');
    try {
      const project = await api.post<ArtifactDTO>('/api/video-studio/projects', { prompt, engine: 'h3', inputMode: 'text', targetDurationSec: 6, aspectRatio: '16:9', quality: 'standard', preview });
      await api.post(`/api/video-studio/projects/${project.id}/render`, { h3Preset: preset, h3Gpu: gpu, seed: 12345 });
      useAppStore.getState().navigate('video-studio', { studio: 'workspace', project: project.id });
    } catch (e) { setMessage(String(e)); } finally { setBusy(false); }
  }
  return <section className="mb-6 space-y-4 rounded-xl border p-5">
    <h2 className="font-semibold">H3 프리셋 테스트</h2>
    <div className="flex flex-wrap gap-2">{(Object.keys(H3_PRESETS) as H3Preset[]).map(p => <Button key={p} disabled={busy} variant={preset === p ? 'default' : 'outline'} onClick={() => setPreset(p)}>{H3_PRESETS[p].label}</Button>)}</div>
    <textarea aria-label="테스트 프롬프트" className="w-full rounded border bg-background p-3" value={prompt} onChange={e => setPrompt(e.target.value)} />
    <select aria-label="테스트 GPU 및 운영 GPU" value={gpu} onChange={e => setGpu(e.target.value as typeof gpu)} className="rounded border bg-background p-2"><option value="5090">RTX 5090</option><option value="blackwell">Blackwell 6000 · 96GB</option></select>
    <label className="ml-3"><input type="checkbox" checked={preview} onChange={e => setPreview(e.target.checked)} /> 저해상도 프롬프트 테스트</label>
    <p className="text-sm text-muted-foreground">6초 · 16:9 · 고정 시드 12345 · {preview ? '576×320 / 40' : '832×480 / 80'} 크레딧. 버튼을 누를 때만 1회 생성하며, 작업실에서 진행 확인·중지가 가능합니다.</p>
    <Button disabled={busy || !loaded || prompt.trim().length < 3} onClick={() => void run()}>{busy ? '접수 중…' : '선택 설정으로 테스트 생성'}</Button>
    <div className="flex flex-wrap items-center gap-3 border-t pt-4">{([['속도형', speed, setSpeed], ['완성형', quality, setQuality]] as const).map(([label, value, setter]) => <label key={label}>{label} <select className="rounded border bg-background p-2" value={value} onChange={e => setter(e.target.value as H3Preset)}>{Object.entries(H3_PRESETS).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}</select></label>)}
      <Button variant="outline" disabled={busy || !loaded} onClick={async () => { setBusy(true); try { await api.patch('/api/admin/h3-presets', { speed, quality, gpu }); setMessage('새 요청부터 적용됩니다. 기존 작업 설정은 유지됩니다.'); } catch(e) { setMessage(String(e)); } finally { setBusy(false); } }}>사용자 프리셋 적용</Button>
    </div><p role="status" className="text-sm">{message}</p>
  </section>;
}
