import "server-only";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { LandingService } from "./service";
import { LandingError } from "./errors";
import { localMode, readTestSession } from "./local-auth";
export async function landingUser() {
  if (localMode()) {
    const h = await headers(),
      u = readTestSession(h.get("cookie") || "");
    if (!u) throw new LandingError("로그인이 필요합니다.", 401);
    return u;
  }
  return requireUser();
}
export async function landingService(request: Request) {
  const config = {
    appOrigin:
      process.env.LANDING_APP_ORIGIN ||
      process.env.NEXT_PUBLIC_APP_URL ||
      new URL(request.url).origin,
    previewOrigin: process.env.LANDING_PREVIEW_ORIGIN || "",
    secret: process.env.LANDING_PREVIEW_SECRET || "",
  };
  if (process.env.NODE_ENV === "development" && localMode()) {
    const { localRepository, localStorage } = await import("./local");
    return new LandingService(localRepository, localStorage, config);
  }
  const { repository, storage } = await import("./adapters");
  return new LandingService(repository, storage, config);
}
export function mutationOrigin(request: Request) {
  const actual = request.headers.get("origin"),
    expected =
      process.env.LANDING_APP_ORIGIN ||
      process.env.NEXT_PUBLIC_APP_URL ||
      new URL(request.url).origin;
  if (actual !== new URL(expected).origin)
    throw new LandingError("허용되지 않은 요청 출처입니다.", 403);
}
export async function landingHandler(
  run: () => Promise<unknown>,
  status = 200,
) {
  try {
    return Response.json(
      { ok: true, data: await run() },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    if (e instanceof LandingError || typeof (e as any)?.status === "number")
      return Response.json(
        { ok: false, error: (e as Error).message },
        { status: (e as any).status, headers: { "Cache-Control": "no-store" } },
      );
    console.error(
      "[landing-pages] operation failed:",
      e instanceof Error ? e.name : "Unknown",
    );
    return Response.json(
      { ok: false, error: "랜딩페이지 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
