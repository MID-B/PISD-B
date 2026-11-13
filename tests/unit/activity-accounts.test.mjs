import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function load(file, imports = {}) {
  const source = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  runInNewContext(outputText, { exports, require: (name) => {
    if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
    return imports[name];
  } });
  return exports;
}
const model = load('app/smki/log-activity/model.ts');
const profile = (id, name = 'Nama Sama') => ({ id, full_name: name, email: `${id}@example.com`, departement_id: 'it', department: { name: 'Information Technology' }, position: { title: 'IT' } });
const activity = (id, owner, timestamp, description = 'Deskripsi asli\nBaris kedua') => ({ id, register_id: owner, user_id: owner, description, ip_address: '127.0.0.1', browser: 'Chrome 131', created_at: timestamp });
const session = (id, owner, date, login, logoutDate = null, logout = null) => ({ id, register_id: owner, nama: 'Nama Snapshot', email: `${owner}@example.com`, position: 'IT', departement: 'Information Technology', tanggal_login: date, waktu_login: login, tanggal_logout: logoutDate, waktu_logout: logout });

test('one row per account uses account IDs, never shared names; descriptions remain verbatim', () => {
  const accounts = model.buildAccountHistories([profile('a'), profile('b')], [activity('1', 'a', '2026-11-13T10:00:00Z'), activity('2', 'a', '2026-11-12T10:00:00Z'), activity('3', 'b', '2026-11-11T10:00:00Z')], []);
  const rows = model.filterAccountSummaries(accounts);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].id, 'a');
  assert.equal(rows[0].activities.length, 2);
  assert.equal(rows[0].lastEvent.description, 'Deskripsi asli\nBaris kedua');
  assert.equal(model.filterAccountSummaries(accounts, { search: 'b@example.com' })[0].id, 'b');
  assert.equal(model.filterAccountSummaries(accounts, { search: 'Deskripsi asli' }).length, 0);
});

test('date filter uses Jakarta boundaries and chooses last event within that day', () => {
  const accounts = model.buildAccountHistories([profile('a'), profile('b')], [
    activity('latest', 'a', '2026-11-13T10:00:00Z'),
    activity('end', 'a', '2026-11-10T16:59:59Z'),
    activity('start', 'a', '2026-11-09T17:00:00Z'),
    activity('next-day', 'b', '2026-11-10T17:00:00Z'),
  ], []);
  const rows = model.filterAccountSummaries(accounts, { date: '2026-11-10', search: 'a@', departmentId: 'it' });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].lastEvent.id, 'activity:end');
  assert.equal(rows[0].activities.length, 3, 'detail must retain the full history');
  assert.equal(model.filterAccountSummaries(accounts, { date: '2026-11-10', departmentId: 'other' }).length, 0);
  assert.equal(model.jakartaDay('2026-11-09T17:00:00Z'), '2026-11-10');
  assert.equal(model.jakartaDay('2026-11-10T17:00:00Z'), '2026-11-11');
});

test('Online is determined by the newest global session, independent of filtered date', () => {
  const accounts = model.buildAccountHistories([profile('a')], [activity('event', 'a', '2026-11-10T10:00:00Z')], [
    session('old-open', 'a', '2026-11-09', '08:00:00'),
    session('closed', 'a', '2026-11-10', '09:00:00', '2026-11-10', '11:00:00'),
    session('new-open', 'a', '2026-11-13', '19:00:00'),
  ]);
  assert.equal(accounts[0].online, true);
  assert.equal(accounts[0].sessions[0].id, 'new-open');
  assert.equal(model.filterAccountSummaries(accounts, { date: '2026-11-10' })[0].online, true);
  const closed = model.buildAccountHistories([profile('a')], [], [session('old-open', 'a', '2026-11-09', '08:00:00'), session('closed', 'a', '2026-11-13', '09:00:00', '2026-11-13', '10:00:00')]);
  assert.equal(closed[0].online, false, 'an older open session cannot override the newest closed session');
});

test('login/logout-only accounts are included, with logout dates searchable', () => {
  const accounts = model.buildAccountHistories([profile('a')], [], [session('s', 'a', '2026-11-09', '22:00:00', '2026-11-10', '01:00:00')]);
  const rows = model.filterAccountSummaries(accounts, { date: '2026-11-10' });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].lastEvent.description, 'Logout dari aplikasi.');
  assert.equal(rows[0].activities.length, 0);
  assert.equal(model.sessionMatchesDate(rows[0].sessions[0], '2026-11-10'), true);
  assert.equal(model.sessionMatchesDate(rows[0].sessions[0], '2026-11-11'), false);
});

test('detail pagination has five rows and jumps to first matching date in each history', () => {
  const records = Array.from({ length: 19 }, (_, i) => ({ id: i, matches: i >= 11 && i <= 13 }));
  const page = model.firstMatchingPage(records, (row) => row.matches);
  assert.equal(page, 3);
  const result = model.detailPage(records, page);
  assert.equal(result.rows.length, 5);
  assert.equal(result.start, 11);
  assert.equal(result.end, 15);
  assert.equal(result.totalPages, 4);
  assert.equal(model.firstMatchingPage(records, () => false), 1);
  assert.equal(model.detailPage([], 4).page, 1);
  assert.equal(model.detailPage([], 4).start, 0);
  assert.equal(model.detailPage(records, 99).end, 19);
  const sessions = Array.from({ length: 7 }, (_, i) => ({ tanggal_login: i === 6 ? '2026-11-10' : '2026-11-13', tanggal_logout: null }));
  assert.equal(model.firstMatchingPage(sessions, (row) => model.sessionMatchesDate(row, '2026-11-10')), 2);
});

test('legacy sessions use profile email as fallback, and matching timestamps prefer original activity text', () => {
  const legacy = { ...session('s', 'a', '2026-11-13', '19:00:00'), register_id: null };
  const accounts = model.buildAccountHistories([profile('a')], [activity('event', 'a', '2026-11-13T12:00:00Z', 'Berhasil login ke aplikasi.')], [legacy]);
  assert.equal(accounts.length, 1);
  assert.equal(accounts[0].id, 'a');
  assert.equal(model.filterAccountSummaries(accounts)[0].lastEvent.description, 'Berhasil login ke aplikasi.');
  assert.equal(model.displayDateTime(null), '-');
});

test('reader fetches all database batches using SELECT only, without changing stored records', async () => {
  const inputs = {
    b2_register: [profile('a')],
    b1_activity: Array.from({ length: 501 }, (_, i) => ({ ...activity(`${i}`, 'a', '2026-11-13T12:00:00Z'), user_agent: 'browser-data' })),
    b3_log_login: [session('s', 'a', '2026-11-13', '19:00:00')],
  };
  const before = JSON.stringify(inputs);
  const calls = [];
  const supabase = { from(table) {
    let start = 0, end = 499;
    const query = { then(resolve) { return Promise.resolve({ data: inputs[table].slice(start, end + 1), error: null }).then(resolve); } };
    for (const method of ['select', 'order', 'range', 'abortSignal']) query[method] = (...args) => {
      calls.push([table, method, ...args]);
      if (method === 'range') [start, end] = args;
      return query;
    };
    return query;
  } };
  const reader = load('app/smki/log-activity/data.ts', { '@/lib/supabaseClient': { supabase }, '@/query/activity': { formatUserAgent: () => 'Chrome 131' }, './model': model });
  const accounts = await reader.loadAccountHistories(new AbortController().signal);
  assert.equal(accounts[0].activities.length, 501);
  assert.equal(accounts[0].sessions.length, 1);
  assert.equal(JSON.stringify(inputs), before);
  assert.ok(calls.some(([table, method, start]) => table === 'b1_activity' && method === 'range' && start === 500));
});

test('account edits and deactivation follow the current profile without rewriting activity or session history', () => {
  const original = { ...profile('a'), is_active: true };
  const activities = [activity('event', 'a', '2026-11-10T10:00:00Z')];
  const sessions = [session('s', 'a', '2026-11-13', '19:00:00')];
  const before = JSON.stringify({ activities, sessions });
  const active = model.buildAccountHistories([original], activities, sessions)[0];
  assert.equal(active.isActive, true);
  assert.equal(active.online, true);
  const edited = { ...original, is_active: false, full_name: 'Nama Baru', email: 'baru@example.com',
    department: { name: 'Human Resources' }, position: { title: 'HR Manager' } };
  const disabled = model.buildAccountHistories([edited], activities, sessions)[0];
  assert.equal(disabled.isActive, false, 'deactivation is read even if the latest session is still open');
  assert.equal(disabled.name, 'Nama Baru');
  assert.equal(disabled.email, 'baru@example.com');
  assert.equal(disabled.department, 'Human Resources');
  assert.equal(disabled.role, 'HR Manager');
  assert.equal(model.filterAccountSummaries([disabled], { date: '2026-11-10' })[0].isActive, false);
  assert.equal(model.buildAccountHistories([{ ...edited, is_active: true }], activities, sessions)[0].isActive, true);
  assert.equal(JSON.stringify({ activities, sessions }), before);
});

test('old Log Login bookmarks redirect to the combined Log Activity page', () => {
  let destination;
  const route = load('app/smki/dashboard/loglogin/page.tsx', { 'next/navigation': { redirect: (path) => { destination = path; } } });
  route.default();
  assert.equal(destination, '/smki/dashboard?tab=log-activity');
});
