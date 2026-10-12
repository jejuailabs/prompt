import { createHash } from "node:crypto";

// Supabase's object API rejects Unicode keys. The manifest and preview URLs
// keep the original paths; only the provider's private object key is mapped.
export function objectKey(path: string) {
  const marker = "/files/";
  const at = path.indexOf(marker);
  if (at < 0) return path;
  const prefix = path.slice(0, at + marker.length);
  return prefix + createHash("sha256").update(path.slice(prefix.length)).digest("hex");
}
