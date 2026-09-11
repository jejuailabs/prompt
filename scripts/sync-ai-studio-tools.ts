import { PrismaClient } from '@prisma/client';
import { AI_STUDIO_TOOLS } from '../src/lib/ai-studio-tools';

const prisma = new PrismaClient();
async function main() {
  for (let index = 0; index < AI_STUDIO_TOOLS.length; index++) {
    const tool = AI_STUDIO_TOOLS[index];
    await prisma.module.upsert({ where: { id: tool.id }, update: { titleKo: tool.titleKo, descKo: tool.descKo, icon: tool.icon, status: tool.status, navGroup: 'tools' }, create: { id: tool.id, phase: 3, titleKo: tool.titleKo, titleEn: tool.titleKo, descKo: tool.descKo, descEn: tool.descKo, icon: tool.icon, navOrder: 60 + index, enabled: true, status: tool.status, mainScreenSlot: 'none', entryView: 'ai-tools', requiresAuth: false, adminOnly: false, navGroup: 'tools' } });
  }
}
main().finally(() => prisma.$disconnect());
