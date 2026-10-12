import { createHmac } from "node:crypto";
import { localMode } from "@/modules/landing-pages/local-auth";
import { mutationOrigin, landingHandler } from "@/modules/landing-pages/server";
import { LandingError } from "@/modules/landing-pages/errors";
export async function POST(req: Request) {
  if (!localMode())
    return Response.json(
      { ok: false, error: "사용할 수 없는 경로입니다." },
      { status: 404 },
    );
  return landingHandler(async () => {
    mutationOrigin(req);
    const body = await req.json(),
      user = body.user || "test-owner";
    if (
      !["test-owner", "test-other"].includes(user) ||
      !process.env.LANDING_LOCAL_TEST_KEY
    )
      throw new LandingError("유효하지 않은 테스트 계정입니다.");
    return {
      user,
      cookie:
        user +
        "." +
        createHmac("sha256", process.env.LANDING_LOCAL_TEST_KEY)
          .update(user)
          .digest("hex"),
    };
  }).then(async (res) => {
    if (!res.ok) return res;
    const payload = await res.json();
    const token = payload.data.cookie;
    delete payload.data.cookie;
    return Response.json(payload, {
      headers: {
        "Set-Cookie":
          "lp_test_session=" +
          token +
          "; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400",
        "Cache-Control": "no-store",
      },
    });
  });
}
