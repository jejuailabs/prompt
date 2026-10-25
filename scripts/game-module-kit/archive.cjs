// Archive existing, verified package files without regenerating game-specific presentation.
const fs = require('node:fs'), path = require('node:path'), { zipSync } = require('fflate');
const ids = process.argv.slice(2);
if (!ids.length) throw new Error('Pass the game IDs to archive.');
fs.mkdirSync('exports/games', { recursive: true });
for (const id of ids) {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error('Invalid game ID');
  const dir = path.resolve('public/games', id);
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'game.manifest.json')));
  const bundle = {};
  for (const file of manifest.files) {
    const target = path.resolve(dir, file);
    if (!target.startsWith(dir + path.sep)) throw new Error('Invalid package file');
    bundle[`${id}/${file}`] = new Uint8Array(fs.readFileSync(target));
  }
  fs.writeFileSync(`exports/games/${id}-${manifest.version}.zip`, zipSync(bundle, { level: 6 }));
  console.log(`Archived ${id} ${manifest.version}`);
}
