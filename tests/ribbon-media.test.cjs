const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require: () => ({}), ...globals });
  return exports;
}
const { modelSource, videoSource } = load('src/lib/artifact-media.ts');
test('3D studio results use generated GLB instead of the source image', () => {
  assert.equal(modelSource({ fileUrl: '/input.png', metadata: { outputs: [{ glbUrl: '/model.glb', riggedGlbUrl: '/rigged.glb' }] } }), '/rigged.glb');
  assert.equal(modelSource({ fileUrl: '/input.png', metadata: {} }), null);
});
test('video results accept signed URLs and keep slideshow images out of the video player', () => {
  assert.equal(videoSource({ fileUrl: '/movie.mp4?token=example', metadata: {} }), '/movie.mp4?token=example');
  assert.equal(videoSource({ fileUrl: '/cover.png', metadata: { render: { videoUrl: 'https://example.org/result' } } }), 'https://example.org/result');
  assert.equal(videoSource({ fileUrl: '/cover.png', metadata: { frames: ['/frame.png'] } }), null);
  assert.equal(videoSource({ metadata: { videoUrl: 'javascript:alert(1)' } }), null);
});
function element(tag) {
  return { tag, style: {}, attrs: {}, children: [], setAttribute(k,v) { this.attrs[k] = v; },
    appendChild(child) { child.parent = this; this.children.push(child); },
    remove() { this.parent.children = this.parent.children.filter(x => x !== this); } };
}
const { IframeSandboxEngine } = load('src/lib/engine/iframe-sandbox.ts', { document: { createElement: element } });
test('two previews of the same game mount and clean up independently', () => {
  const engine = new IframeSandboxEngine(), a = element('host'), b = element('host');
  const artifact = { id: 'game', type: 'game', contentUrl: '/games/flappy.html' };
  let stopped = 0;
  const first = engine.mountInto(artifact, a, { onStopped: () => stopped++ });
  const second = engine.mountInto(artifact, b);
  assert.equal(a.children[0].children[0].attrs.sandbox, 'allow-scripts allow-pointer-lock');
  first.stop(); first.stop();
  assert.equal(a.children.length, 0);
  assert.equal(b.children.length, 1);
  assert.equal(stopped, 1);
  second.stop();
  assert.equal(b.children.length, 0);
});
test('the execution adapter rejects non-web URL schemes', () => {
  assert.throws(() => new IframeSandboxEngine().mountInto({ id: 'x', contentUrl: 'javascript:alert(1)' }, element('host')), /supported executable URL/);
});
