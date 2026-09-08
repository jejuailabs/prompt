// DTO mappers per CONTRACTS §4 — dates → ISO, JSON columns → parsed, batched social counts
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import type {
  ArtifactDTO,
  ArtifactMetadata,
  ArtifactType,
  BidDTO,
  BriefDTO,
  CommentDTO,
  ContractDTO,
  EventDTO,
  ExecutionTier,
  AdminUserDTO,
  JobDTO,
  ModuleDTO,
  ModerationItemDTO,
  PromptDTO,
  PromptDetailDTO,
  PromptVersionDTO,
  ReportMetrics,
  RunDTO,
  SmokeTestDTO,
  StructuredSpec,
  UserBrief,
} from '@/lib/types';

// ─── Row types ───

export type ProfileRow = Prisma.ProfileGetPayload<Record<string, never>>;
export type ArtifactWithOwner = Prisma.ArtifactGetPayload<{ include: { owner: true } }>;
export type PromptWithOwner = Prisma.PromptGetPayload<{ include: { owner: true } }>;
export type CommentWithUser = Prisma.CommentGetPayload<{ include: { user: true } }>;
export type JobWithRelations = Prisma.GenerationJobGetPayload<{
  include: { provider: true; resultArtifact: { include: { owner: true } } };
}>;
export type RunWithArtifact = Prisma.PipelineRunGetPayload<{
  include: { resultArtifact: { include: { owner: true } } };
}>;
export type SmokeTestWithRelations = Prisma.SmokeTestGetPayload<{
  include: { artifact: { include: { owner: true } }; report: true };
}>;
export type BidWithDeveloper = Prisma.BidGetPayload<{ include: { developer: true } }>;
export type BriefWithRelations = Prisma.ProblemBriefGetPayload<{
  include: {
    author: true;
    bids: { include: { developer: true } };
    match: { include: { contract: true; bid: { include: { developer: true } } } };
  };
}>;
export type ModuleRow = Prisma.ModuleGetPayload<Record<string, never>>;
export type EventRow = Prisma.EventLogGetPayload<Record<string, never>>;

// ─── Generic JSON parse ───

export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (raw === null || raw === undefined) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ─── Social counts (batched) ───

export interface SocialMaps {
  likes: Map<string, number>;
  comments: Map<string, number>;
  liked: Set<string>;
}

const EMPTY_SOCIAL: SocialMaps = { likes: new Map(), comments: new Map(), liked: new Set() };

export async function loadSocial(
  targetType: 'prompt' | 'artifact',
  ids: string[],
  userId?: string | null,
): Promise<SocialMaps> {
  if (!ids.length) return EMPTY_SOCIAL;
  const [voteGroups, commentGroups, mine] = await Promise.all([
    db.vote.groupBy({
      by: ['targetId'],
      where: { targetType, targetId: { in: ids } },
      _count: { targetId: true },
    }),
    db.comment.groupBy({
      by: ['targetId'],
      where: { targetType, targetId: { in: ids } },
      _count: { targetId: true },
    }),
    userId
      ? db.vote.findMany({
          where: { targetType, targetId: { in: ids }, userId },
          select: { targetId: true },
        })
      : Promise.resolve([] as { targetId: string }[]),
  ]);
  const likes = new Map<string, number>();
  for (const g of voteGroups) likes.set(g.targetId, g._count.targetId);
  const comments = new Map<string, number>();
  for (const g of commentGroups) comments.set(g.targetId, g._count.targetId);
  const liked = new Set(mine.map((m) => m.targetId));
  return { likes, comments, liked };
}

export interface PromptExtras {
  forks: Map<string, number>;
  artifacts: Map<string, number>;
}

const EMPTY_EXTRAS: PromptExtras = { forks: new Map(), artifacts: new Map() };

export async function loadPromptExtras(ids: string[]): Promise<PromptExtras> {
  if (!ids.length) return EMPTY_EXTRAS;
  const [forkGroups, artifactGroups] = await Promise.all([
    db.prompt.groupBy({
      by: ['forkedFromId'],
      where: { forkedFromId: { in: ids } },
      _count: { forkedFromId: true },
    }),
    db.artifact.groupBy({
      by: ['sourcePromptId'],
      where: { sourcePromptId: { in: ids } },
      _count: { sourcePromptId: true },
    }),
  ]);
  const forks = new Map<string, number>();
  for (const g of forkGroups) if (g.forkedFromId) forks.set(g.forkedFromId, g._count.forkedFromId);
  const artifacts = new Map<string, number>();
  for (const g of artifactGroups) if (g.sourcePromptId) artifacts.set(g.sourcePromptId, g._count.sourcePromptId);
  return { forks, artifacts };
}

// ─── User brief ───

export function toUserBrief(p: ProfileRow): UserBrief {
  return { id: p.id, username: p.username, avatarUrl: p.avatarUrl, role: p.role };
}

// ─── Artifacts ───

export function serializeArtifact(a: ArtifactWithOwner, social?: SocialMaps): ArtifactDTO {
  const likeCount = social?.likes.get(a.id) ?? 0;
  const commentCount = social?.comments.get(a.id) ?? 0;
  const meta = parseJson<Partial<ArtifactMetadata>>(a.metadata, {});
  const metadata: ArtifactMetadata = {
    ...meta,
    tags: meta.tags ?? [],
    stats: meta.stats ?? { views: a.views, plays: 0, likes: likeCount, completionRate: 0 },
  };
  return {
    id: a.id,
    type: a.type as ArtifactType,
    title: a.title,
    description: a.description,
    ownerId: a.ownerId,
    owner: toUserBrief(a.owner),
    sourcePromptId: a.sourcePromptId,
    sourceModule: a.sourceModule,
    fileUrl: a.fileUrl,
    contentUrl: a.contentUrl,
    metadata,
    executionTier: (a.executionTier ?? null) as ExecutionTier | null,
    status: a.status as ArtifactDTO['status'],
    visibility: a.visibility,
    version: a.version,
    views: a.views,
    createdAt: a.createdAt.toISOString(),
    likeCount,
    commentCount,
    likedByMe: social ? social.liked.has(a.id) : false,
  };
}

export async function serializeArtifacts(
  rows: ArtifactWithOwner[],
  userId: string | null,
): Promise<ArtifactDTO[]> {
  const social = await loadSocial('artifact', rows.map((a) => a.id), userId);
  return rows.map((a) => serializeArtifact(a, social));
}

export async function serializeArtifactSingle(
  a: ArtifactWithOwner,
  userId: string | null,
): Promise<ArtifactDTO> {
  const [dto] = await serializeArtifacts([a], userId);
  return dto;
}

// ─── Prompts ───

export function serializePrompt(
  p: PromptWithOwner,
  social?: SocialMaps,
  extras?: PromptExtras,
): PromptDTO {
  return {
    id: p.id,
    title: p.title,
    body: p.body,
    category: p.category,
    modelTags: parseJson<string[]>(p.modelTags, []),
    ownerId: p.ownerId,
    owner: toUserBrief(p.owner),
    forkedFromId: p.forkedFromId,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    likeCount: social?.likes.get(p.id) ?? 0,
    commentCount: social?.comments.get(p.id) ?? 0,
    forkCount: extras?.forks.get(p.id) ?? 0,
    artifactCount: extras?.artifacts.get(p.id) ?? 0,
    likedByMe: social ? social.liked.has(p.id) : false,
  };
}

export async function serializePrompts(
  rows: PromptWithOwner[],
  userId: string | null,
): Promise<PromptDTO[]> {
  const [social, extras] = await Promise.all([
    loadSocial('prompt', rows.map((p) => p.id), userId),
    loadPromptExtras(rows.map((p) => p.id)),
  ]);
  return rows.map((p) => serializePrompt(p, social, extras));
}

export async function serializePromptSingle(
  p: PromptWithOwner,
  userId: string | null,
): Promise<PromptDTO> {
  const [dto] = await serializePrompts([p], userId);
  return dto;
}

const FALLBACK_SPEC: StructuredSpec = {
  title: '', problem: '', targetUsers: '', features: [], techStack: [], pages: [],
  effortWeeks: 0, suggestedBudgetKrw: 0, risks: [],
};

export async function serializePromptDetail(
  p: PromptWithOwner & {
    versions: Prisma.PromptVersionGetPayload<Record<string, never>>[];
    forkParent?: { id: string; title: string } | null;
    artifacts: ArtifactWithOwner[];
  },
  userId: string | null,
): Promise<PromptDetailDTO> {
  const base = await serializePromptSingle(p, userId);
  const versionUserIds = [...new Set(p.versions.map((v) => v.createdBy))];
  const versionUsers = await db.profile.findMany({
    where: { id: { in: versionUserIds } },
    select: { id: true, username: true },
  });
  const userNameById = new Map(versionUsers.map((u) => [u.id, u.username]));
  const versions: PromptVersionDTO[] = p.versions.map((v) => ({
    id: v.id,
    body: v.body,
    versionNote: v.versionNote,
    createdBy: v.createdBy,
    createdByName: userNameById.get(v.createdBy),
    createdAt: v.createdAt.toISOString(),
  }));
  const visibleArtifacts = p.artifacts.filter(
    (a) => a.status !== 'hidden' && (a.status === 'published' || a.ownerId === userId),
  );
  const artifacts = await serializeArtifacts(visibleArtifacts, userId);
  return {
    ...base,
    versions,
    artifacts,
    forkParent: p.forkParent ?? null,
  };
}

// ─── Comments ───

export function serializeComment(c: CommentWithUser): CommentDTO {
  return {
    id: c.id,
    targetType: c.targetType,
    targetId: c.targetId,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
    user: toUserBrief(c.user),
  };
}

// ─── Modules / Events ───

export function serializeModule(m: ModuleRow): ModuleDTO {
  return {
    id: m.id,
    phase: m.phase,
    titleKo: m.titleKo,
    titleEn: m.titleEn,
    descKo: m.descKo,
    descEn: m.descEn,
    icon: m.icon,
    navOrder: m.navOrder,
    enabled: m.enabled,
    status: m.status as ModuleDTO['status'],
    newUntil: m.newUntil ? m.newUntil.toISOString() : null,
    mainScreenSlot: m.mainScreenSlot,
    entryView: m.entryView,
    requiresAuth: m.requiresAuth,
    adminOnly: m.adminOnly,
  };
}

export function serializeEvent(e: EventRow): EventDTO {
  return {
    id: e.id,
    type: e.type,
    payload: parseJson<Record<string, unknown>>(e.payload, {}),
    createdAt: e.createdAt.toISOString(),
  };
}

// ─── Model Lab jobs ───

export function serializeJob(j: JobWithRelations, resultArtifact?: ArtifactDTO | null): JobDTO {
  return {
    id: j.id,
    providerId: j.providerId,
    providerName: j.provider.displayName,
    promptText: j.promptText,
    aspect: j.aspect,
    style: j.style,
    status: j.status as JobDTO['status'],
    creditCharged: j.creditCharged,
    error: j.error,
    resultArtifact: resultArtifact ?? null,
  };
}

export async function serializeJobs(jobs: JobWithRelations[], userId: string | null): Promise<JobDTO[]> {
  const artifacts = jobs.map((j) => j.resultArtifact).filter((a): a is ArtifactWithOwner => Boolean(a));
  const social = await loadSocial('artifact', artifacts.map((a) => a.id), userId);
  const dtoById = new Map(artifacts.map((a) => [a.id, serializeArtifact(a, social)]));
  return jobs.map((j) => serializeJob(j, j.resultArtifact ? dtoById.get(j.resultArtifact.id) : null));
}

// ─── Pipeline runs ───

export function serializeRun(r: RunWithArtifact, resultArtifact?: ArtifactDTO | null): RunDTO {
  return {
    id: r.id,
    pipelineId: r.pipelineId,
    status: r.status as RunDTO['status'],
    progress: r.progress,
    creditCharged: r.creditCharged,
    error: r.error,
    resultArtifact: resultArtifact ?? null,
    createdAt: r.createdAt.toISOString(),
    completedAt: r.completedAt ? r.completedAt.toISOString() : null,
  };
}

export async function serializeRuns(runs: RunWithArtifact[], userId: string | null): Promise<RunDTO[]> {
  const artifacts = runs.map((r) => r.resultArtifact).filter((a): a is ArtifactWithOwner => Boolean(a));
  const social = await loadSocial('artifact', artifacts.map((a) => a.id), userId);
  const dtoById = new Map(artifacts.map((a) => [a.id, serializeArtifact(a, social)]));
  return runs.map((r) => serializeRun(r, r.resultArtifact ? dtoById.get(r.resultArtifact.id) : null));
}

// ─── Smoke tests ───

export function serializeSmokeTest(st: SmokeTestWithRelations): SmokeTestDTO {
  return {
    id: st.id,
    artifactId: st.artifactId,
    artifact: st.artifact
      ? {
          id: st.artifact.id,
          title: st.artifact.title,
          type: st.artifact.type as ArtifactType,
          fileUrl: st.artifact.fileUrl,
          version: st.artifact.version,
          metadata: parseJson<ArtifactMetadata>(st.artifact.metadata, {}),
        }
      : null,
    requestedById: st.requestedById,
    status: st.status as SmokeTestDTO['status'],
    budget: st.budget,
    days: st.days,
    requestedAt: st.requestedAt.toISOString(),
    completedAt: st.completedAt ? st.completedAt.toISOString() : null,
    report: st.report
      ? {
          metrics: parseJson<ReportMetrics>(st.report.metrics, {
            impressions: 0, clicks: 0, ctr: 0, signups: 0, conversions: 0, cac: 0, daily: [],
          }),
          recommendation: parseJson<string[]>(st.report.recommendation, []),
          successScore: st.report.successScore,
          createdAt: st.report.createdAt.toISOString(),
        }
      : null,
  };
}

// ─── Briefs / bids / contracts ───

export function serializeBid(b: BidWithDeveloper): BidDTO {
  return {
    id: b.id,
    briefId: b.briefId,
    developer: toUserBrief(b.developer),
    proposal: b.proposal,
    price: b.price,
    etaDays: b.etaDays,
    status: b.status as BidDTO['status'],
    createdAt: b.createdAt.toISOString(),
  };
}

export function serializeBrief(b: BriefWithRelations): BriefDTO {
  const match = b.match
    ? {
        id: b.match.id,
        contract: b.match.contract
          ? {
              id: b.match.contract.id,
              revenueShareTerms: parseJson<ContractDTO['revenueShareTerms']>(
                b.match.contract.revenueShareTerms,
                { developerShare: 70, platformShare: 30, milestones: [], notes: '' },
              ),
              status: b.match.contract.status,
              createdAt: b.match.contract.createdAt.toISOString(),
            }
          : null,
        bid: b.match.bid ? serializeBid(b.match.bid) : undefined,
      }
    : null;
  return {
    id: b.id,
    author: toUserBrief(b.author),
    title: b.title,
    rawText: b.rawText,
    structuredSpec: parseJson<StructuredSpec>(b.structuredSpec, FALLBACK_SPEC),
    category: b.category,
    budget: b.budget,
    status: b.status as BriefDTO['status'],
    createdAt: b.createdAt.toISOString(),
    bidCount: b.bids?.length ?? 0,
    bids: b.bids?.map(serializeBid),
    match,
  };
}

// ─── Admin ───

export async function serializeAdminUsers(profiles: ProfileRow[]): Promise<AdminUserDTO[]> {
  if (!profiles.length) return [];
  const ids = profiles.map((p) => p.id);
  const [artifactGroups, promptGroups, creditRows] = await Promise.all([
    db.artifact.groupBy({ by: ['ownerId'], where: { ownerId: { in: ids } }, _count: { ownerId: true } }),
    db.prompt.groupBy({ by: ['ownerId'], where: { ownerId: { in: ids } }, _count: { ownerId: true } }),
    db.credits.findMany({ where: { userId: { in: ids } } }),
  ]);
  const artifactCounts = new Map(artifactGroups.map((g) => [g.ownerId, g._count.ownerId]));
  const promptCounts = new Map(promptGroups.map((g) => [g.ownerId, g._count.ownerId]));
  const creditByUser = new Map(creditRows.map((c) => [c.userId, c.balance]));
  return profiles.map((p) => ({
    id: p.id,
    username: p.username,
    avatarUrl: p.avatarUrl,
    role: p.role as AdminUserDTO['role'],
    banned: p.banned,
    credits: creditByUser.get(p.id) ?? 0,
    createdAt: p.createdAt.toISOString(),
    artifactCount: artifactCounts.get(p.id) ?? 0,
    promptCount: promptCounts.get(p.id) ?? 0,
  }));
}

export function toModerationItem(
  targetType: 'prompt' | 'artifact',
  row: { id: string; title: string; reportCount: number; status: string; createdAt: Date },
  ownerUsername: string,
  body: string,
): ModerationItemDTO {
  return {
    targetType,
    targetId: row.id,
    title: row.title,
    body,
    ownerUsername,
    reportCount: row.reportCount,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}
