import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Extract the actual registration ID generator; all database calls below are mocked.
const source = readFileSync(new URL('../../app/register/page.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ['DEPARTMENT_PREFIX_MAP', 'DIRECTOR_POSITION_ID', 'DIRECTOR_CODE_BY_DEPARTMENT', 'generateNextEmployeeId'];
const declarations = new Map();
function visit(node) {
  if (ts.isVariableDeclaration(node) && names.includes(node.name.getText(ast))) declarations.set(node.name.getText(ast), node.getText(ast));
  ts.forEachChild(node, visit);
}
visit(ast);
assert.equal(declarations.size, names.length);
const { outputText } = ts.transpileModule(names.map(name => `const ${declarations.get(name)};`).join('\n'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
});
function generator(supabase) {
  return runInNewContext(`${outputText}\ngenerateNextEmployeeId;`, { supabase });
}

for (const [department, prefix] of [
  ['8113ab6f-d5cc-4c94-bbf6-e08047931fab', 'IT-DEV'],
  ['6e116b24-22fe-4b8f-be7e-2159b99022bd', 'HCC-HR-MGR'],
  ['1653db5f-2b64-418f-b28b-68cb7b9dae8e', 'FNC-CS'],
  ['97ac5d35-5da2-4f5d-9d36-78500f403cc7', 'COM-CS-MGR'],
]) {
  test(`registration requests the ${prefix} ID through RPC without reading the register table`, async () => {
    const generate = generator({
      async rpc(name, args) {
        assert.equal(name, 'get_next_employee_id');
        assert.equal(args.dept_prefix, prefix);
        return { data: `${prefix}-123`, error: null };
      },
      from() { assert.fail('Ordinary registration must not read existing profiles to generate an ID'); },
    });
    assert.equal(await generate(department, 'staff-position'), `${prefix}-123`);
  });
}

for (const [label, result] of [
  ['RPC rejection', { data: null, error: { message: 'RPC access denied' } }],
  ['empty RPC result', { data: null, error: null }],
]) {
  test(`registration stops instead of inventing an Employee ID on ${label}`, async () => {
    const generate = generator({ rpc: async () => result });
    await assert.rejects(generate('8113ab6f-d5cc-4c94-bbf6-e08047931fab', 'staff-position'), /Gagal men-generate ID registrasi/);
  });
}

for (const occupied of [false, true]) {
  test(`director registration keeps its existing fixed-code check (${occupied ? 'occupied' : 'available'})`, async () => {
    const generate = generator({
      rpc() { assert.fail('Director registration must retain its fixed code'); },
      from(table) {
        assert.equal(table, 'b2_register');
        return {
          select(column) { assert.equal(column, 'employee_id'); return this; },
          eq(column, code) { assert.equal(column, 'employee_id'); assert.equal(code, 'DRT-FAT-001'); return this; },
          async maybeSingle() { return { data: occupied ? { employee_id: 'DRT-FAT-001' } : null, error: null }; },
        };
      },
    });
    const result = generate('1653db5f-2b64-418f-b28b-68cb7b9dae8e', '4acac2d4-8441-4cd8-bcd3-cf3ce4ca0ee0');
    if (occupied) await assert.rejects(result, /sudah memiliki akun terdaftar/);
    else assert.equal(await result, 'DRT-FAT-001');
  });
}
