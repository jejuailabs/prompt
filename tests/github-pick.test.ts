import test from "node:test";
import assert from "node:assert/strict";
import { repoLinks } from "../src/modules/github-pick/sources";
import { serializePick } from "../src/modules/github-pick/server";
import { formatStars } from "../src/modules/github-pick/pick";
import { isInstallCommand } from "../src/modules/github-pick/write";

test("repo links: owner/repo only, no GitHub pages or profiles, de-duplicated", () => {
  const text = [
    "🔗 깃허브: https://github.com/thedotmack/claude-mem",
    "also https://github.com/thedotmack/claude-mem.git and github.com/NVIDIA/auto-ontology/tree/main",
    "sponsor https://github.com/sponsors/someone · topics https://github.com/topics/ai",
    "profile https://github.com/builderjosh · end of sentence github.com/herdrdev/herdr.",
  ].join("\n");
  assert.deepEqual(repoLinks(text), ["thedotmack/claude-mem", "NVIDIA/auto-ontology", "herdrdev/herdr"]);
});

test("serialize: only published-shape github-pick rows become cards", () => {
  const base = { id: "a1", title: "claude-mem — 기억하는 플러그인", fileUrl: null, views: 3, commentCount: 1, createdAt: new Date("2026-11-08T00:00:00Z"), type: "text" };
  const metadata = JSON.stringify({ pick: { repo: "thedotmack/claude-mem", oneLine: "한 줄", what: ["a"], useCases: [{ who: "누구", how: "어떻게" }], stars: 114403, videos: [] } });
  const card = serializePick({ ...base, sourceModule: "github-pick", metadata });
  assert.equal(card?.repoUrl, "https://github.com/thedotmack/claude-mem");
  assert.equal(card?.stars, 114403);
  assert.equal(serializePick({ ...base, sourceModule: "coai-news", metadata }), null);
  assert.equal(serializePick({ ...base, sourceModule: "github-pick", metadata: "{}" }), null);
});

test("install line: only real install/launch commands survive", () => {
  for (const ok of ["npx rea-agents setup", "npx claude-mem install", "pip install timesfm", "uv tool install agent-reach", "brew install herdr",
    "git clone https://github.com/a/b", "curl -fsSL https://releases.herdr.dev/app/install.sh | sh", "$ npm install -g foo", "docker run -p 3000:3000 x", "claude mcp add x -- npx y"]) {
    assert.equal(isInstallCommand(ok), true, ok);
  }
  for (const bad of ["pnpm check", "npm test", "python examples/offline_inference.py", "make build", "cargo test", "pytest"]) {
    assert.equal(isInstallCommand(bad), false, bad);
  }
});

test("stars read naturally in Korean", () => {
  assert.equal(formatStars(114403), "11.4만");
  assert.equal(formatStars(2321), "2.3천");
  assert.equal(formatStars(80000), "8만");
  assert.equal(formatStars(87), "87");
});
