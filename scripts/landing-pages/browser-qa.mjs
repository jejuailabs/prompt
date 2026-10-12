import kit from "../game-module-kit/browser.cjs";
import fs from "node:fs";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { zipSync } from "fflate";
const { chromium, options } = kit;
let browser;
const app = "http://127.0.0.1:4186",
  key = "local-fixture-key-20261011-not-for-production";
const sign = (user) =>
  user + "." + crypto.createHmac("sha256", key).update(user).digest("hex");
async function context(user = "test-owner", mobile = false) {
  const c = await browser.newContext({
    viewport: mobile
      ? { width: 390, height: 844 }
      : { width: 1440, height: 1000 },
    hasTouch: mobile,
    isMobile: mobile,
  });
  await c.addCookies([
    {
      name: "lp_test_session",
      value: sign(user),
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  return c;
}
async function open(c) {
  const p = await c.newPage();
  await p.goto(app + "/app#landing-pages");
  await p
    .getByRole("button", { name: "랜딩페이지 등록", exact: true })
    .waitFor({ timeout: 60000 });
  return p;
}
async function request(c, path, method = "GET", body) {
  const r = await c.request.fetch(app + path, {
    method,
    headers: { origin: app },
    ...(body !== undefined ? { data: body } : {}),
  });
  return { status: r.status(), json: await r.json() };
}
const card = (p, id) => p.locator('[data-landing-card="' + id + '"]');
async function preview(p, id, title) {
  await card(p, id)
    .getByRole("button", { name: title + " 미리보기", exact: true })
    .click();
  await p.locator("iframe").waitFor({ timeout: 30000 });
  const f = await (await p.locator("iframe").elementHandle()).contentFrame();
  await f.waitForURL((u) => u.pathname.includes("/landing-preview/"), {
    timeout: 60000,
  });
  await f.waitForFunction(() => document.readyState === "complete", null, {
    timeout: 60000,
  });
  return f;
}
async function close(p, f) {
  await f.press("body", "Escape");
  await p.locator("iframe").waitFor({ state: "detached" });
  assert.ok(f.isDetached());
}
async function upload(p, { title, zip, id }) {
  if (id)
    await card(p, id)
      .getByRole("button", { name: "ZIP 교체", exact: true })
      .click();
  else {
    await p
      .getByRole("button", { name: "랜딩페이지 등록", exact: true })
      .click();
    await p.getByLabel("제목", { exact: true }).fill(title);
    await p
      .getByLabel("간단한 설명", { exact: true })
      .fill("로컬 서버 저장·실제 모달 검증");
  }
  await p.getByLabel("ZIP 파일", { exact: true }).setInputFiles(zip);
  await p
    .getByRole("button", {
      name: id ? "검증 후 교체" : "업로드하고 저장",
      exact: true,
    })
    .click();
  await p
    .getByRole("button", {
      name: id ? "검증 후 교체" : "업로드하고 저장",
      exact: true,
    })
    .waitFor({ state: "detached", timeout: 90000 });
  const rows = (await request(p.context(), "/api/landing-pages")).json.data
    .pages;
  return id || rows.find((v) => v.title === title).id;
}
function fixture() {
  const wav = Buffer.alloc(480044);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(480036, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24);
  wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(480000, 40);
  const files = {
    "폴더 한 단계/index.html": Buffer.from(
      '<!doctype html><html><head><link rel="stylesheet" href="/assets/스타일.css"></head><body><h1>한글·공백 연결 확인</h1><img src="assets/우리 사진.svg"><button id="play">음성 재생</button><audio id="audio" src="/assets/소리.wav"></audio><a id="anchor" href="#second">내부 앵커</a><a id="other" href="other.html">다른 페이지</a><div style="height:1100px"></div><h2 id="second">두 번째 영역</h2><script src="/assets/동작.js"></script></body></html>',
    ),
    "폴더 한 단계/assets/스타일.css": Buffer.from(
      '@font-face{font-family:LocalTestFont;src:url("./프리텐 폰트.woff2") format("woff2")}body{font-family:LocalTestFont;background:#f3e8ce;margin:30px}img{width:70px}',
    ),
    "폴더 한 단계/assets/동작.js": Buffer.from(
      'fetch("/assets/data.json").then(r=>r.json()).then(v=>document.body.dataset.fetch=v.ok);document.body.dataset.ticks="0";setInterval(()=>{document.body.dataset.ticks=String(+document.body.dataset.ticks+1);parent.postMessage({source:"qa-heartbeat"},"*")},120);document.querySelector("#play").onclick=()=>document.querySelector("#audio").play();try{parent.document.cookie}catch{document.body.dataset.parentBlocked="yes"}',
    ),
    "폴더 한 단계/assets/우리 사진.svg": Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="40"><rect width="60" height="40" fill="coral"/></svg>',
    ),
    "폴더 한 단계/assets/data.json": Buffer.from('{"ok":"yes"}'),
    "폴더 한 단계/assets/프리텐 폰트.woff2": fs.readFileSync(
      "public/games/fonts/PretendardVariable.woff2",
    ),
    "폴더 한 단계/assets/소리.wav": wav,
    "폴더 한 단계/other.html": Buffer.from(
      '<!doctype html><html><body><h1 id="other-page">내부 페이지 연결 성공</h1></body></html>',
    ),
  };
  fs.writeFileSync("tmp/landing-qa/한글 폴더.zip", zipSync(files));
  fs.writeFileSync(
    "tmp/landing-qa/누락 파일.zip",
    zipSync({ "index.html": Buffer.from('<img src="/assets/누락.png">') }),
  );
  fs.writeFileSync("tmp/landing-qa/잘못된 ZIP.zip", Buffer.alloc(40, 65));
}
(async () => {
  browser = await chromium.launch(options());
  fixture();
  const owner = await context(),
    p = await open(owner),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const title = "남원 10주년 실제 검증 " + Date.now(),
    id = await upload(p, { title, zip: "tmp/landing-qa/남원 기념행사.zip" });
  let f = await preview(p, id, title);
  await f.waitForFunction(
    () => document.querySelectorAll("#wave b").length === 48,
  );
  assert.equal(await f.evaluate(() => document.cookie).catch(() => ""), "");
  await f.locator("[data-open-apply]").first().click();
  await f.locator("#nm").fill("테스트 사용자");
  await f.locator("#applyForm button.pill.tang").click();
  await f.locator("#toast.show").waitFor();
  assert.ok((await f.locator("#toast").innerText()).includes("신청 완료"));
  await f.locator("#ttFilter button").nth(1).click();
  assert.ok(await f.locator("#slots .slot.hide").count());
  await f.locator("#stamps .stamp").first().click();
  assert.ok((await f.locator("#stampMsg").innerText()).startsWith("1 / 4"));
  for (const img of await f.locator("img").all())
    await img.scrollIntoViewIfNeeded();
  await f.waitForFunction(() =>
    [...document.images].every((i) => i.complete && i.naturalWidth > 0),
  );
  const fonts = await f.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts]
      .filter((x) => x.status === "loaded")
      .map((x) => x.family);
  });
  assert.ok(fonts.some((s) => s.includes("Pretendard")));
  console.log(
    "PASS Namwon image/font/form/filter/stamp/animation; fonts " +
      [...new Set(fonts)].join(","),
  );
  await f.evaluate(() => scrollTo(0, 0));
  await p.getByRole("button", { name: "모바일 390", exact: true }).click();
  assert.equal(await f.evaluate(() => innerWidth), 390);
  await p.screenshot({ path: "tmp/landing-qa/namwon-mobile-view.png" });
  await p.getByRole("button", { name: "태블릿 768", exact: true }).click();
  assert.equal(await f.evaluate(() => innerWidth), 768);
  await p.screenshot({ path: "tmp/landing-qa/namwon-tablet-view.png" });
  const oldURL = f.url();
  await close(p, f);
  await p.waitForTimeout(500);
  assert.equal((await owner.request.get(oldURL)).status(), 403);
  for (let i = 0; i < 2; i++) {
    f = await preview(p, id, title);
    await f.locator("#wave b").nth(47).waitFor();
    await close(p, f);
  }
  console.log(
    "PASS iframe viewport widths, ESC removal, revoked URL and repeated reopen",
  );
  await p.reload();
  await card(p, id).waitFor();
  const other = await context("test-other");
  assert.equal(
    (await request(other, "/api/landing-pages")).json.data.pages.length,
    0,
  );
  for (const [method, path, body] of [
    ["POST", "/api/landing-pages/" + id + "/preview", {}],
    ["PATCH", "/api/landing-pages/" + id, { title: "attack" }],
    ["DELETE", "/api/landing-pages/" + id, {}],
    [
      "POST",
      "/api/landing-pages/" + id + "/upload",
      { fileName: "a.zip", size: 50 },
    ],
  ])
    assert.equal((await request(other, path, method, body)).status, 404);
  await owner.clearCookies();
  await p.reload();
  await p
    .getByRole("button", { name: /로그인하고 시작|로컬 테스트 계정으로 확인/ })
    .waitFor();
  await owner.addCookies([
    {
      name: "lp_test_session",
      value: sign("test-owner"),
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await p.reload();
  await card(p, id).waitFor();
  console.log(
    "PASS reload/relogin persistence and another user list/edit/replace/delete/preview blocked",
  );
  await card(p, id).getByRole("button", { name: "수정", exact: true }).click();
  await p.getByLabel("제목", { exact: true }).fill(title + " 수정");
  await p.getByLabel("간단한 설명", { exact: true }).fill("저장된 설명 수정");
  await p.getByRole("button", { name: "저장", exact: true }).click();
  await p
    .getByRole("button", { name: title + " 수정 미리보기", exact: true })
    .waitFor();
  await card(p, id)
    .getByRole("button", { name: "ZIP 교체", exact: true })
    .click();
  await p
    .getByLabel("ZIP 파일", { exact: true })
    .setInputFiles("tmp/landing-qa/누락 파일.zip");
  await p.getByRole("button", { name: "검증 후 교체", exact: true }).click();
  await p
    .getByRole("alert")
    .filter({ hasText: "필요한 파일" })
    .waitFor({ timeout: 90000 });
  await p.keyboard.press("Escape");
  let row = (await request(owner, "/api/landing-pages")).json.data.pages.find(
    (r) => r.id === id,
  );
  assert.equal(row.hasPreview, true);
  assert.equal(row.status, "failed");
  f = await preview(p, id, title + " 수정");
  await f.locator("#wave b").nth(47).waitFor();
  await close(p, f);
  console.log(
    "PASS failed replacement preserves actual old preview and shows missing filename",
  );
  await upload(p, { id, zip: "tmp/landing-qa/한글 폴더.zip" });
  f = await preview(p, id, title + " 수정");
  await f.waitForFunction(() => document.body.dataset.fetch === "yes");
  assert.equal(
    await f.evaluate(() => document.body.dataset.parentBlocked),
    "yes",
  );
  await f.waitForFunction(
    () => document.images[0].complete && document.images[0].naturalWidth > 0,
  );
  await f.evaluate(async () => {
    await document.fonts.load("20px LocalTestFont", "한글");
    await document.fonts.ready;
  });
  assert.ok(
    await f.evaluate(() =>
      [...document.fonts].some(
        (x) => x.family === "LocalTestFont" && x.status === "loaded",
      ),
    ),
  );
  const ticks = Number(await f.evaluate(() => document.body.dataset.ticks));
  await f.locator("#anchor").click();
  assert.ok(
    Number(await f.evaluate(() => document.body.dataset.ticks)) >= ticks,
  );
  await f.evaluate(() => scrollTo(0, 0));
  await f.locator("#play").click();
  assert.equal(await f.locator("#audio").evaluate((a) => a.paused), false);
  const mediaURL = await f.locator("#audio").evaluate((a) => a.src),
    range = await owner.request.get(mediaURL, {
      headers: { range: "bytes=0-43" },
    });
  assert.equal(range.status(), 206);
  assert.equal((await range.body()).length, 44);
  await p.evaluate(() => {
    window.heartbeats = 0;
    addEventListener("message", (e) => {
      if (e.data?.source === "qa-heartbeat") window.heartbeats++;
    });
  });
  await p.waitForTimeout(300);
  await close(p, f);
  await p.waitForTimeout(200);
  const after = await p.evaluate(() => window.heartbeats);
  await p.waitForTimeout(500);
  assert.equal(await p.evaluate(() => window.heartbeats), after);
  console.log(
    "PASS wrapped entry, root assets, Korean/spaces, local font, fetch, anchors, audio/range and stopped script after close",
  );
  f = await preview(p, id, title + " 수정");
  await f.locator("#other").click();
  await f.locator("#other-page").waitFor();
  await close(p, f);
  for (const name of ["잘못된 ZIP.zip", "누락 파일.zip"]) {
    await p
      .getByRole("button", { name: "랜딩페이지 등록", exact: true })
      .click();
    await p.getByLabel("제목", { exact: true }).fill("잘못된 파일 " + name);
    await p
      .getByLabel("ZIP 파일", { exact: true })
      .setInputFiles("tmp/landing-qa/" + name);
    await p
      .getByRole("button", { name: "업로드하고 저장", exact: true })
      .click();
    await p.getByRole("alert").first().waitFor({ timeout: 90000 });
    await p.keyboard.press("Escape");
  }
  assert.equal(
    (
      await request(owner, "/api/landing-pages", "POST", {
        title: "large",
        fileName: "large.zip",
        size: 50 * 1024 * 1024 + 1,
      })
    ).status,
    413,
  );
  const ticket = (
    await request(owner, "/api/landing-pages/" + id + "/preview", "POST", {})
  ).json.data;
  assert.equal(
    (
      await owner.request.get(
        ticket.url.replace(new URL(ticket.url).origin, app),
      )
    ).status(),
    403,
  );
  assert.equal(
    (
      await owner.request.get(new URL(ticket.url).origin + "/api/auth/session")
    ).status(),
    403,
  );
  await card(p, id).getByRole("button", { name: "삭제", exact: true }).click();
  await p.getByRole("button", { name: "취소", exact: true }).click();
  assert.ok(await card(p, id).count());
  await card(p, id).getByRole("button", { name: "삭제", exact: true }).click();
  await p.getByRole("button", { name: "삭제 확인", exact: true }).click();
  await card(p, id).waitFor({ state: "detached" });
  assert.equal((await owner.request.get(ticket.url)).status(), 404);
  console.log(
    "PASS invalid ZIP, missing file, server size cap, app-origin refusal, preview-host app denial, delete cancel/confirm and session revoked",
  );
  const mobile = await context("test-owner", true),
    mp = await open(mobile);
  assert.equal(
    await mp.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  await mp.screenshot({ path: "tmp/landing-qa/list-mobile.png" });
  assert.deepEqual(errors, []);
  await browser.close();
})().catch(async (e) => {
  console.error(e);
  await browser?.close();
  process.exitCode = 1;
});
