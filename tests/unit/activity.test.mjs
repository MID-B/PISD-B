import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const quietConsole = { error() {} };
function load(file, imports = {}, globals = {}) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports, require: (name) => name in imports ? imports[name] : require(name),
    Headers, Request, Response, AbortSignal, console: quietConsole, ...globals,
  }, { filename: file });
  return exports;
}
const activity = load('lib/activity.ts');
const ip = load('lib/get-client-ip.ts', { 'server-only': {} });

test('IP uses trusted headers in priority order and validates IPv4/IPv6', () => {
  assert.equal(ip.getClientIp(new Headers({ 'cf-connecting-ip': '203.0.113.1', 'x-real-ip': '203.0.113.2' })), '203.0.113.1');
  assert.equal(ip.getClientIp(new Headers({ 'x-forwarded-for': ' ::ffff:203.0.113.9, 198.51.100.1' })), '203.0.113.9');
  assert.equal(ip.getClientIp(new Headers({ 'x-real-ip': '::1' })), '::1');
  assert.equal(ip.getClientIp(new Headers({ 'x-real-ip': 'invalid', 'x-forwarded-for': '2001:db8::1' })), '2001:db8::1');
  assert.equal(ip.getClientIp(new Headers({ 'x-forwarded-for': 'invalid, 203.0.113.1' })), null);
  assert.equal(ip.getClientIp(new Headers()), null);
});

test('search removes filter syntax and descriptions redact secrets', () => {
  assert.equal(activity.sanitizeActivitySearch('Budi,()%*'), 'Budi');
  assert.equal(activity.sanitizeActivityDescription('password=private Bearer abc.def.ghi'), 'password=[REDACTED] Bearer [REDACTED]');
  assert.equal(activity.sanitizeActivityDescription('x'.repeat(600)).length, 500);
});

function api({ valid = true, failInsert = false, databaseCode = '23503', authCode = 'session_not_found', failLogout = false } = {}) {
  const writes = [];
  const operations = [];
  let signedOut = false;
  const admin = {
    auth: {
      getUser: async () => {
        operations.push('validate');
        return { data: { user: valid && !signedOut ? { id: 'verified-user' } : null }, error: valid && !signedOut ? null : { code: authCode } };
      },
      admin: { signOut: async () => { operations.push('logout'); signedOut = !failLogout; return { error: failLogout ? {} : null }; } },
    },
    from: () => ({ insert: async (row) => { operations.push('insert'); writes.push(row); return { error: failInsert ? { code: databaseCode, message: 'secret diagnostic detail' } : null }; } }),
  };
  const route = load('app/api/activity/route.ts', {
    '@/lib/activity': activity, '@/lib/get-client-ip': ip,
    '@/lib/supabaseAdmin': { getSupabaseAdmin: () => admin },
  });
  return { route, writes, operations };
}
function request(body, authenticated = true, headers = {}) {
  return new Request('http://localhost/api/activity', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: 'Bearer test-token' } : {}), ...headers },
    body: JSON.stringify(body),
  });
}

test('POST rejects missing/invalid auth and invalid action/description without writes', async () => {
  const { route, writes } = api();
  assert.equal((await route.POST(request({ action: 'Open', description: 'Membuka halaman' }, false))).status, 401);
  assert.equal((await api({ valid: false }).route.POST(request({ action: 'Open', description: 'Membuka halaman' }))).status, 401);
  for (const body of [{ action: 'Unknown', description: 'x' }, { action: 'Open', description: ' ' }, { action: 'Open', description: 'x'.repeat(501) }]) {
    assert.equal((await route.POST(request(body))).status, 400);
  }
  const malformed = new Request('http://localhost/api/activity', { method: 'POST', headers: { Authorization: 'Bearer test-token' }, body: '{' });
  assert.equal((await route.POST(malformed)).status, 400);
  assert.equal(writes.length, 0);
});

test('POST ignores spoofed actor/IP/UA and writes only final schema fields', async () => {
  const { route, writes } = api();
  const response = await route.POST(request({
    action: 'Update', description: 'Mengubah akun Budi.', user_id: 'spoof', register_id: 'spoof', ip_address: 'spoof', user_agent: 'spoof',
  }, true, { 'x-forwarded-for': '203.0.113.8, 198.51.100.1', 'user-agent': 'test-browser' }));
  assert.equal(response.status, 201);
  assert.equal(writes[0].user_id, 'verified-user');
  assert.equal(writes[0].register_id, 'verified-user');
  assert.equal(writes[0].ip_address, '203.0.113.8');
  assert.equal(writes[0].user_agent, 'test-browser');
  assert.equal(Object.keys(writes[0]).sort().join(','), 'action,description,ip_address,register_id,user_agent,user_id');
  assert.equal((await api({ failInsert: true }).route.POST(request({ action: 'Open', description: 'Membuka halaman' }))).status, 500);
});

test('failure diagnostics expose only safe codes, never raw database details', async () => {
  const response = await api({ failInsert: true }).route.POST(request({ action: 'Open', description: 'Membuka halaman' }));
  const body = await response.json();
  assert.equal(body.code, '23503');
  assert.equal(JSON.stringify(body).includes('secret diagnostic detail'), false);
  const unsafe = await api({ failInsert: true, databaseCode: 'token=private' }).route.POST(request({ action: 'Open', description: 'Membuka halaman' }));
  assert.equal((await unsafe.json()).code, 'ACTIVITY_INSERT_ERROR');
});

test('401 identifies missing or revoked sessions without exposing tokens', async () => {
  const body = { action: 'Open', description: 'Membuka halaman' };
  const missing = await api().route.POST(request(body, false));
  assert.equal((await missing.json()).code, 'ACTIVITY_TOKEN_MISSING');
  const revoked = await api({ valid: false }).route.POST(request(body));
  assert.equal((await revoked.json()).code, 'AUTH_SESSION_NOT_FOUND');
  const unsafe = await api({ valid: false, authCode: 'token=private' }).route.POST(request(body));
  assert.equal((await unsafe.json()).code, 'ACTIVITY_TOKEN_INVALID');
});

test('logout validates while session exists and inserts only after successful revocation', async () => {
  const { route, operations, writes } = api();
  const body = { action: 'Logout', description: 'Keluar dari aplikasi.', logoutScope: 'local' };
  assert.equal((await route.POST(request(body))).status, 201);
  assert.equal(operations.join(','), 'validate,logout,insert');
  assert.equal(writes[0].user_id, 'verified-user');
  const failedLogout = api({ failLogout: true });
  assert.equal((await failedLogout.route.POST(request(body))).status, 500);
  assert.equal(failedLogout.writes.length, 0);
  const failedLog = await api({ failInsert: true }).route.POST(request(body));
  assert.equal(failedLog.status, 200);
  assert.equal((await failedLog.json()).logged, false);
  assert.equal((await api().route.POST(request({ ...body, logoutScope: 'others' }))).status, 400);
  assert.equal((await api().route.POST(request({ ...body, action: 'Open' }))).status, 400);
});

test('client logout reaches the server before local signOut and tolerates log service failure', async () => {
  const operations = [];
  const query = queryModule({ auth: {
    getSession: async () => ({ data: { session: { access_token: 'token' } } }),
    signOut: async () => { operations.push('local-clear'); return { error: null }; },
  } }, async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer token');
    if (url === '/api/login-log/logout') {
      operations.push('login-log-request');
      assert.equal(options.method, 'POST');
      assert.equal(options.keepalive, true);
      return { ok: true };
    }
    assert.equal(url, '/api/activity');
    operations.push('activity-request');
    assert.equal(JSON.parse(options.body).logoutScope, 'local');
    return { ok: true };
  });
  assert.equal((await query.logoutWithActivity('Keluar', 'local')).error, null);
  assert.equal(operations.join(','), 'login-log-request,activity-request,local-clear');
  const offline = queryModule({ auth: {
    getSession: async () => ({ data: { session: { access_token: 'token' } } }),
    signOut: async () => ({ error: null }),
  } }, async () => { throw new Error('offline'); });
  assert.equal((await offline.logoutWithActivity('Keluar')).error, null);
});

function queryModule(supabase, fetch = async () => ({ ok: true })) {
  return load('query/activity.ts', { '@/lib/supabaseClient': { supabase }, '@/lib/activity': activity }, { fetch });
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

test('date range includes the entire Jakarta day and excludes the next midnight', () => {
  const query = queryModule({});
  const range = query.getActivityDateRange('2026-10-14', '2026-10-14');
  assert.equal(range.start, '2026-10-13T17:00:00.000Z');
  assert.equal(range.endExclusive, '2026-10-14T17:00:00.000Z');
  const filters = { startDate: '2026-10-14', endDate: '2026-10-14' };
  assert.equal(query.matchesActivity({ createdAt: '2026-10-13T16:59:59Z' }, filters), false);
  assert.equal(query.matchesActivity({ createdAt: '2026-10-13T17:00:00Z' }, filters), true);
  assert.equal(query.matchesActivity({ createdAt: '2026-10-14T16:59:59.999Z' }, filters), true);
  assert.equal(query.matchesActivity({ createdAt: '2026-10-14T17:00:00Z' }, filters), false);
  assert.equal(query.getActivityDateRange().start, undefined);
  assert.equal(query.getActivityDateRange('', '2026-10-14').start, undefined);
  assert.throws(() => query.getActivityDateRange('2026-10-15', '2026-10-14'));
  assert.throws(() => query.getActivityDateRange('2026-02-30'));
});

test('date range is applied in the database before ordering and pagination', async () => {
  const calls = [];
  const builder = { then(resolve) { return Promise.resolve({ data: [], count: 0, error: null }).then(resolve); } };
  for (const method of ['select', 'gte', 'lt', 'order', 'range']) builder[method] = (...args) => { calls.push([method, ...args]); return builder; };
  const query = queryModule({ from: () => builder });
  await query.getActivities({ startDate: '2026-10-14', endDate: '2026-10-14', page: 2, ascending: true });
  assert.equal(calls.find(([method]) => method === 'gte').slice(1).join(','), 'created_at,2026-10-13T17:00:00.000Z');
  assert.equal(calls.find(([method]) => method === 'lt').slice(1).join(','), 'created_at,2026-10-14T17:00:00.000Z');
  assert.equal(calls.find(([method]) => method === 'range').slice(1).join(','), '10,19');
  assert.equal(calls.find(([method]) => method === 'order')[2].ascending, true);
  assert.ok(calls.findIndex(([method]) => method === 'lt') < calls.findIndex(([method]) => method === 'range'));
});

test('tracking is session-only, keepalive and never throws when sending fails', async () => {
  let session = { access_token: 'token' };
  const calls = [];
  const query = queryModule({ auth: { getSession: async () => ({ data: { session } }) } }, async (...args) => { calls.push(args); return { ok: true }; });
  assert.equal(query.trackActivity('Login', 'Berhasil login.'), undefined);
  await flush();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].keepalive, true);
  const sendLogout = await query.prepareActivity('Logout', 'Keluar dari aplikasi.');
  session = null;
  sendLogout();
  await flush();
  assert.equal(calls[1][1].headers.Authorization, 'Bearer token');
  query.trackActivity('Open', 'Membuka halaman');
  await flush();
  assert.equal(calls.length, 2);
  const failing = queryModule({ auth: { getSession: async () => ({ data: { session: { access_token: 'token' } } }) } }, () => { throw new Error('offline'); });
  assert.doesNotThrow(await failing.prepareActivity('Logout', 'Keluar'));
  failing.trackActivity('Login', 'Login');
  await flush();
});

test('joined reads use exact count, global ordering and pagination', async () => {
  const operations = [];
  const record = {
    id: 'event-1', action: 'Update', description: 'Mengubah akun', ip_address: null,
    user_agent: 'Mozilla/5.0 Chrome/154.0.0.0 Safari/537.36', created_at: '2026-10-13T09:00:00Z',
    profile: { full_name: 'Budi', email: 'budi@example.com', departement_id: 'it', position: { title: 'IT' }, department: { name: 'Information Technology' } },
  };
  const builder = {
    then(resolve) { return Promise.resolve({ data: [record], count: 30, error: null }).then(resolve); },
  };
  for (const method of ['select', 'order', 'range', 'eq', 'or', 'in']) builder[method] = (...args) => { operations.push([method, ...args]); return builder; };
  const query = queryModule({ from: () => builder });
  const result = await query.getActivities({ page: 2, pageSize: 25, action: 'Update' });
  assert.equal(result.total, 30);
  assert.equal(result.rows[0].name, 'Budi');
  assert.equal(result.rows[0].role, 'IT');
  assert.equal(result.rows[0].userAgent, 'Chrome 154');
  assert.equal(result.rows[0].ipAddress, '-');
  assert.equal(operations.find(([method]) => method === 'range').slice(1).join(','), '25,49');
  assert.equal(operations.find(([method]) => method === 'select')[2].count, 'exact');
  assert.equal(operations.filter(([method]) => method === 'order')[0][1], 'created_at');
  assert.equal(query.matchesActivity(result.rows[0], { departmentId: 'other' }), false);
  assert.equal(query.matchesActivity(result.rows[0], { search: 'Budi', action: 'Update', departmentId: 'it' }), true);
});
