// GET /api/modules — ALL modules (client filters by enabled)
import { supaAdmin } from '@/lib/supabase/admin';
import { fail, ok } from '@/lib/server/handler';
import type { ModuleDTO } from '@/lib/types';

export async function GET() {
  try {
    const { data, error } = await supaAdmin
      .from('Module')
      .select('*')
      .order('navOrder', { ascending: true });

    if (error) throw new Error(error.message);

    const modules: ModuleDTO[] = (data ?? []).map((m: Record<string, unknown>) => ({
      id: m.id as string,
      phase: m.phase as number,
      titleKo: m.titleKo as string,
      titleEn: m.titleEn as string,
      descKo: m.descKo as string,
      descEn: m.descEn as string,
      icon: m.icon as string,
      navOrder: m.navOrder as number,
      enabled: m.enabled as boolean,
      status: m.status as ModuleDTO['status'],
      newUntil: m.newUntil ? new Date(m.newUntil as string).toISOString() : null,
      mainScreenSlot: (m.mainScreenSlot as string) ?? '',
      entryView: (m.entryView as string) ?? '',
      requiresAuth: m.requiresAuth as boolean,
      adminOnly: m.adminOnly as boolean,
      group: (m.navGroup as string) ?? undefined,
    }));

    return ok(modules);
  } catch (e) {
    return fail(e);
  }
}
