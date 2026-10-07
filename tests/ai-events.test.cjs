const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest } = require('next/server');

function load(file, mocks = {}, globals = {}) {
  const exports = {};
  const absolute = path.resolve(file);
  const requireModule = name => {
    if (name in mocks) return mocks[name];
    if (!name.startsWith('.') && !name.startsWith('@/')) return require(name);
    const target = name.startsWith('@/') ? path.resolve('src', name.slice(2)) : path.resolve(path.dirname(absolute), name);
    if (target.endsWith('.json')) return JSON.parse(fs.readFileSync(target, 'utf8'));
    return load(target.endsWith('.ts') ? target : `${target}.ts`, mocks, globals);
  };
  const js = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(js, { exports, require: requireModule, process, URL, URLSearchParams, Response, ...globals });
  return exports;
}


const {AI_EVENTS,eventStatus,eventCountdown,filterEvents,koreaDate}=load('src/modules/ai-events/catalogue.ts');
const now=new Date('2026-10-07T01:00:00Z');
const record=id=>AI_EVENTS.find(item=>item.id===id);

test('organizer-confirmed early closure overrides an advertised future deadline',()=>{
  const item=record('ai-top-100-2026'); assert.equal(eventStatus(item,now).code,'closed'); assert.equal(eventCountdown(item,now),'접수 마감');
  assert.ok(!filterEvents(AI_EVENTS,{hideClosed:true},now).some(row=>row.id===item.id));
});
test('deadlines use Korean dates and close at an explicitly published cutoff',()=>{
  const item={...record('ai-top-100-2026'),registrationClosed:false};
  assert.equal(eventStatus(item,new Date('2026-10-21T08:59:59Z')).code,'open');
  assert.equal(eventStatus(item,new Date('2026-10-21T09:00:00Z')).code,'closed');
  assert.equal(koreaDate(new Date('2026-10-06T15:05:00Z')),'2026-10-07');
  assert.equal(eventCountdown(record('ai-korea-awards-2026'),now),'D-2');
  assert.equal(eventCountdown(record('ai-korea-awards-2026'),new Date('2026-10-09T01:00:00Z')),'오늘 마감');
  assert.equal(eventStatus(record('ai-korea-awards-2026'),new Date('2026-10-09T15:00:00Z')).code,'closed');
});
test('unknown application cutoffs stay distinct from event start and finish',()=>{
  const course=record('vibe-coding-hero');
  assert.equal(eventStatus(course,now).label,'개최 예정');
  assert.equal(eventStatus(course,new Date('2026-10-14T11:00:00Z')).code,'ongoing');
  assert.equal(eventStatus(course,new Date('2026-10-14T12:30:00Z')).label,'일정 종료');
  assert.equal(eventStatus(record('ai-festa-2026'),now).label,'진행 중');
});
test('category, organizer and topic searches combine; closed records sort last',()=>{
  assert.equal(filterEvents(AI_EVENTS,{kind:'course',query:'생산성'},now)[0].id,'small-business-ai-2026');
  assert.equal(filterEvents(AI_EVENTS,{kind:'contest',query:'바이브코딩'},now).length,0);
  assert.equal(filterEvents(AI_EVENTS,{query:'claude'},now)[0].id,'claude-first-class');
  assert.equal(filterEvents(AI_EVENTS,{},now).at(-1).id,'ai-top-100-2026');
});
test('every poster has a unique deep-link identity and a dated HTTPS organizer source',()=>{
  assert.equal(new Set(AI_EVENTS.map(item=>item.id)).size,AI_EVENTS.length);
  for(const item of AI_EVENTS) { assert.equal(new URL(item.sourceUrl).protocol,'https:'); assert.match(item.verifiedAt,/^\d{4}-\d{2}-\d{2}$/); assert.ok(item.title&&item.audience&&item.cost&&item.posterLines.length); }
});
test('module metadata supplies a public header and full-menu entry while runtime disable wins',()=>{
  const {AI_EVENTS_MODULE}=load('src/modules/ai-events/module.config.ts');
  const {spaceEntries,primarySpaceEntries}=load('src/lib/site-navigation.ts');
  const enabled={...AI_EVENTS_MODULE,newUntil:null};
  assert.equal(spaceEntries([enabled])[0].href,'/app#ai-events');
  assert.equal(spaceEntries([enabled])[0].section,'learn');
  assert.equal(primarySpaceEntries([enabled])[0].primary.label,'AI 일정');
  assert.equal(primarySpaceEntries([{...enabled,enabled:false}]).length,0);
  assert.equal(spaceEntries([{...enabled,adminOnly:true}]).length,0);
  const generated=JSON.parse(fs.readFileSync('public/design/streaming-v1/navigation.json','utf8'));
  assert.equal(generated.entries.find(item=>item.id==='ai-events').primary.label,'AI 일정');
});
