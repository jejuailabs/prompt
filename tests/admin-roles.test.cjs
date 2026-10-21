const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}) {
  const exports = {};
  const requireModule = name => {
    if (name in mocks) return mocks[name];
    if (!name.startsWith('@/')) return require(name);
    return load(path.resolve('src', name.slice(2)) + '.ts', mocks);
  };
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  vm.runInNewContext(js, { exports, require: requireModule, process, URL, Response, Date });
  return exports;
}

class HttpError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }

// Admin PATCH /api/admin/users against an in-memory profile table, signed in as `me`.
function usersApi(profiles, me) {
  const rows = new Map(profiles.map(p => [p.id, { ...p }]));
  const db = { profile: {
    findUnique: async ({ where }) => rows.get(where.id) ?? null,
    count: async ({ where }) => [...rows.values()].filter(p => p.role === where.role && p.banned === where.banned).length,
    update: async ({ where, data }) => Object.assign(rows.get(where.id), data),
  } };
  const api = load('src/app/api/admin/users/route.ts', {
    '@/lib/db': { db },
    '@/lib/auth': { HttpError, requireAdmin: async () => rows.get(me) },
    '@/lib/server/handler': {
      readJson: async req => req.body,
      ok: data => ({ status: 200, data }),
      fail: e => ({ status: e.status ?? 500, error: e.message }),
    },
    '@/lib/server/serialize': { serializeAdminUsers: async list => list },
  });
  return { patch: body => api.PATCH({ body }), rows };
}

const member = (id, role = 'user') => ({ id, username: id, role, banned: false });

test('any admin can appoint and remove other admins', async () => {
  const { patch, rows } = usersApi([member('a', 'admin'), member('b', 'admin'), member('c')], 'b');
  assert.equal((await patch({ id: 'c', role: 'admin' })).status, 200);
  assert.equal(rows.get('c').role, 'admin');
  assert.equal((await patch({ id: 'a', role: 'user' })).status, 200);
  assert.equal(rows.get('a').role, 'user');
});

test('an admin cannot remove or ban their own admin role', async () => {
  const { patch, rows } = usersApi([member('a', 'admin'), member('b', 'admin')], 'a');
  assert.equal((await patch({ id: 'a', role: 'user' })).status, 400);
  assert.equal((await patch({ id: 'a', banned: true })).status, 400);
  assert.equal(rows.get('a').role, 'admin');
  assert.equal(rows.get('a').banned, false);
});

test('the last active admin cannot be removed or banned', async () => {
  const { patch, rows } = usersApi([member('a', 'admin'), { ...member('b', 'admin'), banned: true }, member('c')], 'b');
  assert.equal((await patch({ id: 'a', role: 'user' })).status, 400);
  assert.equal((await patch({ id: 'a', banned: true })).status, 400);
  assert.equal(rows.get('a').role, 'admin');
});
