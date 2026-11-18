import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const reports = ['2026-06-01', '2026-07-01', '2026-08-01'].map(period_month => ({
  period_month, total_profit: 10_000_000, total_revenue: 100_000_000,
}));

function loadTrend({ period = '3', start = '', end = '' } = {}) {
  const states = [period, '2026', '2026-05', start, end, reports, false, '', 0];
  let index = 0;
  const exports = {};
  const { outputText } = ts.transpileModule(readFileSync(new URL('../../app/dashboard/sales-performance-trend.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  runInNewContext(outputText, {
    exports, Intl, Date,
    require: name => name === 'react' ? {
      useState: initial => [index < states.length ? states[index++] : initial, () => {}],
      useEffect() {},
    } : name === '@/lib/supabaseClient' ? { supabase: {} } : name === 'recharts' ? {} : require(name),
  });
  return exports;
}

for (const [name, start, end] of [
  ['empty range', '', ''],
  ['missing end date', '2026-06-01', ''],
  ['reversed range', '2026-08-31', '2026-06-01'],
]) {
  test(`sales range reports an error and exposes no misleading totals for ${name}`, () => {
    const model = loadTrend({ period: 'range', start, end }).useSalesPerformanceTrend();
    assert.ok(model.rangeError);
    assert.equal(model.selected.length, 0);
    assert.equal(model.data.length, 0);
    assert.equal(model.growth, null);
  });
}

test('valid sales range includes only reports within the selected dates', () => {
  const model = loadTrend({ period: 'range', start: '2026-06-01', end: '2026-07-31' }).useSalesPerformanceTrend();
  assert.equal(model.rangeError, '');
  assert.equal(model.selected.length, 2);
  assert.equal(model.selected[0].period_month, '2026-06-01');
  assert.equal(model.selected[1].period_month, '2026-07-01');
});

test('the three-month preset works without requiring custom dates', () => {
  const model = loadTrend().useSalesPerformanceTrend();
  assert.equal(model.rangeError, '');
  assert.equal(model.selected.length, 3);
});

test('fitHeight uses flexible panel height and the compact dashboard keeps its layout', () => {
  const trend = loadTrend();
  const model = trend.useSalesPerformanceTrend();
  assert.match(trend.default({ model, compact: false, fitHeight: true }).props.className, /h-full min-h-0/);
  assert.match(trend.default({ model }).props.className, /h-full p-2/);
});
