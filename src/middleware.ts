import { NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const preview = process.env.LANDING_PREVIEW_ORIGIN;
  const previewPath = request.nextUrl.pathname.startsWith('/landing-preview/');
  const previewHost = preview && request.headers.get('host') === new URL(preview).host;
  if (previewHost) return previewPath ? NextResponse.next() : new NextResponse('미리보기 출처에서는 앱에 접근할 수 없습니다.', {status:403,headers:{'Timing-Allow-Origin':'*','Access-Control-Allow-Origin':'*'}});
  if (/^\/_next\/(?:static|image)(?:\/|$)|^\/favicon\.ico$|\.(?:svg|png|jpg|jpeg|gif|webp)$/i.test(request.nextUrl.pathname) && !previewPath) return NextResponse.next();
  if (previewPath) return new NextResponse('분리된 미리보기 출처가 필요합니다.', {status:403});
  // Shipped Godot HTML/JS/WASM/PCK is public static content with no auth dependency.
  if (request.nextUrl.pathname.startsWith('/games/endless-ward/')) return NextResponse.next();
  if(process.env.NODE_ENV==='development' && process.env.LANDING_LOCAL_TEST_MODE==='1' && (request.nextUrl.pathname.startsWith('/api/landing-pages') || request.nextUrl.pathname==='/api/auth/session')) return NextResponse.next();
  if (process.env.NODE_ENV === 'development' && process.env.PLAYLAB_DESIGN_PREVIEW === '1') {
    const { previewResponse } = await import('@/lib/preview');
    return previewResponse(request);
  }
  // This header is overwritten at the edge; callers cannot widen a MCP key's scope.
  const path = request.nextUrl.pathname;
  const allowed = (request.method === 'POST' && [
    '/api/video-studio/projects', '/api/3d-studio/projects', '/api/tools/ace-music', '/api/upload',
  ].includes(path)) ||
    (request.method === 'POST' && /^\/api\/video-studio\/projects\/[\w-]+\/render$/.test(path)) ||
    (request.method === 'GET' && (path === '/api/tools/ace-music' ||
      /^\/api\/video-studio\/projects\/[\w-]+\/render\/status$/.test(path) ||
      /^\/api\/3d-studio\/projects\/[\w-]+$/.test(path)));
  request.headers.set('x-playlab-mcp-allowed', allowed ? '1' : '0');
  return await updateSession(request);
}

export const config = { matcher: ['/:path*'] };
