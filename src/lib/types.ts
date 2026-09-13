// PLAYLAB shared DTOs & types (client + server)
// Dates are ISO strings over the wire.

export type Locale = 'ko' | 'en';

export type ArtifactType =
  | 'image'
  | 'text'
  | 'video'
  | '3d_asset'
  | 'landing_page'
  | 'game'
  | 'app';

export type ExecutionTier = 'iframe' | 'webcontainer' | 'microvm';

export type ModuleStatus = 'active' | 'new' | 'beta' | 'coming-soon' | 'preparing';

export type ViewKey =
  | 'home'
  | 'gallery'
  | 'prompt'
  | 'prompt-wiki'
  | 'project'
  | 'lab'
  | 'pipelines'
  | 'pipeline-run'
  | 'smoke'
  | 'revenue'
  | 'market'
  | 'community'
  | 'academy'
  | 'ai-tools'
  | 'tool'
  | 'my-projects'
  | 'game-room'
  | 'game-play'
  | 'video-studio'
  | '3d-studio'
  | 'admin';

// ─── Users / Modules ───

export interface SessionUser {
  id: string;
  username: string;
  avatarUrl?: string | null;
  role: 'user' | 'admin';
  credits: number;
  title?: string | null;
}

export interface ModuleDTO {
  id: string;
  phase: number;
  titleKo: string;
  titleEn: string;
  descKo: string;
  descEn: string;
  icon: string;
  navOrder: number;
  enabled: boolean;
  status: ModuleStatus;
  newUntil: string | null;
  mainScreenSlot: string;
  entryView: string;
  requiresAuth: boolean;
  adminOnly: boolean;
  group?: string;
}

// ─── Academy / YouTube learning ───

export interface YoutubeChapter { title: string; summary: string; timestamp?: string; }

export interface YoutubeAnalysisDTO {
  id: string;
  videoId: string;
  sourceUrl: string;
  title: string;
  channelTitle: string;
  description: string;
  thumbnailUrl?: string | null;
  transcript: string;
  transcriptLanguage?: string | null;
  transcriptSource?: string | null;
  qualityWarning?: string | null;
  category?: string | null;
  summary: string;
  reportSummary: string;
  chapters: YoutubeChapter[];
  keywords: string[];
  commentsSummary: string;
  contextSummary: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  error?: string | null;
}

export interface AcademyVideoDTO {
  id: string;
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl?: string | null;
  sortOrder: number;
  analysis?: YoutubeAnalysisDTO | null;
}

export interface AcademyPlaylistDTO {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string | null;
  sortOrder: number;
  videos: AcademyVideoDTO[];
}

// ─── Artifact metadata JSON shapes ───

export interface LandingContent {
  hero: { title: string; subtitle: string; cta: string };
  sections: { title: string; body: string; bullets?: string[] }[];
  faq?: { q: string; a: string }[];
  footer: string;
}

export interface ArtifactStats {
  views: number;
  plays: number;
  likes: number;
  completionRate: number;
}

export interface ArtifactVersionEntry {
  version: string;
  date: string;
  note: string;
}

export interface ArtifactMetadata {
  tags?: string[];
  model?: string;
  params?: { aspect?: string; style?: string };
  frames?: string[]; // video slideshow keyframes
  content?: LandingContent; // landing_page template content
  stats?: ArtifactStats;
  versions?: ArtifactVersionEntry[];
  previewUrl?: string; // 3d texture preview
  duration?: string; // video duration badge e.g. "02:36"
  categoryLabel?: string;
}

export interface UserBrief {
  id: string;
  username: string;
  avatarUrl?: string | null;
  role?: string;
}

export interface ArtifactDTO {
  id: string;
  type: ArtifactType;
  title: string;
  description: string;
  ownerId: string;
  owner: UserBrief;
  sourcePromptId?: string | null;
  sourceModule?: string | null;
  fileUrl?: string | null;
  contentUrl?: string | null;
  metadata: ArtifactMetadata;
  executionTier?: ExecutionTier | null;
  status: 'draft' | 'published' | 'archived' | 'hidden';
  visibility: string;
  version: string;
  views: number;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

// ─── Prompts ───

export interface PromptDTO {
  id: string;
  title: string;
  body: string;
  category: string;
  modelTags: string[];
  thumbnailUrl?: string | null;
  ownerId: string;
  owner: UserBrief;
  forkedFromId?: string | null;
  status: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  forkCount: number;
  artifactCount: number;
  likedByMe: boolean;
}

export interface PromptVersionDTO {
  id: string;
  body: string;
  versionNote?: string | null;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
}

export interface PromptDetailDTO extends PromptDTO {
  versions: PromptVersionDTO[];
  artifacts: ArtifactDTO[];
  forkParent?: { id: string; title: string } | null;
}

export interface CommentDTO {
  id: string;
  targetType: string;
  targetId: string;
  body: string;
  createdAt: string;
  user: UserBrief;
}

// ─── Model Lab ───

export interface ProviderDTO {
  id: string;
  displayName: string;
  category: string;
  costPerUnit: number;
  marginRate: number;
  active: boolean;
}

export interface JobDTO {
  id: string;
  providerId: string;
  providerName?: string;
  promptText: string;
  aspect: string;
  style?: string | null;
  status: 'queued' | 'running' | 'done' | 'failed';
  creditCharged: number;
  error?: string | null;
  resultArtifact?: ArtifactDTO | null;
}

// ─── Credits ───

export interface TxDTO {
  id: string;
  amount: number;
  reason: string;
  relatedId?: string | null;
  createdAt: string;
}

export interface CreditStateDTO {
  balance: number;
  monthlyUsed: number;
  monthlyLimit: number;
  transactions: TxDTO[];
}

// ─── Pipelines ───

export interface PipelineDTO {
  id: string;
  displayNameKo: string;
  displayNameEn: string;
  descKo: string;
  descEn: string;
  icon: string;
  creditCost: number;
  wide: boolean;
  active: boolean;
}

export interface RunDTO {
  id: string;
  pipelineId: string;
  status: 'running' | 'done' | 'failed';
  progress: number;
  creditCharged: number;
  error?: string | null;
  resultArtifact?: ArtifactDTO | null;
  createdAt: string;
  completedAt?: string | null;
}

// ─── Smoke tests ───

export interface ReportMetrics {
  impressions: number;
  clicks: number;
  ctr: number;
  signups: number;
  conversions: number;
  cac: number;
  daily: { date: string; visitors: number; signups: number }[];
}

export interface SmokeTestDTO {
  id: string;
  artifactId: string;
  artifact?: Pick<ArtifactDTO, 'id' | 'title' | 'type' | 'fileUrl' | 'version' | 'metadata'> | null;
  requestedById: string;
  status: 'requested' | 'approved' | 'running' | 'completed';
  budget: number;
  days: number;
  requestedAt: string;
  completedAt?: string | null;
  report?: {
    metrics: ReportMetrics;
    recommendation: string[];
    successScore: number;
    createdAt: string;
  } | null;
}

// ─── Revenue ───

export interface RevenueShareDTO {
  id: string;
  artifactId: string;
  artifactTitle?: string;
  payeeUserId: string;
  sharePercent: number;
  amount: number;
  period: string;
  status: 'pending' | 'settled';
}

export interface RevenueOverviewDTO {
  account: { provider: string; status: string; externalAccountId?: string | null; totalEarned: number } | null;
  shares: RevenueShareDTO[];
  totals: { thisMonth: number; pending: number; lifetime: number };
  monthly: { month: string; amount: number }[];
}

// ─── Marketplace / Briefs ───

export interface ListingDTO {
  id: string;
  artifact: ArtifactDTO;
  revenueModel: 'ad_share' | 'paid' | 'freemium';
  price?: number | null;
  status: string;
  listedBy: UserBrief;
  createdAt: string;
}

export interface StructuredSpec {
  title: string;
  problem: string;
  targetUsers: string;
  features: string[];
  techStack: string[];
  pages: string[];
  effortWeeks: number;
  suggestedBudgetKrw: number;
  risks: string[];
}

export interface BidDTO {
  id: string;
  briefId: string;
  developer: UserBrief;
  proposal: string;
  price: number;
  etaDays: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface ContractDTO {
  id: string;
  revenueShareTerms: { developerShare: number; platformShare: number; milestones: string[]; notes: string };
  status: string;
  createdAt: string;
}

export interface BriefDTO {
  id: string;
  author: UserBrief;
  title: string;
  rawText: string;
  structuredSpec: StructuredSpec;
  category?: string | null;
  budget?: number | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'matched';
  createdAt: string;
  bidCount: number;
  bids?: BidDTO[];
  match?: { id: string; contract?: ContractDTO | null; bid?: BidDTO } | null;
}

// ─── Video Studio ───

export type VideoProjectStatus = 'draft' | 'storyboard' | 'generating' | 'editing' | 'rendering' | 'done' | 'failed';
export type ShotStatus = 'pending' | 'preview' | 'generating' | 'qc' | 'passed' | 'failed' | 'done';
export type RenderProfile = 'preview' | 'standard' | 'hero';
export type VideoModel =
  | 'h3'          // MiniMax H3 (Aug 2026) — FL2VA + Ref2VA unified
  | 'h3-fl2va'    // H3 FL2VA (text/image → video)
  | 'h3-ref2va'   // H3 Ref2VA (reference-guided)
  | 'wan26'       // Wan 2.6 (identity-consistent, RunPod managed serverless)
  | 'wan25'       // Wan 2.5 (audio+video single pass)
  | 'wan22'       // Wan 2.2 (self-hosted, downloadable weights)
  | 'ltx25'       // LTX-2.5 (Aug 2026) — 22B world model, multishot + audio
  | 'ltx23'       // LTX-2.3 (older stable)
  | 'ltx2';       // LTX-2.0 (legacy)

export type VideoEngineId = 'h3' | 'wan' | 'ltx';

export interface VideoEngineModelInfo {
  id: VideoModel;
  label: string;
  version: string;
  params: string;
  license: string;
  runpodType: 'self-hosted' | 'managed' | 'api-only';
  minGpu: string;
  features: string[];
}

export interface VideoEngineConfig {
  engineId: VideoEngineId;
  label: string;
  description: string;
  enabled: boolean;
  adminOnly: boolean;
  defaultModel: VideoModel;
  models: VideoEngineModelInfo[];
  runpodEndpointId?: string | null;
  runpodNetworkVolumeId?: string | null;
  storageCostMonthly: string;
  status: 'offline' | 'ready' | 'provisioning' | 'error';
  lastCheckedAt?: string | null;
}

export interface QcResult {
  identity: { pass: boolean; score: number };
  costume: { pass: boolean; score: number };
  flicker: { pass: boolean; score: number };
  motion: { pass: boolean; score: number };
  lipSync: { pass: boolean; score: number };
}

export interface VideoShotDTO {
  id: string;
  projectId: string;
  shotIndex: number;
  narration: string;
  prompt: string;
  startSec: number;
  endSec: number;
  model: VideoModel;
  renderProfile: RenderProfile;
  importance: number;
  referencePackIds: string[];
  continuityFrameUrl?: string | null;
  status: ShotStatus;
  resultUrl?: string | null;
  thumbnailUrl?: string | null;
  qcResult?: QcResult | null;
  qcAttempts: number;
  seed?: number | null;
  generationParams?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface VideoProjectDTO {
  id: string;
  ownerId: string;
  owner?: UserBrief;
  title: string;
  script: string;
  style: string;
  targetDurationSec: number;
  status: VideoProjectStatus;
  directorBible?: Record<string, unknown> | null;
  masterAudioUrl?: string | null;
  resultArtifactId?: string | null;
  creditCharged: number;
  shots?: VideoShotDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface ReferenceImageDTO {
  id: string;
  packId: string;
  role: string;
  fileUrl: string;
  sortOrder: number;
  metadata?: Record<string, unknown>;
}

export interface ReferencePackDTO {
  id: string;
  ownerId: string;
  name: string;
  category: 'character' | 'prop' | 'location';
  metadata?: Record<string, unknown>;
  images: ReferenceImageDTO[];
  createdAt: string;
}

// ─── 3D Asset Studio ───

export type Asset3dSubtrack = 'character' | 'product' | 'floorplan';
export type Asset3dProjectStatus = 'draft' | 'generating' | 'processing' | 'done' | 'failed';

export interface Asset3dOutputDTO {
  id: string;
  projectId: string;
  glbUrl: string;
  fbxUrl?: string | null;
  textureUrls?: Record<string, string>;
  thumbnailUrl?: string | null;
  polyCount?: number;
  dimensions?: { width: number; height: number; depth: number } | null;
  qcResult?: Record<string, unknown>;
  createdAt: string;
}

export interface Asset3dProjectDTO {
  id: string;
  ownerId: string;
  owner?: UserBrief;
  title: string;
  subtrack: Asset3dSubtrack;
  status: Asset3dProjectStatus;
  inputImageUrls: string[];
  styleOptions?: Record<string, unknown>;
  resultArtifactId?: string | null;
  creditCharged: number;
  outputs?: Asset3dOutputDTO[];
  createdAt: string;
  updatedAt: string;
}

// ─── Compute Jobs (shared) ───

export interface ComputeJobDTO {
  id: string;
  ownerId: string;
  track: 'video' | '3d';
  provider: string;
  externalJobId?: string | null;
  gpuType: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  costUsd: number;
  durationSec: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  completedAt?: string | null;
}

// ─── Admin / Events ───

export interface AdminUserDTO {
  id: string;
  username: string;
  avatarUrl?: string | null;
  role: 'user' | 'admin';
  banned: boolean;
  credits: number;
  createdAt: string;
  artifactCount: number;
  promptCount: number;
}

export interface ModerationItemDTO {
  targetType: 'prompt' | 'artifact';
  targetId: string;
  title: string;
  body: string;
  ownerUsername: string;
  reportCount: number;
  status: string;
  createdAt: string;
}

export interface EventDTO {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
}
