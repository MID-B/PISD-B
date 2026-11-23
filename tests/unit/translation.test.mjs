import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const nativeRequire = createRequire(import.meta.url);
function load(path, mocks = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(code, {
    exports, Response, Request, TextDecoder, URLSearchParams, AbortSignal, Date,
    require: name => name === 'server-only' ? {} : mocks[name] ?? nativeRequire(name), ...globals,
  });
  return exports;
}
const messages = load('lib/i18n/messages.ts');
const protect = load('lib/i18n/protect.ts');

test('UI labels switch both ways without changing filter keys or unknown identities', () => {
  assert.equal(messages.translateUi('Sales Performance', 'id'), 'Kinerja Penjualan');
  assert.equal(messages.translateUi('Kinerja Penjualan', 'en'), 'Sales Performance');
  assert.equal(messages.translateUi(' In Progress ', 'id'), ' Sedang Dikerjakan ');
  assert.equal(messages.translateUi('EMPLOYEE\'S NAME', 'id'), 'NAMA KARYAWAN');
  assert.equal(messages.translateUi('12 data tagihan', 'en'), '12 invoices');
  assert.equal(messages.translateUi('Menampilkan ', 'en'), 'Showing ');
  assert.equal(messages.translateUi('Angela Dellarosa', 'en'), undefined);
  assert.equal(messages.translateUi('BIOB/2608/2747', 'id'), undefined);
  assert.equal(messages.isLanguage('fr'), false);
});

test('names, emails, IPs and business identifiers survive free-text translation exactly', () => {
  const source = 'User Yohana Griselda memakai griselda@andima.co.id dari 202.14.92.150 melihat BIOB/2608/2747 dan EMP-1042.';
  const masked = protect.protectTranslation(source, ['Yohana Griselda']);
  for (const value of ['Yohana Griselda', 'griselda@andima.co.id', '202.14.92.150', 'BIOB/2608/2747', 'EMP-1042']) assert.ok(!masked.masked.includes(value));
  assert.equal(protect.restoreTranslation(masked.masked, masked.values), source);
  assert.equal(protect.restoreTranslation(masked.masked.replace('ZXQKEEP0QXZ', 'changed'), masked.values), null);
  const literal = protect.protectTranslation('A+B (IT) membuka halaman', ['A+B (IT)']);
  assert.equal(protect.restoreTranslation(literal.masked, literal.values), 'A+B (IT) membuka halaman');
});

test('Azure translates plain text server-side, caches per user and retains identifiers', async () => {
  const calls = [];
  const env = { AZURE_TRANSLATOR_KEY: 'test-only-secret', AZURE_TRANSLATOR_REGION: 'test-region' };
  const azure = load('lib/i18n/azure.ts', { './protect': protect }, { process: { env }, fetch: async (url, options) => {
    calls.push({ url, options });
    return Response.json(JSON.parse(options.body).map(item => ({ translations: [{ to: 'en', text: item.Text.replace('membuka', 'opened') }] })));
  } });
  const original = ['Yohana Griselda membuka BIOB/2608/2747'];
  const result = await azure.translateBatch('user-a', original, 'en', ['Yohana Griselda']);
  assert.equal(result[0], 'Yohana Griselda opened BIOB/2608/2747');
  assert.equal(original[0], 'Yohana Griselda membuka BIOB/2608/2747');
  await azure.translateBatch('user-a', original, 'en', ['Yohana Griselda']);
  assert.equal(calls.length, 1);
  await azure.translateBatch('user-b', original, 'en', ['Yohana Griselda']);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.headers['Ocp-Apim-Subscription-Key'], env.AZURE_TRANSLATOR_KEY);
  assert.equal(calls[0].options.cache, 'no-store');
  assert.ok(!calls[0].options.body.includes('Yohana Griselda'));
  assert.ok(calls[0].url.endsWith('&to=en&textType=plain'));
});

test('missing configuration and provider quota errors never invent successful translations or remaining quota', async () => {
  let calls = 0;
  const env = {};
  const azure = load('lib/i18n/azure.ts', { './protect': protect }, { process: { env }, fetch: async () => { calls++; return new Response(null, { status: 429 }); } });
  await assert.rejects(azure.translateBatch('a', ['Catatan'], 'en'), error => error.code === 'TRANSLATOR_NOT_CONFIGURED');
  assert.equal(calls, 0);
  const unconfigured = await azure.translatorUsage();
  assert.equal(unconfigured.used, null);
  assert.equal(unconfigured.remaining, null);
  env.AZURE_TRANSLATOR_KEY = 'test'; env.AZURE_TRANSLATOR_REGION = 'test';
  assert.equal((await azure.translatorUsage()).code, 'AZURE_METRICS_NOT_CONFIGURED');
  await assert.rejects(azure.translateBatch('a', ['Catatan'], 'en'), error => error.code === 'TRANSLATOR_LIMIT_REACHED' && error.status === 429);
});

test('POST translation requires authentication and bounds languages, text and protected terms', async () => {
  const writes = [];
  let signedIn = false;
  const route = load('app/api/translate/route.ts', {
    '@/lib/i18n/auth': { translationUser: async () => signedIn ? { id: 'actor' } : null, allowTranslation: () => true },
    '@/lib/i18n/messages': messages,
    '@/lib/i18n/azure': { TranslationError: class extends Error {}, translateBatch: async (...args) => { writes.push(args); return ['Translated']; } },
  });
  const request = body => new Request('http://localhost/api/translate', { method: 'POST', body: JSON.stringify(body) });
  assert.equal((await route.POST(request({ target: 'en', texts: ['Teks'] }))).status, 401);
  signedIn = true;
  for (const body of [{ target: 'fr', texts: ['x'] }, { target: 'en', texts: [] }, { target: 'en', texts: ['x'.repeat(3001)] }, { target: 'en', texts: ['x'], protectedTerms: [123] }]) {
    assert.equal((await route.POST(request(body))).status, 400);
  }
  assert.equal((await route.POST(new Request('http://localhost/api/translate', { method: 'POST', body: 'x'.repeat(64_001) }))).status, 413);
  assert.equal(writes.length, 0);
  const response = await route.POST(request({ userId: 'spoofed', target: 'en', texts: ['Teks'] }));
  assert.equal(response.status, 200);
  assert.equal(writes[0][0], 'actor');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});

test('Azure free-tier exhaustion 403001 is recognized without exposing provider details', async () => {
  const azure = load('lib/i18n/azure.ts', { './protect': protect }, {
    process: { env: { AZURE_TRANSLATOR_KEY: 'test', AZURE_TRANSLATOR_REGION: 'global' } },
    fetch: async () => Response.json({ error: { code: 403001, message: 'private provider diagnostics' } }, { status: 403 }),
  });
  await assert.rejects(azure.translateBatch('a', ['Catatan'], 'en'), error => error.code === 'TRANSLATOR_LIMIT_REACHED' && !error.message.includes('private'));
});

test('shared Azure usage is only exposed to the approved administrators', async () => {
  let email = 'staff@example.test'; let metricsReads = 0;
  const route = load('app/api/translate/usage/route.ts', {
    '@/lib/i18n/auth': { translationUser: async () => ({ id: 'actor', email }) },
    '@/lib/i18n/azure': { azureConfigured: () => true, translatorUsage: async () => { metricsReads++; return { used: 10, remaining: 1_999_990 }; } },
  });
  const response = await route.GET(new Request('http://localhost/api/translate/usage'));
  assert.equal((await response.json()).code, 'ADMIN_REQUIRED_FOR_USAGE');
  assert.equal(metricsReads, 0);
  email = 'griselda@andima.co.id';
  assert.equal((await (await route.GET(new Request('http://localhost/api/translate/usage'))).json()).used, 10);
  assert.equal(metricsReads, 1);
});


test('translation retries transient provider errors and then succeeds', async () => {
  let calls = 0;
  const request = load('lib/i18n/request.ts', {}, {
    setTimeout: callback => { callback(); return 0; },
    fetch: async () => ++calls < 3
      ? Response.json({ code: 'TRANSLATOR_UNAVAILABLE' }, { status: 502 })
      : Response.json({ translations: ['Report ready.'] }),
  });
  const { response, result } = await request.requestTranslation('/api/translate', { method: 'POST' });
  assert.equal(calls, 3);
  assert.equal(response.status, 200);
  assert.equal(result.translations[0], 'Report ready.');
});

test('network retries are bounded and quota/configuration/auth failures are not retried', async () => {
  let calls = 0;
  const request = load('lib/i18n/request.ts', {}, {
    setTimeout: callback => { callback(); return 0; },
    fetch: async () => { calls++; throw new Error('network offline'); },
  });
  await assert.rejects(request.requestTranslation('/api/translate', {}));
  assert.equal(calls, 3);
  for (const [status, code] of [[429, 'TRANSLATOR_LIMIT_REACHED'], [503, 'TRANSLATOR_NOT_CONFIGURED'], [401, 'UNAUTHENTICATED']]) {
    let count = 0;
    const noRetry = load('lib/i18n/request.ts', {}, { fetch: async () => { count++; return Response.json({ code }, { status }); } });
    await noRetry.requestTranslation('/api/translate', {});
    assert.equal(count, 1);
  }
});

test('chart month labels localize both ways without changing dates', () => {
  assert.equal(messages.localizeMonthLabel('Mei 2026', 'en'), 'May 2026');
  assert.equal(messages.localizeMonthLabel('Agu 2026', 'en'), 'Aug 2026');
  assert.equal(messages.localizeMonthLabel('Oct 2026', 'id'), 'Okt 2026');
  assert.equal(messages.translateUi('Total Profit', 'id'), 'Total Laba');
});
