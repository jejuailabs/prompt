'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { ModelPreview } from './model-preview';
import { suggestBoneMapping } from '@/lib/asset3d-bone-mapping';

const roles = ['Hips', 'Spine', 'Head', 'LeftUpperArm', 'LeftLowerArm', 'LeftHand', 'RightUpperArm', 'RightLowerArm', 'RightHand', 'LeftUpperLeg', 'LeftLowerLeg', 'LeftFoot', 'RightUpperLeg', 'RightLowerLeg', 'RightFoot'];
const optionalRoles = new Set(['LeftHand', 'RightHand', 'LeftFoot', 'RightFoot']);
const pageSize = 12;
const recommendations = [{ category: 'Idle', label: '1. 대기', help: '가만히 있을 때' }, { category: 'Walk', label: '2. 걷기', help: '이동할 때' }, { category: 'Run', label: '3. 달리기', help: '빠르게 이동할 때' }];
interface Motion { id: string; name: string; category: string; thumbnailUrl?: string; }
interface Result { id: string; motionId?: string; name: string; status: string; error?: string; previewGlbUrl?: string; fbxUrl?: string; executionTimeMs?: number; boneMapping?: Record<string, string>; inPlace?: boolean; }

export function MotionLibrary({ projectId, riggedGlbUrl, onContinue }: { projectId: string; riggedGlbUrl?: string | null; onContinue?: () => void }) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [bones, setBones] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const restored = useRef(false);
  const [inPlace, setInPlace] = useState(true);
  const [selected, setSelected] = useState<string>();
  const library = useQuery({ queryKey: ['character-motions'], queryFn: () => api.get<Motion[]>('/api/3d-studio/motions'), retry: false });
  const results = useQuery({ queryKey: ['character-motion-results', projectId], queryFn: () => api.get<Result[]>(`/api/3d-studio/projects/${projectId}/motions`), refetchInterval: query => query.state.data?.some(r => r.status === 'processing') ? 5000 : false });
  const hasCompletedMotion = results.data?.some((item) => item.status === 'done') ?? false;
  const completed = results.data?.filter(item => item.status === 'done') ?? [];
  useEffect(() => { if (hasCompletedMotion) void queryClient.invalidateQueries({ queryKey: ['3d-project', projectId] }); }, [hasCompletedMotion, projectId, queryClient]);
  useEffect(() => {
    const controller = new AbortController();
    restored.current = false;
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
  useEffect(() => {
    if (restored.current || !bones.length) return;
    const saved = results.data?.find(item => item.status === 'done' && item.boneMapping);
    if (!saved?.boneMapping || !roles.filter(role => !optionalRoles.has(role)).every(role => saved.boneMapping?.[role] && bones.includes(saved.boneMapping[role]))) return;
    const savedMapping = saved.boneMapping;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled || restored.current) return;
      restored.current = true;
      setMapping(Object.fromEntries(roles.map(role => [role, bones.includes(savedMapping[role] ?? '') ? savedMapping[role] : ''])));
      setInPlace(saved.inPlace ?? true);
    });
    return () => { cancelled = true; };
  }, [bones, results.data]);
  const apply = async (motionId: string) => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try {
      await api.post(`/api/3d-studio/projects/${projectId}/motions`, { requestId: crypto.randomUUID(), motionId, boneMapping: Object.fromEntries(Object.entries(mapping).filter(([, bone]) => Boolean(bone))), inPlace });
      await results.refetch();
      document.getElementById('motion-progress')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { pending.current = false; setBusy(false); }
  };
  const result = completed.find(r => r.id === selected) ?? completed[0];
  const active = results.data?.some(r => ['processing', 'submitting'].includes(r.status));
  const complete = roles.filter(role => !optionalRoles.has(role)).every(role => mapping[role]) &&
    new Set(Object.values(mapping).filter(Boolean)).size === Object.values(mapping).filter(Boolean).length;
  const visibleMotions = (library.data ?? []).filter(motion =>
    (category === 'All' || motion.category === category) && motion.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  return <section className="space-y-5 rounded-xl border p-4 sm:p-5">
    <div><h3 className="text-lg font-semibold">애니메이션 추가</h3><p className="mt-1 text-sm text-muted-foreground">대기·걷기·달리기를 각각 추가하면 Unity에서 상황에 맞게 사용할 수 있습니다. 하나만 먼저 만들어도 다음 단계로 갈 수 있습니다.</p></div>

    <div id="motion-progress" className="rounded-lg border bg-muted/30 p-4" role="status">
      <p className="font-medium">현재 적용된 동작 {completed.length}개</p>
      <p className="mt-1 text-sm text-muted-foreground">{active ? '새 동작을 만드는 중입니다. 완료되면 여기서 재생해 확인하세요.' : completed.length ? '아래에서 다른 동작을 더 고르거나 Unity 파일로 진행하세요.' : '먼저 관절을 확인하고 동작 하나를 고르세요.'}</p>
      {results.data?.filter(item => item.status !== 'done').map(item => <div key={item.id} className="mt-2 rounded border bg-background p-2 text-sm">
        <span className="font-medium">{item.name}</span> · {item.status === 'failed' ? '실패' : '처리 중'}
        {item.error && <p role="alert" className="text-destructive">{item.error}</p>}
        {item.status === 'processing' && <button type="button" className="ml-3 underline" onClick={async () => {
          try { await api.del(`/api/3d-studio/projects/${projectId}/motions?job=${item.id}`); setError('중지 요청을 보냈습니다. 종료 상태를 확인 중입니다.'); await results.refetch(); }
          catch (e) { setError(e instanceof Error ? e.message : String(e)); }
        }}>생성 중지</button>}
      </div>)}
      {!!completed.length && <div className="mt-3 flex flex-wrap gap-2">{completed.map(item => <button key={item.id} type="button" onClick={() => setSelected(item.id)} className={`rounded-md border px-3 py-2 text-sm ${result?.id === item.id ? 'border-primary bg-primary/10 font-medium' : 'bg-background'}`} aria-pressed={result?.id === item.id}>{item.name} 재생</button>)}</div>}
      {!!completed.length && <div className="mt-4 flex flex-wrap gap-2"><button type="button" className="rounded-md border bg-background px-3 py-2 text-sm" onClick={() => document.getElementById('motion-catalog')?.scrollIntoView({ behavior: 'smooth' })}>+ 다른 동작 추가</button>{result?.motionId && <button type="button" className="rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-40" disabled={!complete || busy || active} onClick={() => apply(result.motionId!)}>이 동작 다시 만들기</button>}{onContinue && <button type="button" className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" onClick={onContinue}>Unity 파일로 진행 →</button>}</div>}
    </div>

    {result?.previewGlbUrl && <div className="rounded-lg border p-3"><h4 className="mb-2 font-medium">{result.name} · 웹에서 확인</h4><ModelPreview key={result.id} src={result.previewGlbUrl} /><p className="mt-2 text-xs text-muted-foreground">재생되는지 확인하고, 팔·다리 변형과 발 미끄러짐을 살펴보세요. Unity Humanoid 적용은 Unity에서 별도 확인이 필요합니다.</p>{result.fbxUrl && <a href={result.fbxUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block rounded border px-3 py-2 text-sm">{result.name} FBX 다운로드</a>}</div>}

    {!riggedGlbUrl && <p className="text-sm">먼저 자동 리깅을 완료해주세요. 정적 메시에는 동작을 붙일 수 없습니다.</p>}
    {riggedGlbUrl && <details className="rounded-lg border p-3" open={complete ? undefined : true}>
      <summary className="cursor-pointer font-medium">1. 관절 확인 · {complete ? '준비 완료' : `필수 ${roles.filter(role => !optionalRoles.has(role) && mapping[role]).length}/11개 선택`}</summary>
      <p className="my-2 text-sm text-muted-foreground">처음 한 번만 확인하면 다음 동작에도 같은 관절을 사용합니다. 손·발이 없으면 비워 두세요. 자동 제안이 없을 때는 아래 목록에서 직접 지정해야 합니다.</p>
      <div className="grid gap-2 sm:grid-cols-2">{roles.map(role => <label key={role} className="text-xs">{role} {optionalRoles.has(role) ? '(선택)' : '(필수)'}<select className="mt-1 block w-full rounded border bg-background p-2 text-sm" value={mapping[role] ?? ''} onChange={e => setMapping({ ...mapping, [role]: e.target.value })}><option value="">뼈 선택</option>{bones.map(name => <option key={name} value={name}>{name}</option>)}</select></label>)}</div>
      <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={inPlace} onChange={e => setInPlace(e.target.checked)} /> 제자리 동작 (게임에서 이동은 Unity가 제어)</label>
      {!complete && <p className="mt-2 text-sm text-amber-700">필수 관절 11개를 서로 다른 뼈로 지정해야 동작을 적용할 수 있습니다.</p>}
    </details>}

    <div id="motion-catalog" className="space-y-3 scroll-mt-4">
      <div><h4 className="font-medium">2. 추가할 동작 고르기</h4><p className="text-sm text-muted-foreground">처음에는 대기 → 걷기 → 달리기 순서를 추천합니다. 필요한 동작만 선택하세요. 일반 계정은 캐릭터당 최대 3개까지 추가할 수 있습니다.</p></div>
      <div className="grid gap-2 sm:grid-cols-3">{recommendations.map(item => <button key={item.category} type="button" onClick={() => { setCategory(item.category); setSearch(''); setPage(0); }} className={`rounded-lg border p-3 text-left text-sm ${category === item.category ? 'border-primary bg-primary/10' : ''}`}><strong className="block">{item.label}</strong><span className="text-muted-foreground">{item.help}</span></button>)}</div>
      {library.isPending && <p role="status">동작 목록 불러오는 중…</p>}
      {library.error && <p role="alert" className="text-sm">{library.error.message}</p>}
      {library.data && <>
        <div className="flex flex-wrap gap-2"><select aria-label="동작 종류" value={category} onChange={e => { setCategory(e.target.value); setPage(0); }} className="rounded border bg-background p-2 text-sm"><option value="All">모든 동작</option>{[...new Set(library.data.map(m => m.category))].map(c => <option key={c} value={c}>{c}</option>)}</select><input aria-label="동작 이름 검색" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} placeholder="동작 이름 검색 (예: Walk)" className="min-w-48 rounded border bg-background p-2 text-sm" /></div>
        <p className="text-xs text-muted-foreground">검색 결과 {visibleMotions.length.toLocaleString()}개 · {visibleMotions.length ? `${page + 1}/${Math.ceil(visibleMotions.length / pageSize)} 페이지` : '조건에 맞는 동작 없음'}</p>
        {!library.data.length && <p>등록된 동작이 없습니다.</p>}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">{visibleMotions.slice(page * pageSize, (page + 1) * pageSize).map(motion => {
          const alreadyAdded = completed.some(item => item.motionId === motion.id);
          return <div key={motion.id} className="space-y-2 rounded-lg border p-2">
            {motion.thumbnailUrl ? <img src={motion.thumbnailUrl} alt="" className="aspect-video w-full rounded object-cover" /> : <div className="flex aspect-video items-center justify-center rounded bg-muted text-xs">{motion.category}</div>}
            <p className="min-h-10 text-sm font-medium">{motion.name}</p>
            <button type="button" className="w-full rounded border px-2 py-2 text-sm disabled:opacity-40" disabled={!riggedGlbUrl || !complete || busy || active || alreadyAdded} onClick={() => apply(motion.id)}>{alreadyAdded ? '추가 완료' : busy ? '요청 중…' : active ? '이전 동작 처리 중' : '이 동작 추가'}</button>
          </div>;
        })}</div>
        {visibleMotions.length > pageSize && <div className="flex items-center justify-center gap-3"><button type="button" className="rounded border px-3 py-2 text-sm disabled:opacity-40" disabled={page === 0} onClick={() => setPage(page - 1)}>이전</button><span className="text-sm">{page + 1} / {Math.ceil(visibleMotions.length / pageSize)}</span><button type="button" className="rounded border px-3 py-2 text-sm disabled:opacity-40" disabled={(page + 1) * pageSize >= visibleMotions.length} onClick={() => setPage(page + 1)}>다음</button></div>}
      </>}
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {results.error && <p role="alert">{results.error.message}</p>}
  </section>;
}
