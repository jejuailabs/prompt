'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { H3_PRESETS, type H3Preset } from '@/lib/h3-presets';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import type { ArtifactDTO } from '@/lib/types';

export function H3Tests() {
  const [preset, setPreset] = useState<H3Preset>('turbo8');
  const [gpu, setGpu] = useState<'5090' | 'blackwell'>('blackwell');
  const [speed, setSpeed] = useState<H3Preset>('turbo8');
  const [quality, setQuality] = useState<H3Preset>('standard20');
  const [prompt, setPrompt] = useState('한여름 늦은 오후, 야외 수영장 옆 그늘. 25세 성인 여성을 어깨 위 중심으로 담은 실사 영화의 클로즈업, 6초 원테이크. 얇은 흰색 면 티셔츠를 입고 있으며 어깨와 목둘레에 물이 살짝 묻어 있다. 옷은 불투명하고 비치지 않는다. 얼굴과 목에 작은 물방울이 맺혀 있고, 젖은 머리카락 몇 가닥이 관자놀이에 붙어 있다. 자연스러운 피부 결, 미세한 솜털, 속눈썹, 눈동자의 반사광, 물방울의 선명한 하이라이트와 티셔츠 목둘레의 면 섬유가 보인다. 부드러운 측면 자연광과 은은한 역광, 배경은 수영장의 청록빛 보케. 85mm 인물 렌즈 느낌, 얕은 심도지만 양쪽 눈은 또렷하게 초점 유지. 카메라는 눈높이에서 아주 천천히 직선으로 다가간다. 인물은 편안히 숨을 쉬고 한 번 자연스럽게 눈을 깜빡인 뒤 시선을 살짝 카메라 쪽으로 옮긴다. 얼굴 형태와 물방울 위치가 시간에 따라 안정적으로 유지된다. 과도한 피부 보정, 플라스틱 피부, 인위적인 샤프닝, 깜빡임, 얼굴 변형, 화면 전환, 자막, 로고, 대사와 내레이션 없음.');
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
  async function applyTo(target: 'speed' | 'quality') {
    setBusy(true);
    try {
      // A test GPU change must not silently change the GPU of both live tiers.
      const current = await api.get<{speed: H3Preset; quality: H3Preset; gpu: '5090' | 'blackwell'}>('/api/admin/h3-presets');
      const saved = await api.patch<typeof current>('/api/admin/h3-presets', { ...current, [target]: preset });
      setSpeed(saved.speed); setQuality(saved.quality);
      setMessage(`${target === 'speed' ? '속도형' : '완성형'}에 ${H3_PRESETS[preset].label} 적용 완료. 새 요청부터 반영됩니다. 테스트 GPU·저해상도 옵션은 운영 설정을 변경하지 않습니다.`);
    } catch (e) { setMessage(String(e)); } finally { setBusy(false); }
  }
  return <section className="mb-6 space-y-4 rounded-xl border p-5">
    <h2 className="font-semibold">H3 프리셋 테스트</h2>
    <div className="flex flex-wrap gap-2">{(Object.keys(H3_PRESETS) as H3Preset[]).map(p => <Button key={p} disabled={busy} variant={preset === p ? 'default' : 'outline'} onClick={() => setPreset(p)}>{H3_PRESETS[p].label}</Button>)}</div>
    <textarea aria-label="테스트 프롬프트" className="w-full rounded border bg-background p-3" value={prompt} onChange={e => setPrompt(e.target.value)} />
    <select aria-label="테스트 GPU" disabled={busy} value={gpu} onChange={e => setGpu(e.target.value as typeof gpu)} className="rounded border bg-background p-2"><option value="5090">Blackwell 6000 · 기존 H3 풀</option><option value="blackwell">Blackwell 6000 · 전용 H3 풀</option></select>
    <label className="ml-3"><input type="checkbox" checked={preview} onChange={e => setPreview(e.target.checked)} /> 저해상도 프롬프트 테스트</label>
    <p className="text-sm text-muted-foreground">6초 · 16:9 · 고정 시드 12345 · {preview ? '576×320 / 40' : '832×480 / 80'} 크레딧. 버튼을 누를 때만 1회 생성하며, 작업실에서 진행 확인·중지가 가능합니다.</p>
    <Button disabled={busy || !loaded || prompt.trim().length < 3} onClick={() => void run()}>{busy ? '접수 중…' : '선택 설정으로 테스트 생성'}</Button>
    <div className="space-y-3 border-t pt-4">
      <p className="text-sm text-muted-foreground">현재 사용자 설정: {loaded ? `속도형 ${H3_PRESETS[speed].label} · 완성형 ${H3_PRESETS[quality].label}` : '불러오는 중…'}</p>
      <p className="text-sm">선택한 <strong>{H3_PRESETS[preset].label}</strong>을 사용자 설정에 적용</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy || !loaded || speed === preset} onClick={() => void applyTo('speed')}>속도형에 적용</Button>
        <Button variant="outline" disabled={busy || !loaded || quality === preset} onClick={() => void applyTo('quality')}>완성형에 적용</Button>
      </div>
    </div><p role="status" className="text-sm">{message}</p>
  </section>;
}
