import test from "node:test";
import assert from "node:assert/strict";
import { zipSync } from "fflate";
import { unpackZip, findEntry } from "../src/modules/landing-pages/zip";
import {
  inspectBundle,
  renderFile,
} from "../src/modules/landing-pages/resources";
import { LandingService, metadata } from "../src/modules/landing-pages/service";
import { LIMITS, type LandingRecord } from "../src/modules/landing-pages/types";
import { isolatedOrigins } from "../src/modules/landing-pages/origins";
const bytes = (s: string) => Buffer.from(s),
  zip = (files: Record<string, string | Buffer>) =>
    zipSync(
      Object.fromEntries(
        Object.entries(files).map(([p, s]) => [
          p,
          typeof s === "string" ? bytes(s) : s,
        ]),
      ),
      { level: 6 },
    );
const bundle = () =>
  zip({
    "index.html":
      '<!doctype html><html><head><link rel="stylesheet" href="/assets/site.css"></head><body><img src="assets/한글 사진.svg"><a href="about/">inside</a><script src="/assets/site.js"></script></body></html>',
    "assets/site.css": 'body{background:url("./한글%20사진.svg")}',
    "assets/site.js":
      'fetch("/assets/data.json").then(r=>r.json()).then(v=>document.body.dataset.ok=v.ok);',
    "assets/data.json": '{"ok":"yes"}',
    "assets/한글 사진.svg":
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>',
    "about/index.html": "<h1>About</h1>",
  });
test("root and one wrapper preserve UTF-8 names and choose only one index", () => {
  const files = unpackZip(bundle());
  assert.equal(findEntry(files).entry, "index.html");
  assert.ok(files.has("assets/한글 사진.svg"));
  const wrapped = new Map([...files].map(([p, b]) => ["파일 묶음/" + p, b]));
  assert.equal(findEntry(wrapped).siteRoot, "파일 묶음/");
  assert.throws(
    () => findEntry(new Map([["deep/folder/index.html", bytes("")]])),
    /index.html/,
  );
  assert.throws(
    () =>
      findEntry(
        new Map([
          ["a/index.html", bytes("")],
          ["b/index.html", bytes("")],
        ]),
      ),
    /여러/,
  );
});
test("HTML CSS JS root and relative references are checked and prefixed", () => {
  const files = unpackZip(bundle()),
    m = inspectBundle(files, "https://app.example.com"),
    prefix = "https://preview.example.net/landing-preview/ticket";
  assert.equal(m.files.length, 6);
  const html = renderFile(
    "index.html",
    files.get("index.html")!,
    m,
    prefix,
    "session",
  ).toString();
  assert.ok(html.includes(prefix + "/assets/site.css"));
  assert.ok(
    html.includes(prefix + "/assets/" + encodeURIComponent("한글 사진.svg")),
  );
  assert.ok(html.includes(prefix + "/about/index.html"));
  assert.ok(html.includes('<base href="'));
  assert.ok(!html.includes("srcdoc"));
  const css = renderFile(
    "assets/site.css",
    files.get("assets/site.css")!,
    m,
    prefix,
    "session",
  ).toString();
  assert.ok(
    css.includes(prefix + "/assets/" + encodeURIComponent("한글 사진.svg")),
  );
  const js = renderFile(
    "assets/site.js",
    files.get("assets/site.js")!,
    m,
    prefix,
    "session",
  ).toString();
  assert.ok(js.includes(prefix + "/assets/data.json"));
});
test("missing assets, bare imports and unsupported dynamic fetch explain cause", () => {
  assert.throws(
    () =>
      inspectBundle(
        unpackZip(zip({ "index.html": '<img src="/assets/missing.png">' })),
      ),
    /missing.png/,
  );
  assert.throws(
    () =>
      inspectBundle(
        unpackZip(
          zip({
            "index.html":
              '<script type="module">import x from "react";</script>',
          }),
        ),
      ),
    /npm/,
  );
  assert.throws(
    () =>
      inspectBundle(
        unpackZip(
          zip({ "index.html": '<script>fetch("assets/"+name)</script>' }),
        ),
      ),
    /동적/,
  );
  assert.throws(
    () =>
      inspectBundle(
        unpackZip(zip({ "index.html": '<base href="/"><img src="x">' })),
      ),
    /base/,
  );
});
test("external public HTTPS fonts allowed, private/app URLs rejected", () => {
  const m = inspectBundle(
    unpackZip(
      zip({
        "index.html":
          '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter"><link rel="preconnect" href="https://fonts.gstatic.com">',
      }),
    ),
    "https://app.example.com",
  );
  assert.equal(m.externalOrigins.length, 2);
  for (const src of [
    "http://example.org/a.js",
    "https://127.0.0.1/a.js",
    "https://app.example.com/a.js",
    "file:///tmp/a.js",
  ])
    assert.throws(() =>
      inspectBundle(
        unpackZip(zip({ "index.html": '<script src="' + src + '"></script>' })),
        "https://app.example.com",
      ),
    );
});
test("unsafe paths, server/secret/nested archive files are blocked", () => {
  for (const name of [
    "../index.html",
    "/index.html",
    "C:/index.html",
    "folder/.env",
    "folder/node_modules/x.js",
    "server.php",
    "nested.zip",
    "package.json",
  ])
    assert.throws(
      () => unpackZip(zip({ [name]: "not executable" })),
      /경로|비밀|지원|빌드/,
    );
  assert.throws(() => unpackZip(bytes("not ZIP")), /ZIP/);
  assert.throws(
    () =>
      unpackZip(
        zip({
          "index.html": "<h1>ok</h1>",
          "fake.png": Buffer.from([80, 75, 3, 4, 0, 0]),
        }),
      ),
    /중첩/,
  );
});
test("CRC, symlinks and compressed/expanded/count limits validated before extraction", () => {
  const original = Buffer.from(bundle()),
    bad = Buffer.from(original),
    central = bad.indexOf(Buffer.from([80, 75, 1, 2]));
  bad.writeUInt32LE(0xa0000000, central + 38);
  assert.throws(() => unpackZip(bad), /심볼릭/);
  const corrupt = Buffer.from(original);
  corrupt[45] ^= 1;
  assert.throws(() => unpackZip(corrupt));
  assert.throws(
    () => unpackZip(original, { ...LIMITS, zipBytes: 100 }),
    /50MB/,
  );
  assert.throws(
    () => unpackZip(original, { ...LIMITS, totalBytes: 30 }),
    /용량/,
  );
  assert.throws(() => unpackZip(original, { ...LIMITS, files: 1 }), /파일 수/);
  assert.throws(
    () => unpackZip(zip({ "index.html": "A".repeat(1024 * 1024 + 1) })),
    /압축 비율/,
  );
});
test("preview site must be cookie-isolated, not just another port or sibling subdomain", () => {
  assert.throws(
    () =>
      isolatedOrigins("https://app.example.com", "https://preview.example.com"),
    /분리/,
  );
  assert.throws(
    () => isolatedOrigins("http://localhost:4000", "http://localhost:5000"),
    /분리/,
  );
  assert.equal(
    isolatedOrigins("http://127.0.0.1:4186", "http://localhost:4186")
      .previewOrigin,
    "http://localhost:4186",
  );
});
function fixture() {
  const rows = new Map<string, LandingRecord>(),
    objects = new Map<string, Buffer>();
  let fail = false;
  const repo = {
    async list(owner: string) {
      return [...rows.values()]
        .filter((r) => r.ownerId === owner)
        .map((r) => structuredClone(r));
    },
    async get(id: string) {
      return rows.has(id) ? structuredClone(rows.get(id)!) : null;
    },
    async create(r: LandingRecord) {
      rows.set(r.id, structuredClone(r));
    },
    async compareSwap(r: LandingRecord, data: Partial<LandingRecord>) {
      const current = rows.get(r.id);
      if (!current || current.metadata !== r.metadata) return false;
      rows.set(r.id, { ...current, ...data });
      return true;
    },
    async delete(r: LandingRecord) {
      if (rows.get(r.id)?.metadata !== r.metadata) return false;
      return rows.delete(r.id);
    },
  };
  const storage = {
    async check() {},
    async signedUpload(path: string) {
      return {
        bucket: "private",
        path,
        token: "write-only",
        endpoint: "https://objects.example.net/tus",
      };
    },
    async read(path: string, max: number) {
      const b = objects.get(path);
      if (!b) throw Error("missing object");
      if (b.length > max) throw Error("large");
      return b;
    },
    async put(path: string, data: Uint8Array) {
      if (fail) throw Error("simulated storage failure");
      objects.set(path, Buffer.from(data));
    },
    async remove(paths: string[]) {
      paths.forEach((p) => objects.delete(p));
    },
  };
  const service = new LandingService(repo, storage, {
    appOrigin: "https://app.example.com",
    previewOrigin: "https://preview.example.net",
    secret: "unit-test-preview-secret-with-at-least-32-bytes",
  });
  return {
    service,
    rows,
    objects,
    fail: () => {
      fail = true;
    },
  };
}
async function register(
  f: ReturnType<typeof fixture>,
  data = bundle(),
  id?: string,
) {
  const d = await f.service.begin("owner", {
    id,
    title: "남원",
    description: "행사",
    fileName: "남원 ZIP.zip",
    size: data.length,
  });
  f.objects.set(d.path, Buffer.from(data));
  return { d, result: await f.service.complete("owner", d.id, d.versionId) };
}
test("registration persists metadata/files and private owner checks cover every operation", async () => {
  const f = fixture(),
    { d } = await register(f);
  assert.equal((await f.service.list("owner"))[0].hasPreview, true);
  assert.equal((await f.service.list("other")).length, 0);
  for (const action of [
    () => f.service.owned(d.id, "other"),
    () => f.service.open("other", d.id),
    () => f.service.edit("other", d.id, { title: "x" }),
    () => f.service.remove("other", d.id),
  ])
    await assert.rejects(action, /찾을 수/);
  await f.service.edit("owner", d.id, {
    title: "한글 이름",
    description: "수정",
  });
  assert.equal((await f.service.list("owner"))[0].title, "한글 이름");
});
test("bad replacement preserves previous version/session; good replacement switches and revokes old", async () => {
  const f = fixture(),
    { d } = await register(f),
    ticket = await f.service.open("owner", d.id),
    token = ticket.url.split("/landing-preview/")[1].split("/")[0];
  const original = metadata(f.rows.get(d.id)!).active!.id;
  await assert.rejects(
    () => register(f, zip({ "index.html": '<img src="missing.png">' }), d.id),
    /필요한 파일/,
  );
  assert.equal(metadata(f.rows.get(d.id)!).active!.id, original);
  const served = await f.service.serve(
    token,
    "index.html",
    "https://preview.example.net",
  );
  assert.ok(served.headers["Content-Type"].startsWith("text/html"));
  assert.ok(
    !served.headers["Content-Security-Policy"].includes("allow-same-origin"),
  );
  await register(f, zip({ "index.html": "<h1>NEW VERSION</h1>" }), d.id);
  assert.notEqual(metadata(f.rows.get(d.id)!).active!.id, original);
  await assert.rejects(
    () => f.service.serve(token, "index.html", "https://preview.example.net"),
    /교체된/,
  );
});
test("storage failure leaves previous files active; close and deletion revoke preview", async () => {
  const f = fixture(),
    { d } = await register(f),
    first = metadata(f.rows.get(d.id)!).active!.id;
  f.fail();
  await assert.rejects(() => register(f, bundle(), d.id), /저장에 실패/);
  assert.equal(metadata(f.rows.get(d.id)!).active!.id, first);
  const ticket = await f.service.open("owner", d.id),
    token = ticket.url.split("/landing-preview/")[1].split("/")[0];
  await assert.rejects(
    () => f.service.serve(token, "index.html", "https://app.example.com"),
    /출처/,
  );
  await assert.rejects(
    () =>
      f.service.serve(token + "x", "index.html", "https://preview.example.net"),
    /유효/,
  );
  await f.service.close("owner", d.id, ticket.sessionId);
  await assert.rejects(
    () => f.service.serve(token, "index.html", "https://preview.example.net"),
    /종료/,
  );
  await f.service.remove("owner", d.id);
  assert.equal(f.objects.size, 0);
  assert.equal(f.rows.size, 0);
});
