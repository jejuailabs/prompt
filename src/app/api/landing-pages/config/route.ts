import { localMode } from "@/modules/landing-pages/local-auth";
export async function GET() {
  return Response.json(
    { ok: true, data: { localTest: localMode() } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
