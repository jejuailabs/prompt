import { fail,ok } from '@/lib/server/handler';
import { getAcademyLibrary } from '@/lib/server/academy-library';
export async function GET() {
  try { return ok(await getAcademyLibrary()); } catch(e) { return fail(e); }
}
