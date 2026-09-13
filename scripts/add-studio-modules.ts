/**
 * Add video-studio and 3d-studio modules to DB.
 * Run: npx tsx scripts/add-studio-modules.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const DAY = 86400000;

async function main() {
  const modules = [
    {
      id: 'video-studio', phase: 3, titleKo: 'AI 영상 스튜디오', titleEn: 'AI Video Studio',
      descKo: '원고 하나로 AI 영상을 만드세요', descEn: 'Create AI videos from a script',
      icon: 'film', navOrder: 50, enabled: true, status: 'new',
      mainScreenSlot: 'none', entryView: 'video-studio', requiresAuth: true, adminOnly: false,
      navGroup: 'studio', newUntil: new Date(Date.now() + 30 * DAY),
    },
    {
      id: '3d-studio', phase: 3, titleKo: '3D 에셋 스튜디오', titleEn: '3D Asset Studio',
      descKo: '이미지에서 3D 에셋을 생성하세요', descEn: 'Generate 3D assets from images',
      icon: 'box', navOrder: 51, enabled: true, status: 'new',
      mainScreenSlot: 'none', entryView: '3d-studio', requiresAuth: true, adminOnly: false,
      navGroup: 'studio', newUntil: new Date(Date.now() + 30 * DAY),
    },
  ];

  for (const m of modules) {
    await db.module.upsert({
      where: { id: m.id },
      create: m,
      update: { ...m },
    });
    console.log('✓', m.id);
  }

  // Disable old tool-shortform and tool-3d (replaced by studio modules)
  for (const id of ['tool-shortform', 'tool-3d']) {
    await db.module.update({ where: { id }, data: { enabled: false, status: 'preparing' } }).catch(() => {});
    console.log('✗ disabled', id);
  }

  console.log('Done.');
}

main().catch(console.error).finally(() => db.$disconnect());
