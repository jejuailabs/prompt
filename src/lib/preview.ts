import { NextRequest, NextResponse } from 'next/server';
import artifacts from '../../preview/artifacts.json';
import prompts from '../../preview/prompts.json';
import modules from '../../preview/modules.json';
import { LITTLE_WORLDS, getLocalLittleWorld } from '@/lib/little-worlds';
import { AI_EVENTS } from '@/modules/ai-events/catalogue';
import { MODULE_CONFIGS } from './registry/module-configs';
import { artifactThumbnail } from './artifact-media';
import { academyPreview, academyLibraryPreview } from '@/modules/academy/preview';

function previewGame(game: (typeof artifacts.data)[number]) {
  return {
    id: game.id,
    title: game.title,
    description: game.description,
    contentUrl: game.contentUrl,
    fileUrl: artifactThumbnail({ ...game, type: 'game' }),
    ownerId: game.ownerId,
    ownerName: game.owner.username,
    playCount: game.metadata.stats?.plays ?? 0,
    likeCount: game.likeCount,
    likedByMe: false,
    topPlayers: [],
    createdAt: game.createdAt,
    metadata: game.metadata,
    previewMode: true,
  };
}

/** Explicit development-only, read-only snapshots. Never impersonates an account. */
export function previewResponse(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (!path.startsWith('/api/')) return NextResponse.next();
  const ok = (data: unknown) => NextResponse.json({ ok: true, data });
  if (request.method !== 'GET') return NextResponse.json({ ok: false, error: '디자인 미리보기에서는 저장·생성을 실행하지 않습니다.' }, { status: 503 });
  if (path === '/api/auth/session') return ok(null);
  if (path === '/api/ai-events') return ok(AI_EVENTS);
  if (path === '/api/academy/library') return ok(academyLibraryPreview);
  if (path === '/api/academy/playlists') return ok(academyPreview);
  if (path === '/api/ranking') return ok({
    prompts: [...prompts.data].filter(p => p.status === 'active').sort((a, b) => b.likeCount - a.likeCount).slice(0, 5),
    artifacts: [...artifacts.data].filter(a => a.status === 'published' && a.visibility === 'public').sort((a, b) => b.likeCount - a.likeCount).slice(0, 5),
  });
  if (path === '/api/game-room/leaderboard') {
    // The public snapshot has games, but does not contain player score records.
    return ok({ rankings: [], period: request.nextUrl.searchParams.get('period') || 'today' });
  }
  if (path === '/api/game-room' || /^\/api\/game-room\/[^/]+$/.test(path)) {
    const games = artifacts.data.filter(game => game.type === 'game' && game.status === 'published' && game.visibility === 'public');
    if (path === '/api/game-room') {
      if (request.nextUrl.searchParams.get('scope') === 'pending') return NextResponse.json({ ok: false, error: '관리자 로그인이 필요합니다.' }, { status: 401 });
      const recent = request.nextUrl.searchParams.get('sort') === 'recent';
      games.sort((a, b) => recent ? b.createdAt.localeCompare(a.createdAt) : b.likeCount - a.likeCount || b.createdAt.localeCompare(a.createdAt));
      const limit = Math.max(1, Math.min(50, Number(request.nextUrl.searchParams.get('limit')) || 24));
      return ok({ games: [...games.slice(0, limit).map(previewGame), ...LITTLE_WORLDS.filter(item=>!games.some(game=>game.contentUrl===item.contentUrl)).map(item=>({...getLocalLittleWorld('builtin-'+item.slug)!,ownerId:'',createdAt:'2026-10-07T00:00:00.000Z',metadata:{controls:item.controls},topPlayers:[],previewMode:true}))] });
    }
    const game = games.find(item => item.id === path.split('/')[3]);
    const shipped=getLocalLittleWorld(path.split('/')[3]);
    return game ? ok(previewGame(game)) : shipped ? ok({...shipped,previewMode:true}) : NextResponse.json({ ok: false, error: '게임을 찾을 수 없습니다.' }, { status: 404 });
  }
  if (path === '/api/modules') {
    const current = new Map(modules.data.map(m => [m.id, m]));
    return ok(MODULE_CONFIGS.map(m => m.id === 'academy' ? { ...m, newUntil: null } : current.get(m.id) ?? { ...m, newUntil: null }).concat(modules.data.filter(m => !MODULE_CONFIGS.some(seed => seed.id === m.id))));
  }
  if (path === '/api/artifacts') {
    const q = (request.nextUrl.searchParams.get('q') || '').toLowerCase();
    const type = request.nextUrl.searchParams.get('type');
    const scope = request.nextUrl.searchParams.get('scope');
    if (scope === 'mine' || scope === 'drafts') return ok([]);
    const list = artifacts.data.filter(a => a.status === 'published' && a.visibility === 'public' && (!type || a.type === type) && (a.title + a.description).toLowerCase().includes(q));
    if (request.nextUrl.searchParams.get('sort') === 'new') list.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    if (request.nextUrl.searchParams.get('sort') === 'popular') list.sort((a,b) => b.likeCount - a.likeCount);
    return ok(list);
  }
  if (path.startsWith('/api/artifacts/')) {
    const item = artifacts.data.find(a => a.id === path.split('/')[3]);
    return item ? ok(item) : NextResponse.json({ ok: false, error: '미리보기에 없는 작품입니다.' }, { status: 404 });
  }
  if (path === '/api/prompts') {
    const q = (request.nextUrl.searchParams.get('q') || '').toLowerCase(), category = request.nextUrl.searchParams.get('category');
    const list = prompts.data.filter(p => p.status === 'active' && (!category || p.category === category) && (p.title + p.body).toLowerCase().includes(q));
    const sort = request.nextUrl.searchParams.get('sort');
    list.sort((a, b) => sort === 'popular' ? b.likeCount - a.likeCount : sort === 'forked' ? b.forkCount - a.forkCount : b.createdAt.localeCompare(a.createdAt));
    return ok(list);
  }
  if (path === '/api/prompts/trees') {
    type PreviewPrompt = (typeof prompts.data)[number];
    type PreviewNode = PreviewPrompt & { ownerName: string; ownerAvatar: string | null; children: PreviewNode[] };
    const nodes = new Map<string, PreviewNode>();
    for (const prompt of prompts.data) nodes.set(prompt.id, {
      ...prompt,
      ownerName: prompt.owner?.username ?? '',
      ownerAvatar: prompt.owner?.avatarUrl ?? null,
      children: [],
    });
    const roots: PreviewNode[] = [];
    for (const node of nodes.values()) {
      const parent = node.forkedFromId ? nodes.get(node.forkedFromId) : null;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    return ok(roots);
  }
  if (/^\/api\/prompts\/[^/]+$/.test(path)) {
    const prompt = prompts.data.find(p => p.id === path.split('/')[3] && p.status === 'active');
    if (!prompt) return NextResponse.json({ ok: false, error: '프롬프트를 찾을 수 없습니다.' }, { status: 404 });
    const parent = prompts.data.find(p => p.id === prompt.forkedFromId);
    return ok({ ...prompt, versions: [], forkParent: parent ? { id: parent.id, title: parent.title } : null,
      artifacts: artifacts.data.filter(a => a.sourcePromptId === prompt.id && a.status === 'published' && a.visibility === 'public') });
  }
  if (path === '/api/comments' || path === '/api/events' || path === '/api/providers') return ok([]);
  return NextResponse.json({ ok: false, error: '이 기능은 운영 환경 연결 후 사용할 수 있습니다.' }, { status: 503 });
}
