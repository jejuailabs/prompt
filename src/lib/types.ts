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
