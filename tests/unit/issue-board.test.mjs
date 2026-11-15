import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const exports = {};
runInNewContext(ts.transpileModule(readFileSync(new URL('../../app/dashboard/issue-board/board-model.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports });
const board = exports;
const filters = { source: '', status: '', priority: '', start: '', end: '' };
const issue = (id, values = {}) => ({ source: 'HRMS', issue_code: id, issue: 'Issue contoh', description: 'Deskripsi asli', note: 'Note asli',
  date: '2026-11-15', status: 'Open', priority: 'High', due_date: '2026-11-18', pic_id: 'EMP-1', pic_name: 'Nama PIC', ...values });

test('received date filter includes the full Jakarta day and combines source, status and priority', () => {
  const rows = [issue('start', { date: '2026-11-14T17:00:00Z', status: ' IN_PROGRESS ', priority: ' high ' }),
    issue('end', { date: '2026-11-15T16:59:59Z', status: 'In Progress' }),
    issue('next', { date: '2026-11-15T17:00:00Z' }), issue('other', { source: 'CRM' })];
  const result = board.filterBoard(rows, { ...filters, source: 'HRMS', status: 'IN PROGRESS', priority: 'HIGH', start: '2026-11-15', end: '2026-11-15' });
  assert.deepEqual(Array.from(result, (row) => row.issue_code), ['start', 'end']);
  assert.equal(board.filterBoard(rows, { ...filters, start: '2026-11-15' }).length, 0);
  assert.equal(board.filterBoard(rows, { ...filters, start: '2026-11-16', end: '2026-11-15' }).length, 0);
  assert.equal(board.issueDay('2026-02-30'), '');
});

test('unresolved aging boundaries are exclusive and future/missing dates are separate', () => {
  const rows = ['2026-11-15', '2026-11-08', '2026-11-07', '2026-11-01', '2026-10-31', '2026-10-16', '2026-10-15', null, '2026-11-16']
    .map((date, index) => issue(String(index), { date }));
  rows.push(issue('done', { date: '2020-01-01', status: ' DONE ' }));
  const result = board.summarizeBoard(rows, '2026-11-15');
  assert.equal(result.total, 10);
  assert.equal(result.unresolved, 9);
  assert.deepEqual(Array.from(result.aging, (bucket) => bucket.count), [2, 2, 2, 1]);
  assert.equal(result.unknownReceived, 1);
  assert.equal(result.futureReceived, 1);
});

test('due monitoring excludes Done and absent due dates, with today through two days marked Due Soon', () => {
  const rows = [issue('overdue', { due_date: '2026-11-14' }), issue('today', { due_date: '2026-11-15' }),
    issue('two', { due_date: '2026-11-17' }), issue('track', { due_date: '2026-11-18' }),
    issue('missing', { due_date: null }), issue('invalid', { due_date: 'not-a-date' }),
    issue('done', { status: 'Done', due_date: '2026-01-01' })];
  const before = JSON.stringify(rows);
  const result = board.summarizeBoard(rows, '2026-11-15');
  assert.equal(result.onTrack, 1);
  assert.equal(result.dueSoon, 2);
  assert.equal(result.overdue, 1);
  assert.equal(result.noDueDate, 2);
  assert.equal(result.datedCount, 4);
  assert.equal(result.onTrackPercent, 25);
  assert.equal(board.summarizeBoard([rows[4]], '2026-11-15').onTrackPercent, null);
  assert.equal(JSON.stringify(rows), before);
});

test('unknown source, status, and priority records remain visible and colors stay stable after filtering', () => {
  const rows = [issue('a', { source: 'CRM', priority: '-' }), issue('b', { source: null, status: 'Custom', priority: 'Urgent' })];
  const all = board.summarizeBoard(rows, '2026-11-15');
  const filtered = board.summarizeBoard(board.filterBoard(rows, { ...filters, source: 'CRM' }), '2026-11-15');
  assert.equal(all.unknownStatus, 1);
  assert.equal(all.otherPriorities, 1);
  assert.equal(all.priorities.find((priority) => priority.key === 'unset').count, 1);
  assert.equal(all.sources.find((source) => source.label === 'CRM').color, filtered.sources[0].color);
  assert.equal(board.filterBoard(rows, { ...filters, priority: 'unset' }).length, 1);
});

test('table search is limited to ticket/title; sorting keeps received chronology and missing dates last', () => {
  const rows = [issue('HRMS-2', { date: '2026-11-14' }), issue('HRMS-10', { date: null }), issue('HRMS-1', { date: '2026-11-15T13:00:00Z' })];
  assert.equal(board.searchBoard(rows, 'Deskripsi asli').length, 0);
  assert.equal(board.searchBoard(rows, 'nama pic').length, 0);
  assert.equal(board.searchBoard(rows, 'hrms-10').length, 1);
  const scoped = [issue('TKT-001', { source: 'CRM', issue: 'Sinkronisasi data', pic_name: 'Budi Santoso', pic_id: 'EMP-001',
    status: 'Pending', priority: 'High', description: 'Deskripsi rahasia', note: 'Catatan internal' })];
  for (const term of ['tkt-001', 'sinkronisasi']) {
    assert.equal(board.searchBoard(scoped, term).length, 1, term);
  }
  for (const term of ['budi', 'emp-001', 'CRM', 'Pending', 'High', '2026-11-15', '2026-11-18', 'rahasia', 'internal']) {
    assert.equal(board.searchBoard(scoped, term).length, 0, `${term} is outside the searchable fields`);
  }
  assert.deepEqual(Array.from(board.sortBoard(rows, { column: 'date', ascending: false }), (row) => row.issue_code), ['HRMS-1', 'HRMS-2', 'HRMS-10']);
  assert.deepEqual(Array.from(board.sortBoard(rows, { column: 'issue_code', ascending: true }), (row) => row.issue_code), ['HRMS-1', 'HRMS-2', 'HRMS-10']);
  assert.equal(board.PAGE_SIZE, 5);
  assert.equal(board.formatIssueDate('2026-11-15', true).includes('WIB'), false, 'date-only data must not invent a received time');
  assert.ok(board.formatIssueDate('2026-11-14T17:00:00Z', true).endsWith('00.00 WIB'));
});
