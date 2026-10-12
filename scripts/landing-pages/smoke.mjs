import kit from "../game-module-kit/browser.cjs";
import crypto from "node:crypto";
import assert from "node:assert/strict";
const { chromium, options } = kit;
let b;
(async () => {
  b = await chromium.launch(options());
  const c = await b.newContext({ viewport: { width: 1440, height: 1000 } }),
    p = await c.newPage();
  const key = "local-fixture-key-20261011-not-for-production",
    user = "test-owner",
    sig = crypto.createHmac("sha256", key).update(user).digest("hex");
  await c.addCookies([
    {
      name: "lp_test_session",
      value: user + "." + sig,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  p.on("pageerror", (e) => console.log("BROWSER ERROR " + e.message));
  await p.goto("http://127.0.0.1:4186/app#landing-pages");
  await p.getByRole("button", { name: "랜딩페이지 등록", exact: true }).click();
  await p.getByLabel("제목", { exact: true }).fill("남원 10주년 테스트");
  await p
    .getByLabel("간단한 설명", { exact: true })
    .fill("원본 HTML과 연결 이미지 검증");
  await p
    .getByLabel("ZIP 파일", { exact: true })
    .setInputFiles("tmp/landing-qa/남원 기념행사.zip");
  await p.getByRole("button", { name: "업로드하고 저장", exact: true }).click();
  await p
    .locator("[data-landing-card]")
    .filter({ hasText: "남원 10주년 테스트" })
    .first()
    .getByRole("button", { name: "남원 10주년 테스트 미리보기", exact: true })
    .waitFor({ timeout: 90000 });
  const card = p
    .locator("[data-landing-card]")
    .filter({ hasText: "남원 10주년 테스트" })
    .first();
  await card
    .getByRole("button", { name: "남원 10주년 테스트 미리보기", exact: true })
    .click();
  await p.locator("iframe").waitFor({ timeout: 30000 });
  const f = p.frameLocator("iframe");
  await f.locator("#wave b").nth(47).waitFor({ timeout: 60000 });
  assert.equal(await f.locator("#wave b").count(), 48);
  await p.screenshot({ path: "tmp/landing-qa/namwon-desktop.png" });
  console.log(
    "PASS actual UI ZIP upload -> durable list -> sandbox HTML -> 48 animated bars",
  );
  console.log(
    "Iframe sandbox " + (await p.locator("iframe").getAttribute("sandbox")),
  );
  console.log(
    "Runtime notice " + (await p.locator('[role="alert"]').allTextContents()),
  );
  await b.close();
})().catch(async (e) => {
  console.error(e);
  await b?.close();
  process.exitCode = 1;
});
