import { writeFileSync } from 'node:fs';
import { MODULE_CONFIGS } from '../src/lib/registry/module-configs';
import { SPACE_SECTIONS, isSpaceModule, spaceEntry } from '../src/lib/site-navigation';

// The static homepage and React app share the module registry. Runtime admin
// switches override this build-time fallback through the existing modules API.
const modules = MODULE_CONFIGS.map(m => ({ ...m, newUntil: null }));
writeFileSync('public/design/streaming-v1/navigation.json', JSON.stringify({
  sections: SPACE_SECTIONS,
  entries: modules.filter(isSpaceModule).map(spaceEntry),
}, null, 2) + '\n');
