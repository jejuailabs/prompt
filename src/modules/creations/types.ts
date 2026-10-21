import type { LandingMetadata, LandingRecord, LandingRepository } from "../landing-pages/types";

export const CATEGORIES = { solution: "솔루션", tool: "도구", game: "게임", landing_page: "랜딩페이지", other: "기타" } as const;
export type Category = keyof typeof CATEGORIES;
export type SourceVisibility = "private" | "public";
export interface CreationInfo {
  category: Category;
  demoUrl: string;
  repositoryUrl: string;
  sourceVisibility: SourceVisibility;
  allowPreview: boolean;
  license: string;
  instructions: string;
}
export interface SourceVersion {
  id: string;
  zipPath: string;
  sha256: string;
  bytes: number;
  fileCount: number;
  createdAt: string;
  commit: string | null;
  repositoryUrl: string;
  checks: string[];
  previewReason: string;
}
export interface CreationMetadata extends LandingMetadata {
  info: CreationInfo;
  publication: "draft" | "published";
  source: SourceVersion | null;
  sourceVersions: SourceVersion[];
  audit: { status: "unscanned" | "checked" | "blocked"; checkedAt: string | null; message: string };
}
export interface CreationDTO extends CreationInfo {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  createdAt: string;
  publication: "draft" | "published";
  status: string;
  error: string | null;
  audit: CreationMetadata["audit"];
  hasPreview: boolean;
  canDownload: boolean;
  source: Omit<SourceVersion, "zipPath"> | null;
}
export interface CreationRepository extends LandingRepository {
  publicList(limit: number, offset: number): Promise<LandingRecord[]>;
}
export type CreationInput = Partial<CreationInfo> & { title?: unknown; description?: unknown };
export type PreviewTicket = { sessionId: string; url: string; expiresAt: number };
