// Explicit development-only integration fixture. Production always uses Prisma + private object storage.
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs/promises";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createHmac } from "node:crypto";
import { LandingError } from "./errors";
import { localMode } from "./local-auth";
import type { LandingRecord, LandingRepository, LandingStorage } from "./types";
function root() {
  if (!localMode())
    throw new LandingError(
      "로컬 테스트 저장소는 개발 환경에서만 사용할 수 있습니다.",
      503,
    );
  return path.resolve(process.env.LANDING_LOCAL_ROOT || "tmp/landing-local");
}
let database: DatabaseSync | undefined;
function sql() {
  root();
  if (database) return database;
  mkdirSync(root(), { recursive: true });
  database = new DatabaseSync(path.join(root(), "metadata.sqlite"));
  database.exec(
    "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS LandingFixture(id TEXT PRIMARY KEY,ownerId TEXT NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL,metadata TEXT NOT NULL,createdAt TEXT NOT NULL); CREATE INDEX IF NOT EXISTS landing_owner ON LandingFixture(ownerId,createdAt);",
  );
  return database;
}
function file(key: string) {
  const base = path.join(root(), "objects"),
    dest = path.resolve(base, key);
  if (!dest.startsWith(base + path.sep))
    throw new LandingError("잘못된 객체 저장 경로입니다.");
  return dest;
}
export const localRepository: LandingRepository = {
  async list(owner) {
    return sql()
      .prepare(
        "SELECT * FROM LandingFixture WHERE ownerId=? ORDER BY createdAt DESC",
      )
      .all(owner) as unknown as LandingRecord[];
  },
  async get(id) {
    return (sql().prepare("SELECT * FROM LandingFixture WHERE id=?").get(id) ||
      null) as unknown as LandingRecord | null;
  },
  async create(r) {
    sql()
      .prepare("INSERT INTO LandingFixture VALUES(?,?,?,?,?,?)")
      .run(
        r.id,
        r.ownerId,
        r.title,
        r.description,
        r.metadata,
        new Date(r.createdAt).toISOString(),
      );
  },
  async compareSwap(r, data) {
    const next = { ...r, ...data };
    return (
      sql()
        .prepare(
          "UPDATE LandingFixture SET title=CASE WHEN ? THEN ? ELSE title END,description=CASE WHEN ? THEN ? ELSE description END,metadata=? WHERE id=? AND ownerId=? AND metadata=?",
        )
        .run(
          data.title === undefined ? 0 : 1,
          data.title ?? "",
          data.description === undefined ? 0 : 1,
          data.description ?? "",
          next.metadata,
          r.id,
          r.ownerId,
          r.metadata,
        ).changes === 1
    );
  },
  async delete(r) {
    return (
      sql()
        .prepare(
          "DELETE FROM LandingFixture WHERE id=? AND ownerId=? AND metadata=?",
        )
        .run(r.id, r.ownerId, r.metadata).changes === 1
    );
  },
};
export const localStorage: LandingStorage = {
  async check() {
    await fs.mkdir(path.join(root(), "objects"), { recursive: true });
  },
  async signedUpload(key) {
    const body = Buffer.from(
        JSON.stringify({ path: key, expiresAt: Date.now() + 2 * 3600_000 }),
      ).toString("base64url"),
      token =
        body +
        "." +
        createHmac("sha256", process.env.LANDING_LOCAL_TEST_KEY!)
          .update(body)
          .digest("base64url");
    return {
      bucket: "landing-pages",
      path: key,
      token,
      endpoint: process.env.LANDING_LOCAL_UPLOAD_ORIGIN! + "/upload",
    };
  },
  async read(key, max) {
    const target = file(key),
      info = await fs.stat(target).catch(() => null);
    if (!info) throw new LandingError("로컬 객체가 없습니다.", 404);
    if (info.size > max)
      throw new LandingError("객체 용량 제한을 초과했습니다.", 413);
    return fs.readFile(target);
  },
  async put(key, data) {
    const target = file(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, data, { flag: "wx" });
  },
  async remove(keys) {
    for (const key of keys) await fs.rm(file(key), { force: true });
  },
};
