const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsForTest = {};
const code = ts.transpileModule(fs.readFileSync('src/lib/thumbnail-plan.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(code, { exports: exportsForTest, require });
const { thumbnailPlanSchema, thumbnailPlanText } = exportsForTest;
const response = { analysis: { concept: '비 오는 창가의 한 장면', emotion: '그리움', visual_keywords: ['빗방울', '창문'], color_palette: ['네이비'], ctr_elements: ['명암 대비'] }, prompts: { midjourney: 'MJ first line\nMJ second line', flux: 'Flux prompt', ideogram: 'Ideogram text', gpt_image: 'GPT scene' }, text_overlay: { main: '잠들지 못한 밤', sub: '새벽 플레이리스트' }, branding_tip: '같은 글꼴을 유지하세요.' };
test('incomplete generation is rejected instead of showing broken copy controls', () => {
  assert.equal(thumbnailPlanSchema.safeParse({ ...response, prompts: { ...response.prompts, flux: '' } }).success, false);
  assert.equal(thumbnailPlanSchema.safeParse({ error: 'Unavailable' }).success, false);
});
test('optional analysis lists can be absent without breaking the result screen', () => {
  const parsed = thumbnailPlanSchema.parse({ ...response, analysis: { concept: response.analysis.concept } });
  assert.equal(parsed.analysis.visual_keywords.length, 0);
  assert.doesNotThrow(() => thumbnailPlanText(parsed));
});
test('copy and download output retains all four prompts, Korean text and newlines', () => {
  const text = thumbnailPlanText(thumbnailPlanSchema.parse(response));
  for (const prompt of Object.values(response.prompts)) assert.ok(text.includes(prompt));
  for (const value of [response.text_overlay.main, response.text_overlay.sub, response.branding_tip, '빗방울, 창문', '명암 대비']) assert.ok(text.includes(value));
  assert.ok(text.includes('MJ first line\nMJ second line'));
  assert.ok(!text.includes('undefined'));
});
