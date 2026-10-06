import { updateSession } from '@/lib/supabase/middleware';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
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

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
