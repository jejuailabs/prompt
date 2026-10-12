export const LIMITS = {
  zipBytes: 50 * 1024 * 1024,
  totalBytes: 150 * 1024 * 1024,
  fileBytes: 20 * 1024 * 1024,
  textBytes: 2 * 1024 * 1024,
  files: 1000,
  ratio: 200,
} as const;
export interface StaticFile {
  path: string;
  bytes: number;
  contentType: string;
  sha256: string;
}
export interface BundleManifest {
  entry: string;
  siteRoot: string;
  files: StaticFile[];
  externalOrigins: string[];
  warnings: string[];
  totalBytes: number;
}
export interface LandingVersion {
  id: string;
  prefix: string;
  zipPath: string;
  manifest: BundleManifest;
  createdAt: string;
}
export interface LandingUpload {
  id: string;
  prefix: string;
  zipPath: string;
  size: number;
  fileName: string;
  state: "uploading" | "processing" | "failed" | "ready";
  error?: string;
  startedAt: string;
  files?: StaticFile[];
}
export interface LandingSession {
  id: string;
  hash: string;
  versionId: string;
  expiresAt: number;
}
export interface LandingMetadata {
  schema: 1;
  active: LandingVersion | null;
  upload: LandingUpload | null;
  versions: LandingVersion[];
  sessions: LandingSession[];
  deleting?: boolean;
}
export interface LandingRecord {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  metadata: string;
  createdAt: Date | string;
}
export interface LandingDTO {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  status: string;
  error: string | null;
  hasPreview: boolean;
  version: string | null;
  fileCount: number;
  bytes: number;
  warnings: string[];
}
export interface LandingRepository {
  list(ownerId: string): Promise<LandingRecord[]>;
  get(id: string): Promise<LandingRecord | null>;
  create(record: LandingRecord): Promise<void>;
  compareSwap(
    record: LandingRecord,
    data: Partial<Pick<LandingRecord, "title" | "description" | "metadata">>,
  ): Promise<boolean>;
  delete(record: LandingRecord): Promise<boolean>;
}
export interface UploadDestination {
  endpoint: string;
  token: string;
  bucket: string;
  path: string;
}
export interface LandingStorage {
  check(): Promise<void>;
  signedUpload(path: string): Promise<UploadDestination>;
  read(path: string, maxBytes: number): Promise<Buffer>;
  put(path: string, data: Uint8Array, contentType: string): Promise<void>;
  remove(paths: string[]): Promise<void>;
}

export const uploadExpired = (upload: LandingUpload) =>
  Date.now() - Date.parse(upload.startedAt) >
  (upload.state === "processing" ? 10 * 60_000 : 2 * 3600_000);
