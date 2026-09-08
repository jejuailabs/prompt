# PLAYLAB — Agent Contracts (MUST READ)

Read this + `/home/z/my-project/worklog.md` before working. Append your section to worklog.md when done.

## 0. Hard Rules

- **Only ONE page route exists**: `src/app/page.tsx`. NEVER create `src/app/**/page.tsx` files. Navigation = SPA view-switching via zustand (`useAppStore().navigate(view, params)`). API routes under `src/app/api/**` are allowed and required.
- **API routes only** — no server actions.
- **z-ai-web-dev-sdk is BACKEND ONLY** (inside `src/app/api/**` or `src/lib/server/**`). Never import it in client code.
- **Do NOT**: start/stop dev servers, run db commands, edit files outside your ownership map, create extra page routes.
- Run `bun run lint` before finishing; fix errors in YOUR files only (other agents work in parallel).
- Design: violet accent tokens only (`bg-primary text-primary-foreground` etc.) — NEVER hardcode indigo/blue. Dark-first theme; use semantic tokens (`bg-background`, `bg-card`, `text-muted-foreground`...). shadcn/ui components exist in `src/components/ui`.
- All views are client components (`'use client'`). Data via `api` client + TanStack Query.
- **i18n**: all UI text via `useTranslations('<ns>')` from next-intl. Each view owns `messages.ts` in its folder: export default `{ ko: {...}, en: {...} }`. Add EVERY key to BOTH locales. Core namespace: `useTranslations('core')`.
- Long lists: `max-h-96 overflow-y-auto scrollbar-thin`. Cards: consistent `p-4/p-6`, `gap-4/gap-6`.
- Formatting: numbers via `toLocaleString()`, won (₩) amounts via `new Intl.NumberFormat(locale==='ko'?'ko-KR':'en-US').format(n)`.

## 1. File Ownership Map (do not touch others)

| Area | Owner | Paths |
|---|---|---|
| Core (DONE) | orchestrator | src/lib/** (except server/), src/hooks, src/app/{layout,page,globals.css}, src/components/{providers,playlab-app}.tsx, prisma/**, scripts/** |
| 3-a Backend | backend agent | src/app/api/** , src/lib/server/** |
| 3-b Shell | shell agent | src/components/layout/**, src/components/shared/** |
| 4-a | view agent a | src/components/views/{home,gallery,prompt,my-projects,community,academy}/** |
| 4-b | view agent b | src/components/views/{project,lab,pipelines}/** |
| 4-c | view agent c | src/components/views/{smoke,revenue,market,admin}/** |
| Integration | orchestrator | src/components/views/view-router.tsx |

Shared components listed in §5 are written by 3-b — **4-a/b/c code against those exact contracts in parallel**. If a shared component differs slightly at integration, orchestrator fixes.

## 2. Store & Navigation

```ts
import { useAppStore } from '@/lib/store';
const view = useAppStore(s => s.view);          // ViewKey
const params = useAppStore(s => s.params);       // Record<string,string>
const navigate = useAppStore(s => s.navigate);
navigate('project', { id: artifactId });
navigate('pipeline-run', { id: 'pipeline-3d' });
const session = useAppStore(s => s.session);     // SessionUser | null
const requireLogin = useAppStore(s => s.requireLogin); // returns true if logged in, else opens login dialog → use as guard
const locale = useAppStore(s => s.locale);       // 'ko' | 'en'
const setLoginOpen = useAppStore(s => s.setLoginOpen);
```
ViewKey: `home | gallery | prompt | project | lab | pipelines | pipeline-run | smoke | revenue | market | community | academy | my-projects | admin`

Session hook: `useSession()` from `@/hooks/use-session` (fetches /api/auth/session on mount). `useRefreshSession()` after login/logout/credit changes. `useModules()` returns enabled modules sorted by navOrder (react-query).

SessionUser: `{ id, username, avatarUrl?, role: 'user'|'admin', credits: number }`

## 3. API Client & Envelope

```ts
import { api, uploadFile } from '@/lib/api-client';
const data = await api<ArtifactDTO[]>('/api/artifacts?sort=new');
await api.post('/api/vote', { targetType: 'artifact', targetId });
const { url } = await uploadFile(file); // POST /api/upload multipart
```
Server responses: `{ ok: true, data } | { ok: false, error }` — `api` unwraps and throws `ApiError` (message is user-displayable, often Korean).

## 4. DTOs (src/lib/types.ts — import, don't redefine)

Key shapes: `ArtifactDTO{ id,type,title,description,ownerId,owner{id,username,avatarUrl},sourcePromptId,sourceModule,fileUrl,contentUrl,metadata{tags,model,params{aspect,style},frames[],content(LandingContent),stats{views,plays,likes,completionRate},versions[],previewUrl,duration},executionTier,status:'draft'|'published'|'archived'|'hidden',version,views,createdAt,likeCount,commentCount,likedByMe }`
`PromptDTO{ id,title,body,category,modelTags[],owner,forkedFromId,createdAt,likeCount,commentCount,forkCount,artifactCount,likedByMe }`
`PromptDetailDTO extends PromptDTO { versions[], artifacts[], forkParent? }`
`CommentDTO{ id,targetType,targetId,body,createdAt,user }`
`ModuleDTO{ id,phase,titleKo,titleEn,descKo,descEn,icon,navOrder,enabled,status,newUntil,mainScreenSlot,entryView }`
`ProviderDTO{ id,displayName,category,costPerUnit,active }`
`JobDTO{ id,providerId,providerName,promptText,aspect,style,status:'queued'|'running'|'done'|'failed',creditCharged,error,resultArtifact? }`
`CreditStateDTO{ balance,monthlyUsed,monthlyLimit,transactions:TxDTO[] }` TxDTO `{id,amount,reason,relatedId,createdAt}`
`PipelineDTO{ id,displayNameKo,displayNameEn,descKo,descEn,icon,creditCost,wide,active }`
`RunDTO{ id,pipelineId,status:'running'|'done'|'failed',progress:0-100,creditCharged,error,resultArtifact?,createdAt,completedAt }`
`SmokeTestDTO{ id,artifactId,artifact?{id,title,type,fileUrl,version,metadata},status:'requested'|'approved'|'running'|'completed',budget,days,requestedAt,completedAt,report?{metrics:ReportMetrics,recommendation:string[],successScore,createdAt} }`
`ReportMetrics{ impressions,clicks,ctr,signups,conversions,cac,daily[{date,visitors,signups}] }`
`RevenueOverviewDTO{ account{provider,status,externalAccountId,totalEarned}|null,shares:RevenueShareDTO[],totals{thisMonth,pending,lifetime},monthly[{month,amount}] }` RevenueShareDTO `{id,artifactId,artifactTitle,payeeUserId,sharePercent,amount,period,status:'pending'|'settled'}`
`ListingDTO{ id,artifact:ArtifactDTO,revenueModel:'ad_share'|'paid'|'freemium',price?,status,listedBy,createdAt }`
`BriefDTO{ id,author,title,rawText,structuredSpec:StructuredSpec,category?,budget?,status:'draft'|'submitted'|'approved'|'rejected'|'matched',createdAt,bidCount,match?{id,contract?,bid?} }`
`StructuredSpec{ title,problem,targetUsers,features[],techStack[],pages[],effortWeeks,suggestedBudgetKrw,risks[] }`
`BidDTO{ id,briefId,developer,proposal,price,etaDays,status:'pending'|'accepted'|'rejected',createdAt }`
`ContractDTO{ id,revenueShareTerms{developerShare,platformShare,milestones[],notes},status,createdAt }`
`AdminUserDTO{ id,username,avatarUrl,role,banned,credits,createdAt,artifactCount,promptCount }`
`ModerationItemDTO{ targetType:'prompt'|'artifact',targetId,title,body,ownerUsername,reportCount,status,createdAt }`
`EventDTO{ id,type,payload,createdAt }`

## 5. API Endpoint Specs (3-a implements; 4-x consumes)

All under `/api`. Body = JSON unless noted. Auth: httpOnly cookie `pl_session` (set by login). Guarded endpoints return 401 error "로그인이 필요합니다" / 403 "관리자 권한이 필요합니다".

### Auth
- `POST /api/auth/login` `{username}` → SessionUser. Creates profile if new (credits 1000; username 'admin' gets role admin). Sets cookie.
- `POST /api/auth/logout` → null. Clears cookie.
- `GET /api/auth/session` → SessionUser | null

### Modules
- `GET /api/modules` → ModuleDTO[] (ALL, incl. disabled — client filters)

### Artifacts / Feed
- `GET /api/artifacts?scope=feed|mine|drafts&type=&q=&sort=new|popular&moduleId=&limit=` → ArtifactDTO[]. feed = published+public, filter out artifacts whose sourceModule is a disabled module. mine = owner==me. drafts = mine && status=draft.
- `GET /api/artifacts/[id]` → ArtifactDTO (increments views)
- `POST /api/artifacts` `{title,type,description?,fileUrl?,contentUrl?,metadata?,sourcePromptId?,sourceModule?,publish?}` → ArtifactDTO (status = publish?'published':'draft'; log event artifact.created/published)
- `PATCH /api/artifacts/[id]` `{title?,description?,metadata?,status?,version?}` → ArtifactDTO (owner)
- `DELETE /api/artifacts/[id]` → null (owner)
- `POST /api/vote` `{targetType:'prompt'|'artifact', targetId}` → `{liked:boolean, likeCount:number}` (toggle, requires login)
- `POST /api/comment` `{targetType, targetId, body}` → CommentDTO
- `GET /api/comments?targetType=&targetId=` → CommentDTO[]
- `POST /api/report` `{targetType, targetId}` → null (increments reportCount)
- `GET /api/ranking` → `{prompts:PromptDTO[], artifacts:ArtifactDTO[]}` (top 5 each by votes)
- `GET /api/search?q=` → `{prompts, artifacts}`

### Prompts
- `GET /api/prompts?scope=all|mine&sort=new|popular|forked&category=&q=` → PromptDTO[]
- `GET /api/prompts/[id]` → PromptDetailDTO
- `POST /api/prompts` `{title,body,category,modelTags:[]}` → PromptDTO (log prompt.created)
- `POST /api/prompts/[id]/fork` `{title?,body?,versionNote?}` → PromptDTO (new prompt with forkedFromId; also PromptVersion record)
- `GET /api/prompts/[id]/versions` → PromptVersionDTO[]

### Credits
- `GET /api/credits` → CreditStateDTO (monthlyUsed = sum negative amounts this month; monthlyLimit 50000)
- `POST /api/credits/purchase` `{amount}` → `{balance}` (demo charge)

### Model Lab (Phase 2)
- `GET /api/providers` → ProviderDTO[] (active)
- `POST /api/lab/generate` `{promptText, providerIds:string[], aspect:'1:1'|'16:9'|'9:16', style?, promptId?}` → `{jobs:JobDTO[], charged, balance}`. Charges upfront (costPerUnit×1.4 margin each). Creates jobs then processes async (fire-and-forget): each job generates image via z-ai SDK (prompt + provider.styleHint; size from aspect: 1:1→1024x1024, 16:9→1344x768, 9:16→768x1344), saves `public/uploads/gen/{jobId}.png`, creates result Artifact type 'image' status 'draft' metadata {model: provider.displayName, params:{aspect,style}, tags:[]}, executionTier null. On failure → status failed + refund credits.
- `GET /api/lab/jobs?ids=a,b,c` → JobDTO[] (poll every 2s until done/failed)
- `POST /api/lab/improve-prompt` `{text}` → `{improved}` (LLM rewrite, keep language of input)

### Pipelines (Phase 3)
- `GET /api/pipelines` → PipelineDTO[]
- `POST /api/pipelines/[id]/run` `{input}` → RunDTO (requires login, charges creditCost upfront; processes async — see §7 runner specs)
- `GET /api/pipeline-runs/[id]` → RunDTO (poll)
- `GET /api/pipeline-runs?scope=mine` → RunDTO[]

### Smoke Tests (Phase 4)
- `POST /api/smoke-tests` `{artifactId, budget, days}` → SmokeTestDTO (login; creates AdCampaign draft)
- `GET /api/smoke-tests?scope=mine` / `GET /api/smoke-tests?scope=artifact&artifactId=` → SmokeTestDTO[]
- `GET /api/smoke-tests/[id]` → SmokeTestDTO
- `POST /api/admin/smoke-tests/[id]/approve` → SmokeTestDTO (admin). Sets approved→running, waits ~4s (setTimeout), generates simulated metrics from budget/days + LLM insights (fallback canned), completes. Details §7.

### Revenue (Phase 4)
- `GET /api/revenue` → RevenueOverviewDTO (own shares; account)
- `POST /api/revenue/connect` `{provider}` → account (demo: creates active account acct_demo_xxx)

### Marketplace (Phase 4)
- `GET /api/marketplace/listings` → ListingDTO[] (active)
- `POST /api/marketplace/listings` `{artifactId, revenueModel, price?}` → ListingDTO (own artifact)

### Briefs (Phase 5)
- `POST /api/briefs` `{rawText}` → BriefDTO (login; LLM structures → structuredSpec + title/category/budget estimate; status draft)
- `POST /api/briefs/[id]/submit` → BriefDTO (author, draft→submitted)
- `GET /api/briefs?scope=mine|open|all` → BriefDTO[] (open = approved)
- `GET /api/briefs/[id]` → BriefDTO (with bids, match+contract)
- `POST /api/briefs/[id]/bids` `{proposal, price, etaDays}` → BidDTO (login; brief approved)
- `POST /api/briefs/[id]/match` `{bidId}` → BriefDTO (author only; bid accepted, others rejected, Match+Contract{developerShare:70,platformShare:30,milestones,notes}, brief status matched, log problem_brief.matched)
- `POST /api/admin/briefs/[id]/approve` / `/reject` → BriefDTO (submitted→approved/rejected)

### Admin
- `GET /api/admin/overview` → `{reported: ModerationItemDTO[], pendingSmokeTests: SmokeTestDTO[], pendingBriefs: BriefDTO[], users: AdminUserDTO[]}` (admin)
- `POST /api/admin/moderate` `{targetType, targetId, action:'hide'|'dismiss'|'restore'}` → null
- `PATCH /api/admin/modules` `{id, enabled?, status?, newUntil?}` → ModuleDTO
- `PATCH /api/admin/users` `{id, role?, banned?}` → AdminUserDTO

### Misc
- `GET /api/events?limit=12` → EventDTO[] (recent activity for notification bell)
- `POST /api/upload` multipart `file` → `{url}` (saves public/uploads/upl/{ts}-{name}; png/jpg/webp ≤ 5MB)

## 6. Shared Components (3-b implements at EXACT paths; 4-x imports)

```ts
// @/components/shared/artifact-card
export function ArtifactCard({ artifact, onClick }: { artifact: ArtifactDTO; onClick?: () => void })
// Card: PreviewRenderer (aspect-video) + media-overlay bottom gradient with type badge (categoryLabel or type label), duration badge if metadata.duration, title, @owner, ♥likeCount 👁views. Whole card clickable.

// @/components/shared/preview-renderer
export function PreviewRenderer({ artifact, playing = false, className }: { artifact: ArtifactDTO; playing?: boolean; className?: string })
// Renders by artifact.type:
//  image → <img src={fileUrl}> object-cover
//  video → slideshow of metadata.frames (setInterval 2.4s, kenburns class) with ▶ overlay + duration badge; if !frames show fileUrl
//  3d_asset → CSS cube (.cube-scene/.cube/.cube-face) using metadata.previewUrl as face bg + glow
//  game/app → if playing && contentUrl: <iframe src={contentUrl} sandbox="allow-scripts allow-pointer-lock" className="w-full h-full">; else cover: fileUrl image + ▶ overlay "실행"
//  landing_page → mini rendering of metadata.content (hero title + first section) on card bg
//  text → prose snippet (metadata.content?.sections or description)
// Non-playing states show a centered ▶ circle button overlay for executable types.

// @/components/shared/score-gauge
export function ScoreGauge({ score, size = 140, label }: { score: number; size?: number; label?: string })
// SVG circular gauge 0-100, violet→green gradient by score (>=70 emerald tint, >=40 amber, else red), big number center, label under.

// @/components/shared/stat-card
export function StatCard({ label, value, delta, icon, sub }: { label: string; value: string | number; delta?: number; icon?: ReactNode; sub?: string })
// delta: % change — positive text-emerald-500 ▲, negative text-red-500 ▼.

// @/components/shared/step-form
export function StepForm({ steps, footer }: { steps: { title: string; description?: string; content: ReactNode }[]; footer?: ReactNode })
// Vertical numbered steps (1,2,3 violet circles) with content; footer sticky at bottom.

// @/components/shared/empty-state
export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode })

// @/components/shared/module-badge
export function ModuleStatusBadge({ status, newUntil }: { status: string; newUntil?: string | null })
// NEW (violet) if status==='new' && newUntil>now, BETA if 'beta', others → subtle dot/label.

// @/components/shared/view-header
export function ViewHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode })

// @/components/shared/login-dialog — default export, self-managed via store (loginOpen). Content: brand, input username, hint text core.demoAccountHint, POST /api/auth/login → setSession + refresh. On success close + toast.

// @/components/shared/create-prompt-dialog
export function CreatePromptDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void })
// form: title, body(textarea), category select(이미지/영상/코딩/마케팅/게임/기타), modelTags (comma input → array), optional image upload → on save: POST /api/prompts; if image uploaded also POST /api/artifacts {type:'image', sourcePromptId, publish:true, fileUrl, title}. Toast + close. Require login guard.

// @/components/shared/upload-artifact-dialog
export function UploadArtifactDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void })
// form: title, type select(image/text), description, image upload (required for image), publish toggle → POST /api/artifacts.

// @/components/layout/app-shell — default export AppShell() (no props)
// Desktop (md+): fixed left sidebar w-60 (logo + module nav from useModules() filtered !adminOnly, each item: icon + title(moduleTitle by locale) + ModuleStatusBadge; active = bg-sidebar-accent; admin item only if session?.role==='admin'; bottom: credits widget balance + 충전 button → opens top-up (simple dialog POST /api/credits/purchase amount select 1000/5000/10000, refresh session), account row (avatar initial + username + role label) + logout icon.
// Header top: search input (core.searchPlaceholder, Enter → navigate('gallery',{q})) | bell (dropdown GET /api/events, icons by type) | theme toggle (next-themes useTheme, Sun/Moon) | account dropdown (login button or username menu: 내 프로젝트, 로그아웃) | primary button + core.create → dropdown menu with QUICK_ACTIONS (create prompt opens CreatePromptDialog; view actions navigate).
// Mobile (<md): header compact (logo, search icon, theme, create); bottom tab bar fixed (home, gallery, lab, pipelines, more→Sheet with remaining modules).
// Main area: <main className="flex-1 min-w-0"> with ViewRouter inside; footer: mt-auto, small text-muted-foreground border-t, © 2026 PLAYLAB · core.footerNote.
// Structure must satisfy: min-h-screen flex flex-col; footer mt-auto (sticky footer rule).

// @/components/shared/icon — Icon({name, className}) resolving lucide icons by string key (dynamic import map of ~40 common lucide icons incl. those in MODULE_CONFIGS + quick-actions).
```

Icon keys used in registry: home, folder-kanban, images, flask-conical, workflow, radar, wallet, store, users, graduation-cap, shield + quick-actions: pen-line, box, clapperboard, layout-panel-left, gamepad-2 + extras: heart, eye, bell, sun, moon, search, plus, chevron-right, sparkles, wand-2, credit-card, trophy, message-circle, play, download, star, zap, file-text, upload, log-out, settings, trash-2, flag, check, x, arrow-left, external-link, refresh-cw, clock, target, trend-up, trend-down.

## 7. AI Runner Specs (3-a implements in src/lib/server/)

- LLM helper `src/lib/server/ai.ts`: `chatJson<T>(system, user): Promise<T>` — z-ai chat.completions, thinking disabled, strip \`\`\`json fences, JSON.parse with try/catch; `chatText(system, user)`. Include `generateImage(prompt, size): Promise<{base64}>` wrapper with retry ×2.
- Generation job runner: parallel-safe fire-and-forget; update job rows as it progresses.
- Pipeline runners by pipelineId (input payload keys are documented in view specs):
  - pipeline-3d `{productName, stylePrompt}`: gen image (prompt = product+style+3d render keyword) → artifact type '3d_asset', metadata {previewUrl: fileUrl, tags:[productName]}, executionTier null. progress: 30→60→100.
  - pipeline-shortform `{topic, tone, seconds}`: LLM → 3 scene captions (JSON {scenes:[{caption, imagePrompt}]}) → gen 3 images (768x1344) → artifact type 'video', fileUrl = frame1, metadata {frames:[3 urls], duration: '0:'+seconds, categoryLabel:'숏폼'}.
  - pipeline-detailpage `{productName, price, features}`: LLM → LandingContent JSON → artifact type 'landing_page', metadata {content, categoryLabel:'상세페이지'}.
  - pipeline-game `{genre, theme, difficulty}`: LLM → JSON {title, description, palette(#hex), speed(1-5)} → write public/uploads/games/{runId}/index.html from TEMPLATE (src/lib/server/game-template.ts — read file public/games/space-shooter.template.html, replace {{TITLE}}, {{PALETTE}}, {{SPEED}}) → artifact type 'game', contentUrl '/uploads/games/{runId}/index.html', fileUrl = '/seed/thumb-space-shooter.png', executionTier 'iframe', metadata {tags:[genre,theme], categoryLabel:'게임'}.
  - pipeline-copy `{product, audience, tone}`: LLM → {variants:[{headline, body, cta}]} → artifact type 'text', metadata {content:{hero:{title:variants[0].headline,...}, sections:variants.map(...)}, categoryLabel:'카피라이팅'}.
- Smoke test completion: metrics derived from budget: impressions = budget/1200, clicks = impressions×(0.028+rand0.01), ctr, signups = clicks×0.22, conversions = signups×0.13, cac = budget/conversions, daily series over days (sinusoidal + trend up). LLM insights (3-4 bullets, ko) fallback canned. successScore 60~92. Also create RevenueShare? No — only listing does.

## 8. View Specs (4-a/b/c) — see each agent's task prompt for details. Common patterns:
- Each view: `index.tsx` (default export, no props) + `messages.ts`. Read params from store. Use ViewHeader. Loading: skeleton. Errors: EmptyState + retry.
- Vote/comment guards: `if (!requireLogin()) return;`
- All mutations: react-query invalidate + sonner/shadcn toast (`useToast` from ui/toast or sonner — use `@/components/ui/toaster`'s useToast + ToastAction or simply toast from 'sonner'? → use `useToast` from '@/hooks/use-toast').
