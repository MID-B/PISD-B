import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const exports = {};
runInNewContext(ts.transpileModule(readFileSync(new URL('../../app/dashboard/sales-performance/summary.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports });
const { summarizeSales, compactRupiah, matchesOutstandingSearch } = exports;
const row = (id, days, amount = 100, customer = 'PT Contoh') => ({ outstanding_row_id: id, overdue_by: days, outstanding_amount: amount, customer, status: 'OVERDUE', source: 'CCR', due_date: '2026-08-01', job_number: id });

test('profit and margin use totals from the selected reports, never an average of monthly margins', () => {
  const result = summarizeSales([{ total_profit: 20, total_revenue: 100 }, { total_profit: 30, total_revenue: 900 }], []);
  assert.equal(result.profit, 50);
  assert.equal(result.revenue, 1000);
  assert.equal(result.margin, 5);
  assert.equal(summarizeSales([{ total_profit: 20, total_revenue: 0 }], []).margin, null);
  assert.equal(summarizeSales([{ total_profit: null, total_revenue: null }], []).profit, null);
});

test('aging boundaries do not overlap and every outstanding row belongs to a bucket', () => {
  const rows = [-1, 0, 30, 31, 60, 61, 90, 91, null].map((days, index) => row(String(index), days));
  const before = JSON.stringify(rows);
  const result = summarizeSales([], rows);
  assert.deepEqual(Array.from(result.aging, (bucket) => bucket.count), [2, 2, 2, 1, 1, 1]);
  assert.equal(result.aging.reduce((sum, bucket) => sum + bucket.amount, 0), result.outstanding);
  assert.equal(result.count, 9);
  assert.equal(JSON.stringify(rows), before);
});

test('overdue CCR is the intersection of status and source; customer ranking sums all records', () => {
  const rows = [row('a', 1, 100, 'PT A'), row('b', 1, 200, ' pt a '),
    { ...row('c', 1, 800, 'PT B'), source: 'OTHER' }, { ...row('d', 1, 900, 'PT C'), status: 'OPEN' },
    row('e', 1, 90, 'PT D'), row('f', 1, 80, 'PT E'), row('g', 1, 70, 'PT F')];
  const result = summarizeSales([], rows);
  assert.equal(result.outstanding, 2240);
  assert.equal(result.overdue, 540);
  assert.equal(result.overdueCount, 5);
  assert.deepEqual(Array.from(result.customers, (customer) => customer.name), ['PT C', 'PT B', 'PT A', 'PT D', 'PT E']);
  assert.equal(result.customers[2].amount, 300);
});

test('empty, missing amounts and rupiah units do not invent financial values', () => {
  assert.equal(summarizeSales([], []).outstanding, 0);
  assert.equal(summarizeSales([], [row('a', null, null)]).outstanding, null);
  assert.equal(compactRupiah(null), '—');
  assert.equal(compactRupiah(480_000_000), 'Rp 480 jt');
  assert.equal(compactRupiah(1_210_000_000), 'Rp 1,2 M');
});

test('missing revenue or profit in any month prevents a misleading period margin', () => {
  const missingRevenue = summarizeSales([{ total_profit: 100, total_revenue: null }, { total_profit: 20, total_revenue: 100 }], []);
  assert.equal(missingRevenue.profit, 120);
  assert.equal(missingRevenue.revenue, null);
  assert.equal(missingRevenue.margin, null);
  const missingProfit = summarizeSales([{ total_profit: null, total_revenue: 100 }, { total_profit: 20, total_revenue: 100 }], []);
  assert.equal(missingProfit.profit, null);
  assert.equal(missingProfit.margin, null);
  assert.equal(summarizeSales([{ total_profit: Number.NaN, total_revenue: 100 }], []).margin, null);
  assert.equal(summarizeSales([{ total_profit: -20, total_revenue: 100 }], []).margin, -20);
  assert.equal(summarizeSales([{ total_profit: 0, total_revenue: 100 }], []).margin, 0);
});

test('due-date search handles padded, unpadded and mixed day/month formats without broadening searchable fields', () => {
  const record = { ...row('BIOB/2608/2747', 30), due_date: '2026-08-02' };
  for (const term of ['02/08/2026', '2/8/2026', '02/8/2026', '2/08/2026', '02-8-2026', '02.08.2026', '02 / 8 / 2026', '2026-08-02', '02 Agu 2026', 'biob/2608', '']) {
    assert.equal(matchesOutstandingSearch(record, term), true, term);
  }
  for (const term of ['PT Contoh', 'OVERDUE', 'CCR', '03/8/2026']) {
    assert.equal(matchesOutstandingSearch(record, term), false, term);
  }
  assert.equal(matchesOutstandingSearch({ job_number: null, due_date: null }, '02'), false);
  assert.equal(matchesOutstandingSearch({ job_number: '000012', due_date: null }, '0012'), true);
});
