import {
  landingHandler,
  landingService,
  landingUser,
  mutationOrigin,
} from "@/modules/landing-pages/server";
export const runtime = "nodejs";
export async function GET(req: Request) {
  return landingHandler(async () => {
    const user = await landingUser(),
      service = await landingService(req);
    return {
      pages: await service.list(user.id),
      localTest:
        process.env.NODE_ENV === "development" &&
        process.env.LANDING_LOCAL_TEST_MODE === "1",
    };
  });
}
export async function POST(req: Request) {
  return landingHandler(async () => {
    mutationOrigin(req);
    const user = await landingUser(),
      service = await landingService(req);
    return service.begin(user.id, await req.json());
  }, 201);
}
