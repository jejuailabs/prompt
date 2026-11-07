// Local run of the daily 깃허브 픽 collector. Default is a dry-run (reads RSS/GitHub, calls SocialKit + AI, writes nothing).
//   node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/github-pick-dry-run.ts 3
// Add a second argument `live` to really publish (writes to the DB in .env.local).
import { runGithubPick } from '../src/modules/github-pick/run';

const perDay = Number(process.argv[2]) || 3;
runGithubPick({ dryRun: process.argv[3] !== 'live', perDay }).then((report) => {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}).catch((error) => { console.error(error); process.exit(1); });
