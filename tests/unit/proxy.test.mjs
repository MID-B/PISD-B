import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { NextRequest } = require('next/server');
function load(file, ssr) {
  const exports = {};
  const source = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  runInNewContext(outputText, {
    exports, URL, require: (name) => name === '@supabase/ssr' ? ssr : require(name),
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key' } },
  });
  return exports;
}

test('protected MID and SMKI pages redirect to login without a verified user', async () => {
  const { proxy } = load('proxy.ts', {
    createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: null }, error: null }) } }),
  });
  for (const path of ['/dashboard', '/dashboard/sales-performance', '/smki/dashboard', '/smki/dashboard/loglogin', '/landing-page']) {
    const response = await proxy(new NextRequest(`http://localhost:3000${path}`));
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), 'http://localhost:3000/login?error=unauthorized');
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  }
});

test('refreshed cookies reach the request and response for a verified user', async () => {
  const request = new NextRequest('http://localhost:3000/dashboard');
  const { proxy } = load('proxy.ts', {
    createServerClient: (_, __, { cookies }) => ({ auth: { getUser: async () => {
      cookies.setAll([{ name: 'sb-test-auth-token', value: 'refreshed-session', options: { path: '/', sameSite: 'lax' } }]);
      return { data: { user: { id: 'verified-user' } }, error: null };
    } } }),
  });
  const response = await proxy(request);
  assert.equal(response.status, 200);
  assert.equal(request.cookies.get('sb-test-auth-token').value, 'refreshed-session');
  assert.equal(response.cookies.get('sb-test-auth-token').value, 'refreshed-session');
  assert.equal(response.headers.get('x-middleware-request-cookie').includes('sb-test-auth-token=refreshed-session'), true);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});

test('redirect preserves cookie expiry from Supabase without clearing unrelated cookies', async () => {
  const { proxy } = load('proxy.ts', {
    createServerClient: (_, __, { cookies }) => ({ auth: { getUser: async () => {
      cookies.setAll([{ name: 'sb-test-auth-token', value: '', options: { path: '/', maxAge: 0 } }]);
      return { data: { user: null }, error: { code: 'session_not_found' } };
    } } }),
  });
  const response = await proxy(new NextRequest('http://localhost:3000/smki/dashboard', { headers: { cookie: 'sb-unrelated=keep' } }));
  assert.equal(response.status, 307);
  assert.equal(response.cookies.get('sb-test-auth-token').value, '');
  assert.equal(response.cookies.get('sb-unrelated'), undefined);
});

test('shared browser client uses cookie-compatible SSR client', () => {
  const browserClient = { auth: {} };
  let created = false;
  const { supabase } = load('lib/supabaseClient.ts', {
    createBrowserClient: () => { created = true; return browserClient; },
  });
  assert.equal(created, true);
  assert.equal(supabase, browserClient);
});
