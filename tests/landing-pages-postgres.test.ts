import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { LIMITS } from "../src/modules/landing-pages/types";
import { LandingError } from "../src/modules/landing-pages/errors";
test("real PostgreSQL migration, owner queries, atomic name preservation and private ACL", async () => {
  const pg = new PGlite();
  await pg.exec(
    "CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]); CREATE TABLE storage.objects(id integer,bucket_id text); ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; GRANT USAGE ON SCHEMA storage TO anon,authenticated,service_role; GRANT SELECT ON storage.objects TO anon,authenticated,service_role; CREATE POLICY existing_broad_read ON storage.objects FOR SELECT TO anon,authenticated USING(true);",
  );
  await pg.exec(
    fs.readFileSync(
      "supabase/migrations/20261011102243_landing_pages_private_storage.sql",
      "utf8",
    ),
  );
  const owner = randomUUID(),
    other = randomUUID();
  await pg.query("INSERT INTO auth.users(id) VALUES($1),($2)", [owner, other]);
  function query(strings: TemplateStringsArray, ...params: unknown[]) {
    let sql = strings[0];
    params.forEach((_, i) => {
      sql += "$" + (i + 1) + strings[i + 1];
    });
    return pg.query(
      sql,
      params.map((p) => (p instanceof Date ? p.toISOString() : p)),
    );
  }
  const fakeDb = {
    $queryRaw: async (s: TemplateStringsArray, ...p: unknown[]) =>
      (await query(s, ...p)).rows,
    $executeRaw: async (s: TemplateStringsArray, ...p: unknown[]) =>
      Number((await query(s, ...p)).affectedRows),
  };
  const exports: any = {},
    source = ts.transpileModule(
      fs.readFileSync("src/modules/landing-pages/adapters.ts", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText;
  vm.runInNewContext(source, {
    exports,
    require: (name: string) => {
      if (name === "server-only") return {};
      if (name === "@/lib/db") return { db: fakeDb };
      if (name === "@/lib/supabase/admin") return { supaAdmin: { storage: { from: (bucket: string) => ({ createSignedUploadUrl: async (path: string, options: {upsert: boolean}) => { assert.equal(bucket,"landing-pages"); assert.equal(options.upsert,false); return {data:{token:"test-signed-capability",path},error:null}; } }) } } };
      if (name === "./errors") return { LandingError };
      if (name === "./types") return { LIMITS };
      throw Error("Unexpected import " + name);
    },
    Buffer,
    URL,
    process: {env:{NEXT_PUBLIC_SUPABASE_URL:"https://exampleproject.supabase.co",NEXT_PUBLIC_SUPABASE_ANON_KEY:"test-public-key"}},
    Date,
  });
  const upload=await exports.storage.signedUpload("owner/page/version/upload.zip");
  assert.equal(upload.endpoint,"https://exampleproject.storage.supabase.co/storage/v1/upload/resumable/sign");
  assert.equal(upload.token,"test-signed-capability");
  assert.equal(upload.path,"owner/page/version/upload.zip");
  const repository = exports.repository,
    meta = {
      schema: 1,
      active: null,
      upload: null,
      versions: [],
      sessions: [],
    },
    record = {
      id: randomUUID(),
      ownerId: owner,
      title: "한글 이름",
      description: "original",
      metadata: JSON.stringify(meta),
      createdAt: new Date(),
    };
  await repository.create(record);
  assert.equal((await repository.list(owner)).length, 1);
  assert.equal((await repository.list(other)).length, 0);
  const old = await repository.get(record.id),
    editing = await repository.get(record.id);
  assert.equal(
    await repository.compareSwap(editing, {
      title: "name changed during upload",
      description: "new description",
    }),
    true,
  );
  assert.equal(
    await repository.compareSwap(old, {
      metadata: JSON.stringify({ ...meta, upload: { state: "processing" } }),
    }),
    true,
  );
  const saved = await repository.get(record.id);
  assert.equal(saved.title, "name changed during upload");
  assert.equal(saved.description, "new description");
  assert.equal(
    await repository.compareSwap(old, { metadata: JSON.stringify(meta) }),
    false,
  );
  for (const role of ["anon", "authenticated"]) {
    await pg.exec("SET ROLE " + role);
    await assert.rejects(
      () => pg.query("SELECT * FROM landing_private.pages"),
      /permission denied/,
    );
    await pg.exec("RESET ROLE");
  }
  await pg.exec(
    "INSERT INTO storage.objects VALUES(1,'uploads'),(2,'landing-pages');SET ROLE anon;",
  );
  assert.deepEqual(
    (await pg.query("SELECT bucket_id FROM storage.objects")).rows,
    [{ bucket_id: "uploads" }],
  );
  await pg.exec("RESET ROLE;SET ROLE service_role;");
  assert.equal(
    (await pg.query("SELECT * FROM landing_private.pages")).rows.length,
    1,
  );
  await pg.exec("RESET ROLE");
  const bucket = await pg.query<{ public: boolean; file_size_limit: number }>(
    "SELECT public,file_size_limit FROM storage.buckets WHERE id='landing-pages'",
  );
  assert.equal(bucket.rows[0].public, false);
  assert.equal(Number(bucket.rows[0].file_size_limit), 52428800);
  assert.equal(await repository.delete(saved), true);
  assert.equal(await repository.get(record.id), null);
  await pg.close();
});
