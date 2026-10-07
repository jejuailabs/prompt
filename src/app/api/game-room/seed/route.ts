import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { LITTLE_WORLDS } from '@/lib/little-worlds';
import { BUNDLED_ARCADE_GAMES } from '@/lib/bundled-arcade-games';

const GAMES = [...LITTLE_WORLDS, ...BUNDLED_ARCADE_GAMES];

export async function POST() {
  try {
    await requireAdmin();

    const admin = await db.profile.findFirst({ where: { role: 'admin' } });
    if (!admin) return fail(new Error('No admin user found'));

    const created: Array<{ id: string; title: string; status: string }> = [];
    for (const game of GAMES) {
      const exists = await db.artifact.findFirst({
        where: { title: game.title, type: 'game', sourceModule: 'game-room' },
      });
      if (exists) {
        let existingMeta: Record<string, unknown> = {};
        try { existingMeta = JSON.parse(exists.metadata); } catch {}
        const updatedMeta = { ...existingMeta, params: { ...((existingMeta.params as Record<string, unknown>) || {}), palette: game.palette }, emoji: game.emoji };
        await db.artifact.update({ where: { id: exists.id }, data: { metadata: JSON.stringify(updatedMeta) } });
        created.push({ id: exists.id, title: game.title, status: 'updated' });
        continue;
      }

      const artifact = await db.artifact.create({
        data: {
          ownerId: admin.id,
          type: 'game',
          title: game.title,
          description: game.description,
          contentUrl: game.contentUrl,
          fileUrl: game.fileUrl,
          sourceModule: 'game-room',
          status: 'published',
          visibility: 'public',
          metadata: JSON.stringify({
            tags: game.tags,
            controls: game.controls,
            externalGame: false,
            moderationStatus: 'approved',
            params: { palette: game.palette },
            emoji: game.emoji,
          }),
        },
      });
      created.push({ id: artifact.id, title: game.title, status: 'created' });
    }

    return ok({ seeded: created });
  } catch (e) {
    return fail(e);
  }
}
