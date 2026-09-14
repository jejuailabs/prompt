// GET /api/game-room/proxy?url=... — proxy game HTML with correct content-type
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  try {
    const isRelative = url.startsWith('/');
    let fetchUrl = url;
    if (isRelative) {
      const origin = req.nextUrl.origin;
      fetchUrl = `${origin}${url}`;
    } else {
      const parsed = new URL(url);
      const allowed = [
        'supabase.co',
        'vercel.app',
        'netlify.app',
        'pages.dev',
        'github.io',
        'localhost',
      ];
      const isAllowed = allowed.some((d) => parsed.hostname.endsWith(d)) || parsed.protocol === 'https:';
      if (!isAllowed) return NextResponse.json({ error: 'Blocked origin' }, { status: 403 });
    }

    const res = await fetch(fetchUrl, { headers: { Accept: 'text/html' } });
    if (!res.ok) return NextResponse.json({ error: `Upstream ${res.status}` }, { status: 502 });

    const html = await res.text();
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'X-Frame-Options': 'SAMEORIGIN',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch game' }, { status: 502 });
  }
}
