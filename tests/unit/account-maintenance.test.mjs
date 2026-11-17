import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Exercise the actual UI handler with a local mock. No database requests are made.
const source = readFileSync(new URL('../../app/smki/dashboard/page.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let handler;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'handleConfirmDelete') {
    handler = node.initializer.getText(ast);
  }
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(handler, 'Delete handler must exist');
const { outputText } = ts.transpileModule(`const runDelete = ${handler};`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
});

async function attempt(result, { throws = false } = {}) {
  const target = { id: 'target-account', name: 'Test Account', email: 'test@example.test' };
  const state = { employees: [target], alerts: [], messages: [], logs: [], operations: [], closed: false };
  const query = {
    delete() { state.operations.push('delete'); return this; },
    eq(column, value) {
      assert.equal(column, 'id');
      assert.equal(value, target.id);
      return this;
    },
    async select(columns) {
      assert.equal(columns, 'id');
      if (throws) throw new Error('Network unavailable');
      return result;
    },
  };
  const context = {
    deleteConfirmEmployee: target,
    supabase: { from(table) { assert.equal(table, 'b2_register'); return query; } },
    alert: (message) => state.alerts.push(message),
    trackActivity: (...args) => state.logs.push(args),
    setEmployees: (update) => { state.employees = update(state.employees); },
    setSuccessMessage: (message) => state.messages.push(message),
    setDeleteConfirmEmployee: (value) => { state.closed = value === null; },
    setTimeout() {},
  };
  await runInNewContext(`${outputText}\nrunDelete();`, context);
  assert.equal(state.closed, true);
  return state;
}

for (const [label, data] of [
  ['zero affected rows', []],
  ['missing confirmation', null],
  ['a different returned account', [{ id: 'different-account' }]],
]) {
  test(`delete preserves the list and creates no success log for ${label}`, async () => {
    const state = await attempt({ data, error: null });
    assert.equal(state.employees.length, 1);
    assert.equal(state.messages.length, 0);
    assert.equal(state.logs.length, 0);
    assert.match(state.alerts[0], /belum terkonfirmasi/);
  });
}

for (const [code, message] of [['23503', /masih digunakan oleh data lain/], ['23001', /masih digunakan oleh data lain/], ['42501', /Akses hapus akun ditolak/]]) {
  test(`delete explains database error ${code} without removing the account`, async () => {
    const state = await attempt({ data: null, error: { code, message: 'Database rejection' } });
    assert.equal(state.employees.length, 1);
    assert.equal(state.messages.length, 0);
    assert.equal(state.logs.length, 0);
    assert.match(state.alerts[0], message);
  });
}

test('delete reports success only after the requested account is confirmed deleted', async () => {
  const state = await attempt({ data: [{ id: 'target-account' }], error: null });
  assert.equal(state.employees.length, 0);
  assert.equal(state.alerts.length, 0);
  assert.match(state.messages[0], /berhasil dihapus/);
  assert.equal(state.logs.length, 1);
  assert.equal(state.logs[0][0], 'Delete');
});

test('a failed request never removes the account or writes a success log', async () => {
  const state = await attempt(null, { throws: true });
  assert.equal(state.employees.length, 1);
  assert.equal(state.messages.length, 0);
  assert.equal(state.logs.length, 0);
  assert.equal(state.alerts.length, 1);
});
