// POST /api/auth/logout — signs out via Supabase Auth
import { createClient } from '@/lib/supabase/server';
import { fail, ok } from '@/lib/server/handler';

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return ok(null);
  } catch (e) {
    return fail(e);
  }
}
