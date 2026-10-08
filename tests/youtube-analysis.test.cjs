const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}, globals = {}) {
  const exports = {};
  const requireModule = name => name in mocks ? mocks[name] : name.startsWith('@/')
    ? load(path.resolve('src', name.slice(2)) + '.ts', mocks, globals) : require(name);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: requireModule, URL, Response, AbortSignal, Error, process: { env: { SOCIALKIT_API_KEY: ' test-key ', GEMINI_API_KEY: 'test-ai' } }, ...globals });
  return exports;
}

const adapter = (fetch, globals = {}) => load('src/lib/server/socialkit.ts', {}, { fetch, ...globals });
const good = { success: true, data: { transcript: 'Do not use this when segments exist', transcriptSegments: [{ start: 0, text: '안녕하세요. 오늘은 강의를 시작합니다.' }, { start: 62.8, text: '다음 단계입니다.\n직접 만들어 봅니다.' }] } };

test('nextcurator SocialKit contract: header, encoded URL, 8s, every segment and Korean detection', async () => {
  let timeout;
  const api = adapter(async (url, options) => {
    assert.equal(new URL(url).searchParams.get('url'), 'https://www.youtube.com/watch?v=LTn2FB-m_5M');
    assert.equal(options.headers['x-access-key'], 'test-key');
    assert.equal(new URL(url).searchParams.has('access_key'), false);
    return Response.json(good);
  }, { AbortSignal: { timeout: ms => { timeout = ms; } } });
  const result = await api.fetchSocialKitTranscript('LTn2FB-m_5M');
  assert.equal(timeout, 8000);
  assert.equal(result.text, '[00:00] 안녕하세요. 오늘은 강의를 시작합니다.\n[01:02] 다음 단계입니다. 직접 만들어 봅니다.');
  assert.equal(result.language, 'ko');
  assert.equal(result.source, 'socialkit');
});

test('admin path keeps usable short segments, no arbitrary 30-word rejection', async () => {
  const api = adapter(async () => Response.json({ success: true, data: { transcriptSegments: [{ start: 3601, text: '짧은 강의 내용입니다.' }] } }));
  assert.equal((await api.fetchSocialKitTranscript('LTn2FB-m_5M')).text, '[60:01] 짧은 강의 내용입니다.');
});

test('nextcurator full-text fallback requires more than 50 characters', async () => {
  const text = 'This is a useful transcript without segments, retained exactly as supplied.';
  assert.equal((await adapter(async () => Response.json({ success: true, data: { transcript: text } })).fetchSocialKitTranscript('LTn2FB-m_5M')).text, text);
  await assert.rejects(adapter(async () => Response.json({ success: true, data: { transcript: 'short' } })).fetchSocialKitTranscript('LTn2FB-m_5M'));
});

test('missing key, HTTP error, invalid JSON and empty response fail explicitly without leaking provider body', async () => {
  await assert.rejects(adapter(() => assert.fail('must not call provider'), { process: { env: {} } }).fetchSocialKitTranscript('LTn2FB-m_5M'), /API 키/);
  for (const response of [new Response('secret-key', { status: 401 }), new Response('not-json'), Response.json({ success: false }), Response.json({ success: true, data: {} })]) {
    await assert.rejects(adapter(async () => response).fetchSocialKitTranscript('LTn2FB-m_5M'), error => !error.message.includes('secret-key'));
  }
});

function pipeline({ aiError, transcriptError, metadataError = false, emptyNotes = false } = {}) {
  const analysis = { id: 'analysis', videoId: 'LTn2FB-m_5M', sourceUrl: 'https://www.youtube.com/watch?v=LTn2FB-m_5M', title: '', channelTitle: '', description: '', thumbnailUrl: null, transcript: '' };
  const job = { id: 'job', analysisId: analysis.id, analysis, status: 'queued' };
  let aiCalls = 0;
  const db = {
    youtubeAnalysisJob: { findUnique: async () => job, update: async ({ data }) => Object.assign(job, data) },
    youtubeAnalysis: { update: async ({ data }) => Object.assign(analysis, data) },
  };
  const module = load('src/lib/server/youtube-analysis.ts', {
    '@/lib/db': { db },
    '@/modules/academy/curriculum': {},
    '@/lib/server/socialkit': { fetchSocialKitTranscript: async () => { if (transcriptError) throw new Error(transcriptError); return { text: '[00:00] 실제 영상 자막입니다.', timed: '[00:00] 실제 영상 자막입니다.', source: 'socialkit', language: 'ko' }; } },
    '@/lib/server/ai': { chatJson: async () => {
      aiCalls++;
      assert.equal(analysis.transcriptSource, 'socialkit', 'transcript must already be persisted before AI');
      if (aiError) throw new Error(aiError);
      return { studyContent: emptyNotes ? '' : '실제 학습노트', summary: '요약', reportSummary: '노트', contextSummary: '내용' };
    } },
  }, { fetch: async () => { if (metadataError) throw new Error('YouTube blocked'); return Response.json({ title: '실제 강의 제목', author_name: '강사' }); } });
  return { run: () => module.processYoutubeAnalysis('job'), analysis, job, aiCalls: () => aiCalls };
}

test('Gemini 402 preserves extracted transcript and metadata, reports billing cause instead of false completion', async () => {
  const p = pipeline({ aiError: '[402 Payment Required] Your prepayment credits are depleted.' });
  await p.run();
  assert.equal(p.analysis.status, 'failed');
  assert.equal(p.job.status, 'failed');
  assert.equal(p.analysis.title, '실제 강의 제목');
  assert.equal(p.analysis.transcriptLanguage, 'ko');
  assert.match(p.analysis.transcript, /실제 영상 자막/);
  assert.match(p.analysis.error, /자막은 추출·저장.*크레딧/);
});

test('SocialKit failure never generates title-only study notes', async () => {
  const p = pipeline({ transcriptError: 'SocialKit HTTP 401' });
  await p.run();
  assert.equal(p.aiCalls(), 0);
  assert.equal(p.analysis.status, 'failed');
  assert.match(p.analysis.error, /SocialKit/);
});

test('optional YouTube metadata failure does not block SocialKit extraction or study notes', async () => {
  const p = pipeline({ metadataError: true });
  await p.run();
  assert.equal(p.analysis.status, 'done');
  assert.equal(p.analysis.studyContent, '실제 학습노트');
  assert.match(p.analysis.transcript, /실제 영상 자막/);
});

test('empty AI output is failure and preserves transcript', async () => {
  const p = pipeline({ emptyNotes: true });
  await p.run();
  assert.equal(p.analysis.status, 'failed');
  assert.equal(p.analysis.transcriptSource, 'socialkit');
});
