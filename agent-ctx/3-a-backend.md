# Task 3-a — Backend agent work record

## Files owned & created
- `src/lib/server/` — ai.ts, credits.ts, game-template.ts, handler.ts, runners.ts, serialize.ts
- `src/app/api/**` — 45 route files (full list in worklog.md)

## Server libraries
| File | Purpose |
|---|---|
| `handler.ts` | `ok(data)` / `fail(err)` envelope helpers, `readJson`, HttpError→status mapping, other errors→500 Korean message, P2025→404 |
| `ai.ts` | `chatText`, `chatJson<T>` (strips ```json fences, brace-slice fallback, throws on parse fail), `generateImage` (3 attempts / 2 retries, sizes 1024x1024 / 1344x768 / 768x1344). Singleton ZAI.create(). |
| `credits.ts` | `chargeCredits` (atomic tx, throws "크레딧이 부족합니다" 400), `refundCredits` (reason 'refund' positive + increment), `addCredits`, `getBalance`. Credits row upserted on the fly. |
| `serialize.ts` | All DTO mappers. Batched social counts via `vote/comment.groupBy` (`loadSocial`), prompt fork/artifact counts (`loadPromptExtras`), `serializeArtifact/Prompt/PromptDetail/Comment/Module/Event/Job/Run/SmokeTest/Brief/Bid`, `serializeAdminUsers`, `toModerationItem`. Dates→ISO, JSON string columns parsed. |
| `game-template.ts` | Reads `public/games/space-shooter.template.html`, replaces {{TITLE}}/{{PALETTE}}/{{SPEED}}, writes `public/uploads/games/{runId}/index.html`, `gameCoverUrl()` with existsSync fallback. |
| `runners.ts` | Fire-and-forget: `processGenerationJobs` (lab), `startPipelineRun` → 5 pipeline runners (3d/shortform/detailpage/game/copy), `scheduleSmokeTestCompletion` (4s setTimeout). All failures → run/job failed + Korean error + credit refund. |

## Verified end-to-end (live curl against dev server)
- login/logout/session, modules, artifacts feed+mine+401s, artifact detail views increment, patch/delete, vote toggle (unique targetType_targetId_userId), comment/comments, report→admin overview→hide/dismiss/restore, prompts create/fork/detail/versions (forkCount updates), ranking, search (URL-encoded ko), credits + purchase validation, providers, pipelines, **lab/generate real image job done → public/uploads/gen/{jobId}.png + draft artifact**, improve-prompt (real LLM), **pipeline-copy run done (LLM Korean copy)**, **pipeline-game run done (LLM palette/speed → HTML bundle written, placeholders replaced)**, smoke-test create→admin approve→completed in ~4s with LLM insights + metrics (budget/1.2 formula), revenue overview/connect, marketplace list/listings, briefs LLM create→submit→admin approve→bid→match (contract milestones from spec), admin modules PATCH (feed excludes artifacts of disabled modules — verified), admin users PATCH, upload (type/size validation), events.
- `bun run lint` clean; `tsc --noEmit` clean for src/app/api + src/lib/server.

## Deviations from contract (for orchestrator review)
1. Smoke-test metrics follow the task-prompt formulas (impressions=budget/1.2, clicks=3.1%, signups=22% of clicks, conversions=13%, cac=budget/conversions) — CONTRACTS §7 said impressions=budget/1200; task prompt overrode. successScore = clamp(60..92, 60+ctr*10). Daily series = sinusoidal + rising trend, sum≈clicks.
2. Game artifact `fileUrl` = `/uploads/seed/thumb-space-shooter.png` with an existsSync fallback to `/uploads/seed/thumb-cyberpunk.png` (seed regenerates the file; fallback avoids broken images before seed).
3. Contract milestones = 4 items mixing spec.features[0..1] and spec.pages[0] + a fixed "검수·배포·정산" item.
4. `GET /api/pipeline-runs/[id]` is public read (contract silent); `GET /api/smoke-tests/[id]` also public read.
5. Events logged beyond contract: `user.joined`, `prompt.forked`, `problem_brief.created/submitted/approved/rejected`, `brief_bid.created`, `listing.created`, `content.reported`, `moderation.action`, `smoke_test.requested/approved`, `module.updated`.
6. DELETE artifact does FK-safe cascade cleanup (nulls gen-job/run references, deletes listing/campaigns/smoke tests/shares/votes/comments).
7. Prompt detail hides `hidden` prompts from non-owners; hides other users' draft artifacts in the detail artifact list.
