// Server check for 번개 냥이 반응속도 records. Mirrors verifyProof in public/games/cat-reaction/rules.mjs
// (tests/cat-reaction.test.mjs keeps the two in sync). The score is 100000000 - total ms, higher is faster.
export const REACTION_GAME_SLUG = 'cat-reaction';
export const REACTION_RANKING_KEY = 'reaction-total';
const STAGE_TRIALS = [3, 3, 5];
const STAGE_MIN_WAIT_MS = [1500, 2200, 550];
const MIN_HUMAN_MS = 100, MISS_MS = 1000, PENALTY_MS = 20, MAX_FALSE_STARTS = 30, SCORE_BASE = 100000000;

export interface ReactionProof { trials: number[]; falseStarts: number }

const average = (list: number[]) => Math.round(list.reduce((a, b) => a + b, 0) / list.length);

export function reactionTotal(trials: number[], falseStarts: number) {
  let at = 0;
  const stages = STAGE_TRIALS.map((n) => { const part = trials.slice(at, at + n); at += n; return average(part); });
  return Math.round(stages.reduce((a, b) => a + b, 0) / stages.length) + falseStarts * PENALTY_MS;
}

/** Returns the reason a submitted round is rejected, or '' when it is a plausible human record. */
export function reactionProofProblem(score: number, durationMs: number, proof: unknown): string {
  if (!proof || typeof proof !== 'object') return 'proof';
  const { trials, falseStarts } = proof as Partial<ReactionProof>;
  const count = STAGE_TRIALS.reduce((a, b) => a + b, 0);
  if (!Array.isArray(trials) || trials.length !== count) return 'trials';
  if (!trials.every((t) => Number.isSafeInteger(t) && t >= MIN_HUMAN_MS && t <= MISS_MS)) return 'range';
  if (typeof falseStarts !== 'number' || !Number.isSafeInteger(falseStarts) || falseStarts < 0 || falseStarts > MAX_FALSE_STARTS) return 'false-starts';
  const hits = trials.filter((t) => t < MISS_MS);
  if (hits.length >= 4 && Math.max(...hits) - Math.min(...hits) < 4) return 'robotic';
  if (trials.filter((t) => t < 130).length > 3) return 'too-fast';
  const minWait = STAGE_TRIALS.reduce((n, trialsInStage, i) => n + trialsInStage * STAGE_MIN_WAIT_MS[i], 0);
  if (!Number.isSafeInteger(durationMs) || durationMs < minWait) return 'duration';
  if (score !== SCORE_BASE - reactionTotal(trials, falseStarts)) return 'score';
  return '';
}
