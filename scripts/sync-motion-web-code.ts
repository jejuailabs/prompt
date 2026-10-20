import { copyFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

// Publishes the No Remotion scene code and the Motion Lite runtime as copyable text files,
// so the motion library can show exactly the code that runs in the player.
const from = 'src/modules/motion-library/no-remotion';
const to = 'public/motion-library/web';
rmSync(to, { recursive: true, force: true });
mkdirSync(to, { recursive: true });
copyFileSync(join(from, 'runtime.tsx'), join(to, 'runtime.tsx'));
for (const file of readdirSync(join(from, 'scenes'))) if (/^[\w-]+\.tsx$/.test(file)) copyFileSync(join(from, 'scenes', file), join(to, file));
