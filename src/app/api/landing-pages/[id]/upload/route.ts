import {
  landingHandler,
  landingService,
  landingUser,
  mutationOrigin,
} from "@/modules/landing-pages/server";
type Params = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(req: Request, { params }: Params) {
  return landingHandler(async () => {
    mutationOrigin(req);
    const u = await landingUser(),
      { id } = await params,
      s = await landingService(req);
    return s.begin(u.id, { ...(await req.json()), id });
  }, 201);
}
export async function PUT(req: Request, { params }: Params) {
  return landingHandler(async () => {
    mutationOrigin(req);
    const u = await landingUser(),
      { id } = await params,
      s = await landingService(req),
      b = await req.json();
    return s.complete(u.id, id, b.versionId);
  });
}
export async function DELETE(req: Request, { params }: Params) {
  return landingHandler(async () => {
    mutationOrigin(req);
    const u = await landingUser(),
      { id } = await params,
      s = await landingService(req),
      b = await req.json();
    await s.cancel(u.id, id, b.versionId);
    return null;
  });
}
