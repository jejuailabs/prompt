import { requireUser } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { loadMotionLibrary } from '@/lib/server/motion-library';

export async function GET() {
  try {
    await requireUser();
    const { storage, motions } = await loadMotionLibrary();
    const items = await Promise.all(motions.map(async motion => {
      const thumbnail = motion.thumbnail ? await storage.createSignedUrl(motion.thumbnail, 900) : null;
      // Never return the raw source FBX URL to the browser.
      return { id: motion.id, name: motion.name, category: motion.category, thumbnailUrl: thumbnail?.data?.signedUrl };
    }));
    return ok(items);
  } catch (error) { return fail(error); }
}
