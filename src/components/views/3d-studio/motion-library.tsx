'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { ModelPreview } from './model-preview';
import { suggestBoneMapping } from '@/lib/asset3d-bone-mapping';

const roles = ['Hips', 'Spine', 'Head', 'LeftUpperArm', 'LeftLowerArm', 'LeftHand', 'RightUpperArm', 'RightLowerArm', 'RightHand', 'LeftUpperLeg', 'LeftLowerLeg', 'LeftFoot', 'RightUpperLeg', 'RightLowerLeg', 'RightFoot'];
const optionalRoles = new Set(['LeftHand', 'RightHand', 'LeftFoot', 'RightFoot']);
interface Motion { id: string; name: string; category: string; thumbnailUrl?: string; }
interface Result { id: string; name: string; status: string; error?: string; previewGlbUrl?: string; fbxUrl?: string; executionTimeMs?: number; }

export function MotionLibrary({ projectId, riggedGlbUrl }: { projectId: string; riggedGlbUrl?: string | null }) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [bones, setBones] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [inPlace, setInPlace] = useState(true);
  const [selected, setSelected] = useState<string>();
  const library = useQuery({ queryKey: ['character-motions'], queryFn: () => api.get<Motion[]>('/api/3d-studio/motions'), retry: false });
  const results = useQuery({ queryKey: ['character-motion-results', projectId], queryFn: () => api.get<Result[]>(`/api/3d-studio/projects/${projectId}/motions`), refetchInterval: query => query.state.data?.some(r => r.status === 'processing') ? 5000 : false });
  const hasCompletedMotion = results.data?.some((item) => item.status === 'done') ?? false;
  useEffect(() => { if (hasCompletedMotion) void queryClient.invalidateQueries({ queryKey: ['3d-project', projectId] }); }, [hasCompletedMotion, projectId, queryClient]);
  useEffect(() => {
    const controller = new AbortController();
    if (riggedGlbUrl) fetch(riggedGlbUrl, { signal: controller.signal }).then(r => {
      if (!r.ok) throw new Error('리그 파일을 읽지 못했습니다.'); return r.arrayBuffer();
    }).then(buffer => {
      const view = new DataView(buffer);
      if (view.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67) throw new Error('잘못된 GLB 파일입니다.');
      const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, view.getUint32(12, true))));
      const names: string[] = [...new Set<string>((json.skins ?? []).flatMap((skin: { joints: number[] }) => skin.joints.map(i => json.nodes[i]?.name).filter(Boolean)))];
      if (!controller.signal.aborted) {
        setBones(names);
        const suggested = suggestBoneMapping(json);
        setMapping(Object.fromEntries(roles.map(role => [role, suggested[role] ?? names.find(name => name === role) ?? ''])));
      }
    }).catch(e => { if (!controller.signal.aborted) setError(String(e)); });
    return () => controller.abort();
  }, [riggedGlbUrl]);
  const apply = async (motionId: string) => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try {
      await api.post(`/api/3d-studio/projects/${projectId}/motions`, { requestId: crypto.randomUUID(), motionId, boneMapping: Object.fromEntries(Object.entries(mapping).filter(([, bone]) => Boolean(bone))), inPlace });
      await results.refetch();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { pending.current = false; setBusy(false); }
  };
  const result = results.data?.find(r => r.id === selected) ?? results.data?.find(r => r.status === 'done');
  const active = results.data?.some(r => ['processing', 'submitting'].includes(r.status));
  const complete = roles.filter(role => !optionalRoles.has(role)).every(role => mapping[role]) &&
    new Set(Object.values(mapping).filter(Boolean)).size === Object.values(mapping).filter(Boolean).length;
  const visibleMotions = (library.data ?? []).filter(motion =>
    (category === 'All' || motion.category === category) && motion.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  return <section className="space-y-3 rounded-lg border p-4">
    <h3 className="font-semibold">애니메이션 선택·웹 검수</h3>
    <p className="text-sm text-muted-foreground">동작을 선택하면 리깅된 캐릭터에 적용합니다. 완료 후 웹에서 재생하고 Unity용 FBX·GLB를 받으세요.</p>
    {!riggedGlbUrl && <p className="text-sm">먼저 자동 리깅을 완료해주세요. 정적 메시에는 동작을 붙일 수 없습니다.</p>}
    {riggedGlbUrl && <details className="rounded border p-3">
      <summary>Humanoid 관절 매핑 · {complete ? '기본 매핑 입력 완료 (변형 검수 필요)' : '몸통·팔·다리 관절 11개 지정 필요'}</summary>
      <p className="my-2 text-xs">뼈대 구조와 좌우 위치로 매핑을 제안합니다. 결과를 확인하고 수정할 수 있습니다. 손·발 뼈가 생성되지 않았으면 비워 두세요. T/A 자세 차이는 결과로 검수해야 합니다.</p>
      <div className="grid grid-cols-2 gap-2">{roles.map(role => <label key={role} className="text-xs">{role}<select className="block w-full rounded border p-1" value={mapping[role] ?? ''} onChange={e => setMapping({ ...mapping, [role]: e.target.value })}><option value="">뼈 선택</option>{bones.map(name => <option key={name} value={name}>{name}</option>)}</select></label>)}</div>
      <label className="mt-3 block text-sm"><input type="checkbox" checked={inPlace} onChange={e => setInPlace(e.target.checked)} /> 제자리 동작 (수평 이동 제거)</label>
    </details>}
    {library.isPending && <p role="status">모션 목록 불러오는 중…</p>}
    {library.error && <p role="alert" className="text-sm">{library.error.message}</p>}
    {library.data && <>
      <div className="flex flex-wrap gap-2"><select aria-label="모션 카테고리" value={category} onChange={e => setCategory(e.target.value)} className="rounded border p-2"><option value="All">전체</option>{[...new Set(library.data.map(m => m.category))].map(c => <option key={c}>{c}</option>)}</select><input aria-label="모션 검색" value={search} onChange={event => setSearch(event.target.value)} placeholder="걷기, 대기, 춤 등 검색" className="min-w-48 rounded border p-2 text-sm" /></div>
      <p className="text-xs text-muted-foreground">검색 결과 {visibleMotions.length.toLocaleString()}개 · 한 번에 24개 표시</p>
      {!library.data.length && <p>등록된 모션이 없습니다. 실제 업로드 후 목록이 표시됩니다.</p>}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{visibleMotions.slice(0, 24).map(m => <div key={m.id} className="space-y-2 rounded border p-2">
        {m.thumbnailUrl ? <img src={m.thumbnailUrl} alt={m.name} className="aspect-video w-full object-cover" /> : <div className="flex aspect-video items-center justify-center bg-muted text-xs">{m.category}</div>}
        <p className="text-sm">{m.name}</p>
        <button type="button" className="rounded border px-2 py-1 text-sm disabled:opacity-40" disabled={!riggedGlbUrl || !complete || busy || active} onClick={() => apply(m.id)}>이 동작 적용</button>
      </div>)}</div>
    </>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {results.error && <p role="alert">{results.error.message}</p>}
    {results.data?.map(item => <div key={item.id} className="flex flex-wrap items-center gap-2 text-sm">
      <button type="button" disabled={!item.previewGlbUrl} onClick={() => setSelected(item.id)} className="underline">{item.name}</button>
      <span>{item.status === 'done' ? '검수 가능' : item.status === 'failed' ? '실패' : '모션 처리 중'}</span>
      {item.status === 'processing' && <button type="button" className="rounded border px-2" onClick={async () => {
        try { await api.del(`/api/3d-studio/projects/${projectId}/motions?job=${item.id}`); setError('중지 요청을 보냈습니다. 워커의 종료 상태를 확인 중입니다.'); await results.refetch(); }
        catch (e) { setError(e instanceof Error ? e.message : String(e)); }
      }}>생성 중지</button>}
      {item.executionTimeMs !== undefined && <span>{Math.round(item.executionTimeMs / 1000)}초</span>}
      {item.error && <span role="alert" className="text-destructive">{item.error}</span>}
    </div>)}
    {result?.previewGlbUrl && <><ModelPreview key={result.id} src={result.previewGlbUrl} /><p className="text-xs">관절 변형·발 미끄러짐을 확인하세요. Unity Humanoid 검증은 아직 별도로 필요합니다.</p><a href={result.fbxUrl} target="_blank" rel="noreferrer" className="inline-block rounded border p-2 text-sm">{result.name} · 캐릭터+동작 FBX 다운로드</a></>}
  </section>;
}
