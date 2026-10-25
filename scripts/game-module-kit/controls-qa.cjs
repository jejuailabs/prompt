const { chromium, options } = require('./browser.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.GAME_CONTROLS_URL || 'http://127.0.0.1:4180';
let browser;
(async () => {
  browser = await chromium.launch(options());
  const games = fs.readdirSync('public/games').filter(id => {
    const manifest = `public/games/${id}/game.manifest.json`;
    return fs.existsSync(manifest) && !['cat-reaction', 'endless-ward'].includes(id);
  });
  for (const viewport of [{ width: 1100, height: 820 }, { width: 390, height: 700 }, { width: 844, height: 390 }]) {
    const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 500, isMobile: viewport.width < 500 });
    for (const id of games) {
      const p = await ctx.newPage(), errors = [];
      p.on('pageerror', error => errors.push(error.message));
      await p.addInitScript(() => { window.requestAnimationFrame = () => 1; });
      await p.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
      await p.goto(`${base}/relocated/${id}/index.html?qa=1`);
      await p.waitForFunction(() => window.gameModule && !document.querySelector('.boot:not([hidden])'));
      for (const state of ['ready', 'running', 'paused', 'resumed']) {
        if (state === 'running') await p.locator('[data-primary]').click();
        if (state === 'paused' || state === 'resumed') await p.locator('[data-pause]').click({ timeout: 3000 });
        const wanted = state === 'resumed' ? 'running' : state;
        assert.equal(await p.evaluate(() => gameModule.snapshot().state), wanted, `${id}: ${state}`);
        const mute = p.locator('[data-mute]'), before = await mute.getAttribute('aria-label');
        await mute.click({ timeout: 3000 });
        assert.notEqual(await mute.getAttribute('aria-label'), before, `${id}: mute in ${state}`);
        assert.equal(await p.evaluate(() => gameModule.snapshot().state), wanted, `${id}: mute preserves ${state}`);
      }
      assert.deepEqual(errors, [], id);
      await p.close();
      console.log(`PASS ${id} ${viewport.width}x${viewport.height}: start, mute, pause, resume`);
    }
    await ctx.close();
  }
  await browser.close();
})().catch(async error => { console.error(error); await browser?.close(); process.exitCode = 1; });
