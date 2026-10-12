import { landingService } from "@/modules/landing-pages/server";
import { LandingError } from "@/modules/landing-pages/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const u = new URL(req.url),
      expected = process.env.LANDING_PREVIEW_ORIGIN;
    if (!expected || req.headers.get("host") !== new URL(expected).host)
      throw new LandingError(
        "분리된 미리보기 출처에서만 사용할 수 있습니다.",
        403,
      );
    const parts = u.pathname.slice("/landing-preview/".length).split("/"),
      token = parts.shift()!,
      logical = parts.map(decodeURIComponent).join("/"),
      result = await (
        await landingService(req)
      ).serve(
        token,
        logical,
        new URL(expected).origin,
        req.headers.get("range"),
      );
    return new Response(new Uint8Array(result.body), {
      status: result.status,
      headers: result.headers,
    });
  } catch (e) {
    const status = e instanceof LandingError ? e.status : 500;
    return new Response(
      e instanceof LandingError
        ? e.message
        : "미리보기 파일을 제공하지 못했습니다.",
      {
        status,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "default-src 'none'; sandbox",
          "Referrer-Policy": "no-referrer",
          "Access-Control-Allow-Origin": "*",
          "Timing-Allow-Origin": "*",
        },
      },
    );
  }
}
