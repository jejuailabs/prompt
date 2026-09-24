// GET /api/modules — ALL modules (client filters by enabled)
import { supaAdmin } from '@/lib/supabase/admin';
import { fail, ok } from '@/lib/server/handler';
import { MODULE_CONFIGS } from '@/lib/registry/module-configs';
import type { ModuleDTO } from '@/lib/types';

export async function GET() {
  try {
    const { data, error } = await supaAdmin
      .from('Module')
      .select('*')
      .order('navOrder', { ascending: true });

    if (error) throw new Error(error.message);

    const databaseModules: ModuleDTO[] = (data ?? []).map((m: Record<string, unknown>) => ({
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

    // A newly shipped module may not yet have a row in the live registry.
    // Return the code-defined default in that case; an existing database row
    // always wins so the admin enable/disable switch remains authoritative.
    const byId = new Map(databaseModules.map((module) => [module.id, module]));
    for (const seed of MODULE_CONFIGS) {
      if (byId.has(seed.id)) continue;
      byId.set(seed.id, {
        ...seed,
        newUntil: null,
      } as ModuleDTO);
    }
    const modules = Array.from(byId.values()).sort((a, b) => a.navOrder - b.navOrder);

    return ok(modules);
  } catch (e) {
    return fail(e);
  }
}
