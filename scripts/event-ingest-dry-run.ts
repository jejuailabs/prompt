// Local run of the daily AI 일정 collector. Default is a dry-run (reads sources, calls the AI, writes nothing).
//   node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/event-ingest-dry-run.ts idge,ofjeju 4
// Add a third argument `live` to really publish (writes to the DB/Storage in .env.local).
import { runIngest } from '../src/modules/event-ingest/run';

const sources = process.argv[2] ? process.argv[2].split(',') : undefined;
const maxAi = Number(process.argv[3]) || 4;
runIngest({ dryRun: process.argv[4] !== 'live', sources, maxAi }).then((report) => {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}).catch((error) => { console.error(error); process.exit(1); });
