import {
  landingHandler,
  landingService,
  landingUser,
  mutationOrigin,
} from "@/modules/landing-pages/server";
type Params = { params: Promise<{ id: string }> };
export async function PATCH(req: Request, { params }: Params) {
  return landingHandler(async () => {
    mutationOrigin(req);
    const user = await landingUser(),
      { id } = await params,
      service = await landingService(req);
    return service.edit(user.id, id, await req.json());
  });
}
export async function DELETE(req: Request, { params }: Params) {
  return landingHandler(async () => {
    mutationOrigin(req);
    const user = await landingUser(),
      { id } = await params,
      service = await landingService(req);
    await service.remove(user.id, id);
    return null;
  });
}
