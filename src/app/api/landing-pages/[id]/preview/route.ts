import {
  landingHandler,
  landingService,
  landingUser,
  mutationOrigin,
} from "@/modules/landing-pages/server";
type Params = { params: Promise<{ id: string }> };
export async function POST(req: Request, { params }: Params) {
  return landingHandler(async () => {
    mutationOrigin(req);
    const u = await landingUser(),
      { id } = await params,
      s = await landingService(req);
    return s.open(u.id, id);
  });
}
export async function DELETE(req: Request, { params }: Params) {
  return landingHandler(async () => {
    mutationOrigin(req);
    const u = await landingUser(),
      { id } = await params,
      s = await landingService(req),
      b = await req.json();
    await s.close(u.id, id, b.sessionId);
    return null;
  });
}
