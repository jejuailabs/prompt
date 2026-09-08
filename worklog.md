# PLAYLAB Development Worklog

> All agents MUST read this file before working, and append their section after finishing.
> Shared contracts document: `/home/z/my-project/agent-ctx/CONTRACTS.md` (MUST read too).

---
Task ID: 1
Agent: orchestrator (main)
Task: Init worklog, load AI skills, plan full-scope development of PLAYLAB (Phase 1~5)

Work Log:
- Read all 10 uploaded spec docs (CLAUDE.md + docs 01~09)
- Confirmed sandbox constraints: single visible page route `/` (SPA view-switching via zustand), Prisma+SQLite (not Supabase), NextAuth available but no OAuth keys → demo cookie auth, z-ai-web-dev-sdk backend-only
- Loaded LLM skill and image-generation skill. Confirmed SDK usage (see below)
- Created todo plan with parallel subagent tasks (3-a, 3-b, 4-a, 4-b, 4-c)

SDK usage (VERIFIED, backend only):
```ts
import ZAI from 'z-ai-web-dev-sdk';
const zai = await ZAI.create();
// LLM
const completion = await zai.chat.completions.create({
  messages: [{ role: 'assistant', content: SYSTEM }, { role: 'user', content: USER }],
  thinking: { type: 'disabled' },
});
const text = completion.choices[0]?.message?.content;
// Image generation
const res = await zai.images.generations.create({ prompt, size: '1024x1024' });
const b64 = res.data[0].base64; // Buffer.from(b64, 'base64') → write .png
// Supported sizes: 1024x1024, 768x1344, 864x1152, 1344x768, 1152x864, 1440x720, 720x1440
```

Stage Summary:
- Architecture decisions: SPA view-switching (only `/` page route allowed), cookie-based demo auth, module registry mirrored in DB `modules` table + code configs, event log for cross-module comms, IExecutionEngine (iframe-sandbox Tier1), IModelProvider adapters over z-ai SDK (per-provider style presets to simulate multi-model comparison)
- Subagent file-ownership map defined in CONTRACTS.md to avoid conflicts

---
Task ID: 3-b
Agent: shell
Task: Build app shell + all shared components per CONTRACTS §6

Work Log:
- Read worklog, CONTRACTS, types/store/quick-actions/module-configs/use-session/api-client/core i18n
- Created `layout/icon.tsx`: static map of 51 lucide icons (all registry + quick-action + shell keys), unknown name → Sparkles fallback; `layout/logo.tsx`: violet badge mark + PLAYLAB wordmark
- Created `layout/sidebar.tsx`: sticky h-screen w-60, logo, nav from useModules() (adminOnly gated on session.role==='admin'), active = entryView===view, ModuleStatusBadge per item; bottom: credits Card (balance toLocaleString + 충전 Dialog: 1000/5000/10000 → POST /api/credits/purchase → useRefreshSession + toast) and account row (Avatar initial + role label, DropdownMenu: 내 프로젝트 / 로그아웃 → POST /api/auth/logout → setSession(null) + navigate('home')); logged-out → login button → setLoginOpen(true)
- Created `layout/header.tsx`: sticky top-0 z-40 bg-background/80 backdrop-blur border-b; desktop search Input (Enter → navigate('gallery',{q})), mobile search icon → full-screen overlay; notification bell (react-query GET /api/events?limit=8 enabled-on-open, event type → icon/color map, payload title fallbacks, formatDistanceToNow w/ ko/enUS locale); theme toggle (next-themes, hydration-safe useMounted via useSyncExternalStore); account avatar dropdown (or login button); Create button → DropdownMenu of QUICK_ACTIONS (locale labels; dialog → CreatePromptDialog, view → navigate); owns its CreatePromptDialog instance
- Created `layout/mobile-tabbar.tsx`: fixed bottom, 5 cols (home/gallery/lab/pipelines/more), safe-area `pb-[env(safe-area-inset-bottom)]`, titles from module registry w/ fallback; "more" → bottom Sheet listing remaining enabled modules (+ login button when logged out)
- Rewrote `layout/app-shell.tsx`: `flex flex-1` row = Sidebar + right column (`flex min-h-screen flex-1 flex-col`: Header, main `flex-1 w-full min-w-0 pb-20 md:pb-0` with ViewRouter stub, footer `mt-auto border-t` © 2026 PLAYLAB · core.footerNote) + MobileTabbar; calls useSession() once for boot
- Created shared: `preview-renderer.tsx` (image / video kenburns slideshow 2400ms interval / 3d CSS cube w/ previewUrl faces / game+app cover with ▶+core.play chip or sandboxed iframe when `playing` / landing mini-hero / text snippet / fallback); `artifact-card.tsx` (aspect-video PreviewRenderer + category badge top-left + duration chip bottom-right + media-overlay gradient + body: title, @owner, ♥/👁, hover ring-primary/40, optional onClick — pure, no default nav); `score-gauge.tsx` (SSR-safe SVG, stroke-muted track, emerald/amber/red by score, score/100 center + label); `stat-card.tsx` (label+icon, value, ▲▼ delta chip emerald/red, sub); `step-form.tsx` (violet numbered circles + dashed connectors, footer border-t); `empty-state.tsx`; `module-badge.tsx` (NEW violet / BETA outline / 준비 중 muted / active → null); `view-header.tsx`
- Replaced stub `shared/login-dialog.tsx` (default export, store loginOpen): brand header, username Input, core.demoAccountHint, POST /api/auth/login → setSession + useRefreshSession + toast, error toast w/ server message
- Created `shared/create-prompt-dialog.tsx`: title/body/category(이미지·영상·코딩·마케팅·게임·기타)/modelTags comma input/optional image; requireLogin guard; POST /api/prompts; file → uploadFile + POST /api/artifacts {type:'image', sourcePromptId, publish:true, sourceModule:'prompt-wiki'}; toast core.saved; invalidates prompts/artifacts/feed
- Created `shared/upload-artifact-dialog.tsx`: title, type select(image/text), description, image file input (required for image, uploaded on submit), publish Switch default on → POST /api/artifacts {sourceModule:'prompt-wiki'}; invalidates artifacts/feed/my-projects
- i18n: only core namespace keys + locale ternaries for strings missing from core (내 프로젝트/My Projects, type & category labels, top-up/empty-username strings) — did NOT edit core.ts or i18n/index.ts; no view messages created

Deviations (minor, intentional):
- ArtifactCard: title/@owner/stats live in the card body (p-4) per task spec, not inside the media overlay (CONTRACTS §6 sketch had them in overlay); overlay kept as fixed dark gradient + duration chip stays bottom-right of preview
- PreviewRenderer video branch: no duplicate duration badge (ArtifactCard owns it) to avoid double-rendering
- Video slideshow frame index not reset on artifact.id change (modulo cycle + fallback makes reset unnecessary) to satisfy react-hooks/set-state-in-effect
- Theme toggle uses useSyncExternalStore mounted-guard instead of setState-in-effect (same hydration guarantees)
- icon map = 51 icons (contract list + ellipsis/loader-circle/chevron-down for shell needs)

Stage Summary:
- Files created: layout/{icon,logo,sidebar,header,mobile-tabbar,app-shell}.tsx; shared/{preview-renderer,artifact-card,score-gauge,stat-card,step-form,empty-state,module-badge,view-header,login-dialog,create-prompt-dialog,upload-artifact-dialog}.tsx
- Exports per CONTRACTS §6: AppShell/PreviewRenderer named `PreviewRenderer`, `ArtifactCard({artifact,onClick?})`, `ScoreGauge({score,size?,label?})`, `StatCard({label,value,delta?,icon?,sub?})`, `StepForm({steps,footer?})`, `EmptyState({icon?,title,description?,action?})`, `ModuleStatusBadge({status,newUntil?})`, `ViewHeader({title,subtitle?,actions?})`, `CreatePromptDialog({open,onOpenChange})`, `UploadArtifactDialog({open,onOpenChange})`, LoginDialog default export — all with an added optional `className` where harmless
- `bun run lint` → 0 errors/warnings; `tsc --noEmit` clean for components/layout/** + components/shared/** (remaining repo errors are in other agents' files)
- Views (4-a/b/c) can now code against these contracts; orchestrator integration (ViewRouter) untouched

---
Task ID: 3-a
Agent: backend
Task: Implement ALL backend API routes per CONTRACTS.md §5 + §7 (auth, modules, artifacts, prompts, votes/comments, credits, model lab, pipelines, smoke tests, revenue, marketplace, briefs, admin, events, upload) and server libs (ai, serialize, credits, runners, game-template)

Work Log:
- Read worklog.md, CONTRACTS.md, prisma/schema.prisma, src/lib/{auth,events,types,db,api-client}.ts, seed.ts (module/provider/pipeline ids), game template, api-client envelope
- Built server libs in src/lib/server/: handler.ts (ok/fail envelope + HttpError→status, P2025→404, 500 Korean message), ai.ts (chatText/chatJson with fence stripping + generateImage with 2 retries), credits.ts (atomic chargeCredits '크레딧이 부족합니다'/refundCredits/addCredits), serialize.ts (all §4 DTO mappers; batched vote/comment groupBy → likeCount/commentCount/likedByMe; forkCount/artifactCount; JSON columns parsed; dates→ISO), game-template.ts (template fill + bundle writer), runners.ts (fire-and-forget lab job runner, 5 pipeline runners §7, smoke test completion with 4s setTimeout)
- Implemented 45 route files under src/app/api/** exactly per §5 paths (list in Stage Summary); Next 16 signature `params: Promise<{id}>` awaited everywhere
- Lab generate: charge = Σ round(costPerUnit×1.4) upfront via atomic tx, one GenerationJob per provider, async image gen (promptText + style + styleHint; aspect→size map), saves public/uploads/gen/{jobId}.png, creates draft artifact (sourceModule 'model-lab'), per-job refund on failure
- Pipeline runners: 3d (image→3d_asset previewUrl), shortform (LLM 3 scenes→3 vertical images→video frames+duration), detailpage (LLM LandingContent), game (LLM title/palette/speed → validated #hex/#a78bfa + speed 1-5 → template fill → /uploads/games/{runId}/index.html, executionTier iframe), copy (LLM 3 variants → text content); all sourceModule 'pipeline-hub', progress 30→60→90→100, refund+failed on error
- Smoke tests: POST creates requested + AdCampaign draft; admin approve → approved→running→4s→metrics(impressions=budget/1.2, clicks 3.1%, signups 22%, conversions 13%, cac, sinusoidal+rising daily) + LLM insights (canned fallback) + report + completed + adCampaign completed + event
- Briefs: LLM StructuredSpec (ko, numeric effortWeeks/suggestedBudgetKrw) + deterministic fallback; submit→admin approve/reject→bids (approved only)→match (bid accepted/others rejected, Match+Contract 70/30, 4 milestones from spec features/pages, event problem_brief.matched)
- Admin: overview (reported prompts+artifacts sorted by reportCount, pending smoke tests/briefs, users with counts+credits), moderate hide/dismiss/restore, modules PATCH (deploy switch; feed excludes artifacts of disabled modules), users PATCH role/banned
- Verified live: login/session/logout, feed filter on module disable/enable, views increment, vote toggle, report→moderate, prompt fork chain, lab image job done→png on disk, pipeline-copy & pipeline-game done (HTML placeholders replaced), smoke test completed with real LLM insights (score 91), briefs full flow incl. contract milestones, upload validation, 401/403 guards, credits purchase validation
- bun run lint: clean. tsc --noEmit: no errors in src/app/api/** + src/lib/server/**

Stage Summary:
- ALL §5 endpoints implemented: /api/auth/{login,logout,session}; /api/modules; /api/artifacts (GET feed|mine|drafts + POST), /api/artifacts/[id] (GET+PATCH+DELETE); /api/vote; /api/comment; /api/comments; /api/report; /api/ranking; /api/search; /api/prompts (GET all|mine + POST), /api/prompts/[id], /api/prompts/[id]/fork, /api/prompts/[id]/versions; /api/credits; /api/credits/purchase; /api/providers; /api/lab/generate; /api/lab/jobs; /api/lab/improve-prompt; /api/pipelines; /api/pipelines/[id]/run; /api/pipeline-runs; /api/pipeline-runs/[id]; /api/smoke-tests (GET+POST); /api/smoke-tests/[id]; /api/admin/smoke-tests/[id]/approve; /api/revenue; /api/revenue/connect; /api/marketplace/listings (GET+POST); /api/briefs (GET mine|open|all + POST); /api/briefs/[id]; /api/briefs/[id]/submit; /api/briefs/[id]/bids; /api/briefs/[id]/match; /api/admin/briefs/[id]/approve; /api/admin/briefs/[id]/reject; /api/admin/overview; /api/admin/moderate; /api/admin/modules; /api/admin/users; /api/events; /api/upload
- Deviations: (1) smoke metrics formulas per task prompt (budget/1.2) instead of §7 (budget/1200); successScore=clamp(60..92, 60+ctr×10); (2) game artifact fileUrl '/uploads/seed/thumb-space-shooter.png' with existsSync fallback to thumb-cyberpunk.png; (3) contract milestones mix features+pages; (4) pipeline-runs/[id] and smoke-tests/[id] GET are public; (5) extra events logged (user.joined, prompt.forked, problem_brief.*, brief_bid.created, listing.created, content.reported, moderation.action, smoke_test.*); (6) artifact DELETE cascades FK-safe cleanup; (7) prompt detail hides hidden from non-owners + hides others' drafts
- scope=mine/drafts without session → 401 '로그인이 필요합니다'; admin endpoints → 403 '관리자 권한이 필요합니다'; all responses { ok, data | error } envelope via NextResponse.json
- Full details: agent-ctx/3-a-backend.md

---
Task ID: 4-a
Agent: views-a
Task: Build 6 view components (home, gallery, prompt, my-projects, community, academy) with per-view i18n message packs

Work Log:
- Read worklog (3-a/3-b), CONTRACTS §1-§6/§8, types.ts, store.ts, api-client.ts, quick-actions.ts, use-session/use-toast, shared component sources (ArtifactCard/ViewHeader/EmptyState/CreatePromptDialog/UploadArtifactDialog actual signatures), layout/icon.tsx map, core.ts messages; verified CSS helpers (hero-glow, scrollbar-thin) and event payload shapes in backend routes before coding community feed
- home/index.tsx: hero-glow section (3-line i18n headline, core.tagline sub, CTA row → CreatePromptDialog instance + navigate('lab')), framer-motion float img /uploads/seed/hero-illustration.png + decorative blur circles; quick actions grid from QUICK_ACTIONS (dialog → open CreatePromptDialog, view → navigate with params, labels ko/en by locale); monthly usage card (GET /api/credits → used/limit + Progress + 충전 → revenue, session-gated); 오늘의 추천 feed GET /api/artifacts?scope=feed&sort=popular&limit=12 (queryKey ['feed','popular']) → ArtifactCard grid 2/3/4 → project
- gallery/index.tsx: ViewHeader + 프롬프트 작성 (CreatePromptDialog); controls row = search Input (init from store params.q, derived-state pattern so header q navigations flow through), Tabs 프롬프트/아티팩트 (init from params.tab), sort Select (new/popular/forked), 7 category chips (Korean DB values, active=secondary); local PromptCard (title/body line-clamp, category Badge + 2 model tag badges, ♥/💬/fork footer) grid 2/3; artifacts tab reuses ArtifactCard grid 2/3/4 → project; NOTE: single Tabs root wraps TabsList + both TabsContent (Radix context requirement)
- prompt/index.tsx: id-guard → EmptyState; detail GET /api/prompts/[id] (['prompt',id]) with header (title, category/model badges, Avatar+@user+date, ♥💬🔀 counts), actions: like toggle POST /api/vote (requireLogin guard; invalidates ['prompt',id]+['prompts']+['ranking']; Heart fill-current text-primary when likedByMe), fork Dialog (title default "{title} v2", body, versionNote → POST fork → toast → invalidate ['prompts'] → navigate('prompt',{id:new.id})), compare primary CTA → navigate('lab',{promptId,promptText}) (Phase1→2 funnel), report ghost Flag POST /api/report → toast; forkParent ← 원본 link; body Card whitespace-pre-wrap; 버전 히스토리 card (max-h-96 scrollbar-thin); 결과물 ArtifactCard grid; 댓글 via GET /api/comments?targetType=prompt (spec's data had no comments array) + POST /api/comment (invalidates ['comments','prompt',id] + ['prompt',id] for count) with Enter submit (isComposing-safe)
- my-projects/index.tsx: ViewHeader + 결과물 업로드 (UploadArtifactDialog); !session → EmptyState(User) + 로그인 → setLoginOpen(true); Tabs 게시됨/초안/내 프롬프트 over GET /api/artifacts?scope=mine (client status filter) + GET /api/prompts?scope=mine; draft cards get action row (게시하기 PATCH status:'published' → invalidate ['artifacts'] + toast; 삭제 DELETE → core.deleted toast, per-id pending state); prompt rows → prompt view
- community/index.tsx: lg:grid-cols-2; LEFT ranking Card (GET /api/ranking): 인기 프롬프트/결과물 TOP 5 rows with rank badge (top3 bg-primary text-primary-foreground, rest bg-primary/15) + Heart count, click → prompt/project; RIGHT 최근 활동 Card (GET /api/events?limit=15): type→icon/color/label map (Rocket/PenLine/Radar/Sparkles/Store/UserPlus/Settings/GitFork, default Zap; lucide imported directly — icon.tsx static map lacks rocket/user-plus), text = label · payload.title (falls back to label-only when payload has no title), @username only when payload provides it, date-fns formatDistanceToNow ko/enUS; list max-h-96 overflow-y-auto scrollbar-thin
- academy/index.tsx: GET /api/artifacts?moduleId=academy&sort=popular (['academy']); single md:grid-cols-2 grid — featured Card md:col-span-2 (GraduationCap in primary/15 circle, title/desc, 학습 시작 → project) + numbered lesson cards (index badge, title, desc line-clamp-2, 👁/♥ meta → project); bottom dashed-border hint card
- messages.ts per view: export default { ko, en }, every key in both locales (verified parity by script): home 10, gallery 21, prompt 23, myProjects 16, community 18, academy 7 keys
- Corrections during QA: api is a namespaced client (api.get/post/patch/del) — fixed direct api<T>() calls; added missing useToast import (prompt); removed stale eslint-disable; gallery Tabs root restructure; git-fork icon name not in static Icon map → GitFork from lucide-react

Deviations (minor, intentional):
- Community: spec's "Rocket/Handshake→Sparkles" icons are not all in the static Icon map — imported lucide icons directly in this view (same pattern ArtifactCard uses); @by shown only for events whose payload carries username (backend payloads store ownerId, not username — raw id would render as @cmf9...)
- Prompt view comments are fetched via GET /api/comments (PromptDetailDTO has no comments field); mutation invalidates both comments and ['prompt',id] so the header commentCount stays in sync
- Community/labels + all category names go through view messages; gallery sort 'forked' maps to 'popular' for the artifacts tab (backend sort only applies to prompts)
- Views wrap content in mx-auto max-w-7xl p-4/6/8 container (main in app-shell has no horizontal padding; consistent across all 6 views for orchestrator integration)
- toast error title uses server ApiError message (per §3), destructive variant; my-projects login gate renders immediately on session===null (brief boot flash possible, per spec wording)

Stage Summary:
- Files created: src/components/views/{home,gallery,prompt,my-projects,community,academy}/index.tsx + messages.ts (12 files; only my ownership folders touched)
- Message keys: home 10 · gallery 21 · prompt 23 · myProjects 16 · community 18 · academy 7 (all keys in ko+en, 190 strings total)
- bun run lint: 0 errors, 0 warnings in my files (repo-wide remaining warnings are in smoke/index.tsx owned by 4-c); tsc --noEmit clean for my 6 views
- Ready for orchestrator ViewRouter wiring: all views are default-export, no-props, 'use client' client components reading store params (id/q/tab/promptId/promptText)

---
Task ID: 4-c
Agent: views-c
Task: Build 4 view folders — smoke (list + report detail), revenue, market (listings + briefs), admin

Work Log:
- Read worklog (3-a/3-b), CONTRACTS §1-§6/§8, lib/types, lib/store, lib/api-client, shared components (real exports verified), layout/icon, ui primitives (select/tabs/table/dialog/switch/badge exports), i18n aggregator + core messages, providers wiring (NextIntlClientProvider + react-query)
- smoke/index.tsx: params.id → SmokeDetail else SmokeList. LIST: ViewHeader + '새 테스트 신청' Dialog (requireLogin; artifact Select from /api/artifacts?scope=mine filtered published client-side, budget Select ₩50,000/₩100,000/₩150,000, readonly '14일 고정' input, POST /api/smoke-tests {artifactId,budget,days:14} → toast + invalidate ['smoke']); GET ['smoke','mine'] (login-gated EmptyState), md:2 cards with artifact thumb, StatusBadge (requested outline/approved outline-emerald/running secondary/completed default), budget, date, report → mini ScoreGauge(64) + '리포트 보기' → navigate('smoke',{id}); EmptyState Radar. DETAIL: GET ['smoke',id] with refetchInterval 1500 while status!=='completed'; top row ghost back(← 목록) + outline Download PDF (window.print()); summary Card (h-16 thumb, title, v-version Badge, status Badge, 기간~완료/예산/PLAYLAB 광고 네트워크 rows, ScoreGauge + scoreLabel ≥80/≥65/≥50/else); running/approved pending banner (Loader2) ; Tabs 요약(6 StatCards Eye/MousePointerClick/Percent/UserPlus/CreditCard/Target + 핵심 인사이트 Card w/ Sparkles dot-list + link → 개선 제안) / 트래픽(LineChart daily h-300, XAxis date, YAxis w-36, visitors #8b5cf6 + signups #10b981) / 개선 제안(numbered Cards); skeleton/error/not-found states
- revenue/index.tsx: !session → EmptyState login; GET ['revenue']; 3 StatCards (이번 달/대기 정산 sub '매월 10일'/누적); Stripe Connect account Card (emerald CreditCard circle + acct••••last4 + 활성 Badge, else 연동하기 POST /api/revenue/connect + demo note); 월간 수익 추이 BarChart h-220 fill #8b5cf6 radius [6,6,0,0] Tooltip ₩; 정산 내역 Table (기간/결과물/공유율/금액/상태, settled outline-emerald / pending secondary) in max-h-96 scrollbar-thin, EmptyState
- market/index.tsx: Tabs 입점 모음집/발주 프로젝트. LISTINGS: GET ['listings'], md:2 xl:3 Cards (h-36 PreviewRenderer + title + revenueModel Badge [광고수익공유 secondary / 판매 outline+₩price / 프리미엄 outline] + @listedBy·date) → navigate('project',{id}); '내 결과물 입점하기' Dialog (published minus already-listed ids, revenueModel Select, price Input when paid, POST /api/marketplace/listings). BRIEFS: GET ['briefs','open'] + (session) ['briefs','mine'] '내 발주'; BriefCard p-5 (status Badge draft/submitted/approved-emerald/matched-violet/rejected-red, title, @author·₩budget·bidsCount ICU, features 3 chips, effortWeeks+budget, 상세 → Dialog); 2-step 새 발주 Dialog (Textarea rawText → POST /api/briefs → STEP B 'AI가 요구사항을 구조화했습니다' SpecView(title/problem/targetUsers/features·techStack·pages chips/effortWeeks/₩budget/risks) → 발주 제출 POST submit + invalidate ['briefs'] / 닫기 keeps draft); Detail Dialog GET ['brief',id]: full SpecView + matched→contract Card(70/30, milestones numbered, notes, status Badge)+winner bid; approved→bids rows(@dev, proposal, ₩price, etaDays)+bid form (proposal/price/etaDays 14, POST bids, invalidate ['brief',id]+['briefs'])+author per-bid '매칭 확정' POST match {bidId} → toast '매칭 완료 — 계약이 생성되었습니다'; requireLogin on 입찰/발주/입점
- admin/index.tsx: guard !session||role!=='admin' → EmptyState Shield (login / 홈으로); GET ['admin','overview'] (enabled admin only); Tabs 모듈 스위치/콘텐츠 심사(n)/스모크테스트 승인(n)/발주 승인(n)/사용자 with count Badges. MODULES: GET ['modules','all'] navOrder-sorted rows (Icon in bg-primary/10 h-10 w-10, locale title, P{phase} Badge + ModuleStatusBadge + entryRoute, status Select w-32 → PATCH /api/admin/modules, enabled Switch → PATCH + toast 켜짐/꺼짐 + invalidate ['modules','all'] AND ['modules'] — sidebar live switch) + 다크 런치 Info hint banner. MODERATION: reported rows (targetType Badge, title, body line-clamp-1, @owner, destructive '{n}회 신고' ICU, 숨기기 destructive/무시 outline/hidden→복원) POST /api/admin/moderate → invalidate ['admin','overview']; EmptyState CheckCircle. SMOKE: pending rows (artifact title, requester mapped via overview users[] fallback id-slice, ₩budget, date, 광고 집행 승인 → POST approve + toast + invalidate) + hint. BRIEFS: pending rows (title, @author, ₩budget, features 3 chips, 승인/거절 → invalidate). USERS: Table in max-h-96 scrollbar-thin (@username + admin Badge, 가입일, prompt/artifact counts, credits, role Select PATCH /api/admin/users, banned Switch, red-tint row)
- messages.ts × 4 (smoke/revenue/market/admin): full ko+en key parity, ICU {n} for reportCount/bidsCount; did NOT touch aggregator
- Formatting: ₩ via `₩${n.toLocaleString(locale==='en'?'en-US':'ko-KR')}`, dates toLocaleDateString(locale), semantic tokens (+emerald/red/amber status only), p-4/p-6 + gap-4/6, motion.div fade-in view shells, react-query mutations → invalidate + toast(e.message), requireLogin() guards

Stage Summary:
- Files created: components/views/{smoke,revenue,market,admin}/index.tsx (default export, no props, 'use client') + messages.ts (default export {ko,en}); no other files touched
- Query keys: smoke ['smoke','mine']/['smoke',id]; revenue ['revenue']; market ['listings']/['briefs','open']/['briefs','mine']/['brief',id]; admin ['admin','overview']/['modules','all']
- bun run lint → 0 errors 0 warnings (all files); tsc --noEmit → 0 errors in views/{smoke,revenue,market,admin}/**
- ⚠ INTEGRATION BLOCKER (orchestrator, NOT my file): src/hooks/use-session.ts line 42 calls `api<ModuleDTO[]>('/api/modules')` but api-client exports `api` as a plain object (api.get/post/patch/del) → runtime TypeError "api is not a function" crashes useModules()/sidebar. Fix: `api.get<ModuleDTO[]>('/api/modules')`. CONTRACTS §3 shows `api<T>(path)` callable — doc vs impl mismatch; all 4-c views use api.get/api.post
- ⚠ BACKEND GAP (3-a, one-line fix): GET /api/briefs/[id] serializes via serializeBrief which omits the bids array (§5 says "with bids"; only bidCount + match.bid are returned). Market detail dialog is coded defensively (BriefDetail = BriefDTO & { bids?: BidDTO[] }): if backend adds `bids: b.bids.map(serializeBid)` to serializeBrief, per-bid rows + author '매칭 확정' buttons render automatically; until then bidCount + bid form work, author matching UI needs that fix
- Deviations (minor, intentional): (1) smoke detail polls at 1500ms for any non-completed status (superset of spec's 'running' — covers brief 'approved' window); (2) smoke StatusBadge adds 'approved' mapping (outline emerald) beyond spec's 3 statuses since DTO has 4; (3) admin pending smoke rows show requester via username lookup from overview.users (DTO has requestedById only), fallback id.slice(0,10); (4) admin tab counts rendered as small count Badges next to labels; (5) paid listing price rendered inside the revenueModel Badge ('판매 ₩50,000'); (6) controlled Tabs in smoke detail (value+onValueChange) so '개선 제안 보기' can switch tabs

---
Task ID: 4-b
Agent: views-b
Task: Build the 4 view folders under file ownership `src/components/views/{project,lab,pipelines}/**` (project detail, model lab, pipeline hub, pipeline run)

Work Log:
- Read worklog (3-a/3-b), CONTRACTS §1–§8, lib/types.ts, lib/store.ts, shared components real exports (EmptyState/StatCard/StepForm/ScoreGauge/ViewHeader/PreviewRenderer props), layout/icon.tsx, lib/engine/types.ts, i18n aggregator (lib/i18n/index.ts — NOT edited), core.ts keys, quick-actions, docs/09 §4–§6
- project/index.tsx (default export ProjectView): params.id gate → EmptyState; GET /api/artifacts/[id] (queryKey ['artifact', id], enabled !!id); breadcrumb row (ghost back btn → 'my-projects' if owner else 'gallery' + version Badge outline + status Badge published?'공개'secondary:'비공개'outline); grid lg:grid-cols-[1fr_1.1fr] — preview Card `lg:order-2` (right on desktop, first in DOM → top on mobile) with PreviewRenderer playing aspect-[4/3], custom big-play overlay (h-16 w-16 circle + '게임/앱 실행' caption) for game/app when !playing; LEFT col: h1 + categoryLabel Badge secondary (metadata.categoryLabel ?? type label map), description, #tags, owner row (Avatar + @user + 최근 업데이트 {date} + Eye/Heart/MessageCircle stats); action row (실행 primary for executable, 편집하기 outline owner-only → Dialog title/desc → PATCH → invalidate, 공유 ghost → clipboard + toast, MoreHorizontal dropdown: 신고 → POST /api/report + toast, 삭제 owner-only → DELETE + navigate('gallery')); Tabs(개요/분석/수익/스모크테스트/댓글(n)/버전): 개요 Card p-6 + whitespace-pre-wrap + '→ 원본 프롬프트 보기' + LandingContent sections (hero h3, sections h4/body/bullets list-disc); 분석 → 2×md:4 StatCards (views/plays/likes/completionRate%) or EmptyState; 수익 → owner-only GET /api/revenue filter shares by artifactId → rows (period, ₩ amount Intl.NumberFormat, pending/settled badges) else private/empty EmptyState; 스모크테스트 → GET /api/smoke-tests?scope=artifact (['smoke','artifact',id]) → completed: ScoreGauge(successScore)+scoreLabel+'리포트 보기'→navigate('smoke'), requested/approved/running: Loader2 pending Card, none: apply Card (budget Select 50k/100k/150k ₩, days fixed 14, POST /api/smoke-tests → toast '신청 완료 — 어드민 승인 후 집행됩니다' + invalidate); 댓글 → GET /api/comments list + Input/Enter + POST /api/comment (requireLogin guard) + invalidate; 버전 → metadata.versions vertical timeline (border-l + primary dots + version Badge + note + date) else EmptyState
- lab/index.tsx (default export LabView): ViewHeader + grid lg:grid-cols-[360px_1fr]; promptText useState(() => params.promptText ?? '') pre-fill; StepForm: S1 Textarea rows5 max1000 + counter {len}/1000 + 개선하기 (POST /api/lab/improve-prompt → setValue + toast '개선 완료'), S2 providers query ['providers'] → clickable Card rows (Checkbox + displayName + `{(costPerUnit*1.4).toFixed(0)} 크`), S3 RadioGroup 1:1/16:9/9:16 (labels) + style Select (none→'' mapping because Radix forbids empty value: cinematic/anime/product/pixar); footer: 필요 크레딧 Σround(cost×1.4) text-primary text-lg + FlaskConical 생성하기 lg w-full disabled(!trim||!selected||loading) → requireLogin → POST /api/lab/generate {promptText, providerIds, aspect, style?, promptId: params.promptId} → append jobs + useRefreshSession(); RIGHT: EmptyState(FlaskConical)+tip or jobs grid sm:2/xl:3/2xl:4 grouped by providerId (Map preserves order) — column Card header (providerName + ΣcreditCharged '크') + per-job aspect-square body: queued/running Skeleton+Loader2, failed AlertCircle red+error+'크레딧 환불 완료', done img object-cover + group-hover overlay (RefreshCw regenerate → POST generate [providerId] append; Check circle select toggle bg-primary when selected); polling: jobsRef + interval 2000ms gated by hasActive → GET /api/lab/jobs?ids → merge only status-changed (setState inside async tick, lint-safe); sticky bottom bar (≥1 done): '선택 이미지 {n}개' + 전시실에 게시하기 → PATCH each {status:'published'} → invalidate ['feed'] → navigate('project', {id: firstId})
- pipelines/index.tsx (default export PipelinesView): ViewHeader '파이프라인 허브'/'AI 자동화 도구로...'; GET /api/pipelines ['pipelines'] → md:grid-cols-2 cards (wide → md:col-span-2 md:flex items-center, icon box h-14 w-14 rounded-2xl bg-primary/15 + Icon(p.icon), locale displayNameKo/En, line-clamp-2 desc, Badge outline Zap {n} 크레딧, 시작하기 → navigate('pipeline-run',{id})); 내 실행 기록 (session-gated): GET /api/pipeline-runs?scope=mine sorted desc → max-h-96 overflow-y-auto scrollbar-thin rows: pipeline name (mapped from hub list) + status Badge (running secondary / done outline emerald / failed outline red) + date + done→resultArtifact thumbnail h-10 w-10 + external-link → navigate('project')
- pipelines/run.tsx (named export PipelineRunView — ViewRouter: `import { PipelineRunView } from '@/components/views/pipelines/run'`): params.id → GET /api/pipelines find; loading Skeleton / error retry / not-found EmptyState; header: ← 파이프라인 허브 ghost + Icon box + locale name + Badge outline credits; inner <RunInner key={p.id}> (keyed remount resets run/form state per pipeline); form: StepForm steps per pipeline (3d: productName/stylePrompt · shortform: topic + tone Select + seconds Select 15/30/60 · detailpage: productName + price(type number) + features textarea split /\n|,/ · game: genre Select + theme + difficulty Select · copy: product + audience + tone Select — select values are the Korean labels sent to the LLM runners), footer 필요 크레딧 {creditCost} + Wand2 실행하기 → requireLogin → POST /api/pipelines/[id]/run {input} → setRunId + useRefreshSession; run polling: useQuery ['pipeline-run', runId] refetchInterval fn 1500ms while status==='running'; running: Progress + Loader2 + hint (≥90 조립/≥60 에셋/≥30 컨셉/else 준비); failed: AlertCircle+error+'크레딧 환불 완료'+새 실행; done: PreviewRenderer result (aspect-[4/3] image/3d else aspect-video) + title + 전시실에 게시하기 (PATCH publish → toast + invalidate ['feed'] + one-shot disabled state) + 프로젝트 열기 + 새 실행
- messages.ts ×3 (project/lab/pipelines ns): flat {ko,en} Records, every key in both locales; pipeline run keys folded into pipelines ns; no aggregator edits

Deviations (minor, intentional):
- project: `playing` reset on id change implemented via `playingId === a.id` comparison instead of useEffect([id]) setPlaying(false) — same behavior, avoids set-state-in-effect pattern
- project: 편집하기/삭제 are owner-only (PATCH/DELETE are owner-gated server-side); 신고 shown to everyone per spec; big-play overlay is a single <button> wrapper (span circle inside) to avoid nested buttons over PreviewRenderer's pointer-events-none PlayOverlay
- lab: provider-column header credit shows Σ creditCharged of that column's jobs (equals the single job's credit in the normal 1-job case; more accurate after regenerate); style Select uses value 'none' internally ('' would crash Radix Select)
- lab: prompt-id link passed through on every generate call incl. single-provider regenerate
- pipelines: run form Select values carry Korean labels (정보형/슈팅/쉬움/전문형…) — backend runners feed them straight into Korean LLM prompts regardless of UI locale; publish button flips to disabled Check state after successful PATCH (idempotent but avoids double-toast)

Stage Summary:
- Files: views/project/{index.tsx,messages.ts}, views/lab/{index.tsx,messages.ts}, views/pipelines/{index.tsx,run.tsx,messages.ts}
- Exports: project default ProjectView · lab default LabView · pipelines default PipelinesView · pipelines/run named PipelineRunView (plus local RunInner/stepsFor/defaultsFor helpers, not exported)
- `bun run lint` → 0 errors/warnings repo-wide; `tsc --noEmit` → no errors under src/components/views/{project,lab,pipelines}/** (remaining repo errors are other agents' files: examples/, skills/, hooks/use-session.ts line 42, lib/engine/types.ts)
- Numbers toLocaleString / Intl.NumberFormat ₩, dates toLocaleDateString(locale ternary), semantic tokens + emerald/red status colors only, p-4/p-6 cards, gap-4/6, scrollbar-thin long lists — all per rules

---
Task ID: 11-13
Agent: orchestrator (main)
Task: Integration, E2E verification with Agent Browser, final cleanup

Work Log:
- Fixed flagged integration issues: `use-session.ts` api.get mismatch; `BriefDTO.bids` added + serializer + all briefs routes include `developer` (5 routes); `engine/types.ts` ExecutionTier import
- Replaced ViewRouter stub with real 14-view router (SPA view-switching, hash-synced)
- `tsc --noEmit` clean (app code), `bun run lint` clean (0 errors/warnings)
- Agent Browser E2E verified: home/feed render, login (demo+admin), project detail → iframe sandbox game RUNS (sandbox attrs verified: allow-scripts allow-pointer-lock, parent JS correctly blocked), Model Lab real AI generation ×2 models (credits charged 10 → sidebar live update 105,000→104,990), select+publish → auto-navigate to new project detail, admin guard (user blocked), admin module switch OFF → sidebar item disappears instantly (dark launch works) → restored, smoke test report (score gauge 91/100, stat grid, LLM insights), revenue/market/community/academy/pipelines/gallery all render, pipeline-copy UI E2E (charge 2크 → LLM → result → publish actions), mobile 390px (bottom tabbar + safe area), light/dark token inversion
- Cleaned 2 junk test prompts from agent testing; fixed marketplace module status back to 'active' (was toggled 'new' during 3-a live tests)
- dev.log: no runtime errors in recent traffic; browser console clean

Stage Summary:
- PLAYLAB Phase 1~5 FULL SCOPE delivered and browser-verified
- 14 views, 45+ API routes, 20 Prisma models, module registry with live dark-launch, execution engine Tier 1 (playable game in sandboxed iframe), IModelProvider adapters over z-ai SDK (multi-model compare with per-model style/cost), credits economy, smoke test pipeline with LLM insights, revenue/settlement, marketplace + AI-structured briefs → bids → match → contract
- Demo accounts: 'demo' (rich data), 'admin' (admin panel) — any nickname auto-registers
