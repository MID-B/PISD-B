import 'server-only';
import { createHash } from 'node:crypto';
import { protectTranslation, restoreTranslation } from './protect';
import type { Language } from './messages';

const API_URL = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0';
const cache = new Map<string, { value: string; expires: number }>();
export class TranslationError extends Error {
  constructor(public code: string, public status: number) { super(code); }
}
export function azureConfigured() {
  return Boolean(process.env.AZURE_TRANSLATOR_KEY?.trim() && process.env.AZURE_TRANSLATOR_REGION?.trim());
}

export async function translateBatch(userId: string, texts: string[], target: Language, protectedTerms: string[] = []) {
  if (!azureConfigured()) throw new TranslationError('TRANSLATOR_NOT_CONFIGURED', 503);
  const prepared = texts.map(text => {
    const protectedText = protectTranslation(text, protectedTerms);
    const key = createHash('sha256').update(JSON.stringify([userId, target, protectedText.masked, protectedText.values])).digest('hex');
    return { ...protectedText, key, original: text };
  });
  const translations = prepared.map(item => {
    const hit = cache.get(item.key);
    return hit && hit.expires > Date.now() ? hit.value : undefined;
  });
  const missing = prepared.map((item, index) => ({ ...item, index })).filter(item => translations[item.index] === undefined);
  if (missing.length) {
    let response: Response;
    try {
      response = await fetch(`${API_URL}&to=${target}&textType=plain`, {
        method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(12_000),
        headers: {
          'Ocp-Apim-Subscription-Key': process.env.AZURE_TRANSLATOR_KEY!,
          ...(process.env.AZURE_TRANSLATOR_REGION?.toLowerCase() === 'global' ? {} : { 'Ocp-Apim-Subscription-Region': process.env.AZURE_TRANSLATOR_REGION! }),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(missing.map(item => ({ Text: item.masked }))),
      });
    } catch { throw new TranslationError('TRANSLATOR_UNAVAILABLE', 502); }
    if (!response.ok) {
      const failure = await response.json().catch(() => null);
      const limitReached = response.status === 429 || failure?.error?.code === 403001;
      throw new TranslationError(limitReached ? 'TRANSLATOR_LIMIT_REACHED' : 'TRANSLATOR_UNAVAILABLE', limitReached ? 429 : 502);
    }
    const data: unknown = await response.json().catch(() => null);
    if (!Array.isArray(data) || data.length !== missing.length) throw new TranslationError('TRANSLATOR_INVALID_RESPONSE', 502);
    for (const [index, item] of missing.entries()) {
      const entries = data[index]?.translations;
      const result = Array.isArray(entries) ? entries.find((entry: { to?: unknown } | null) => entry?.to === target)?.text : undefined;
      if (typeof result !== 'string') throw new TranslationError('TRANSLATOR_INVALID_RESPONSE', 502);
      const value = restoreTranslation(result, item.values);
      // Never show altered identifiers if a provider fails to preserve placeholders.
      if (value === null) throw new TranslationError('TRANSLATOR_IDENTIFIER_CHANGED', 502);
      translations[item.index] = value;
      cache.set(item.key, { value, expires: Date.now() + 60 * 60_000 });
    }
    while (cache.size > 1500) cache.delete(cache.keys().next().value!);
  }
  return translations as string[];
}

export async function translatorUsage() {
  const resourceId = process.env.AZURE_TRANSLATOR_RESOURCE_ID;
  const tenant = process.env.AZURE_MONITOR_TENANT_ID;
  const clientId = process.env.AZURE_MONITOR_CLIENT_ID;
  const secret = process.env.AZURE_MONITOR_CLIENT_SECRET;
  const base = { configured: azureConfigured(), allowance: 2_000_000, used: null as number | null, remaining: null as number | null };
  if (!base.configured) return { ...base, code: 'TRANSLATOR_NOT_CONFIGURED' };
  if (!resourceId || !tenant || !clientId || !secret) return { ...base, code: 'AZURE_METRICS_NOT_CONFIGURED' };
  if (!/^[\w-]+$/.test(tenant) || !/^\/subscriptions\/[\w-]+\/resourceGroups\/[\w.()-]+\/providers\/Microsoft\.CognitiveServices\/accounts\/[\w-]+$/i.test(resourceId)) {
    return { ...base, code: 'AZURE_METRICS_NOT_CONFIGURED' };
  }
  try {
    const auth = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(8000),
      body: new URLSearchParams({ client_id: clientId, client_secret: secret, grant_type: 'client_credentials', scope: 'https://management.azure.com/.default' }),
    });
    if (!auth.ok) return { ...base, code: 'AZURE_METRICS_UNAVAILABLE' };
    const token = await auth.json();
    if (typeof token.access_token !== 'string') return { ...base, code: 'AZURE_METRICS_UNAVAILABLE' };
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const query = new URLSearchParams({ 'api-version': '2023-10-01', metricnames: 'TextCharactersTranslated', aggregation: 'Total', interval: 'P1D', timespan: `${start.toISOString()}/${now.toISOString()}` });
    const response = await fetch(`https://management.azure.com${resourceId}/providers/microsoft.insights/metrics?${query}`, {
      headers: { Authorization: `Bearer ${token.access_token}` }, cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { ...base, code: 'AZURE_METRICS_UNAVAILABLE' };
    const data = await response.json();
    const points = data.value?.flatMap((metric: { timeseries?: { data?: { total?: unknown }[] }[] }) => metric.timeseries?.flatMap(series => series.data ?? []) ?? []) ?? [];
    const totals = points.map((point: { total?: unknown }) => point.total).filter((value: unknown): value is number => typeof value === 'number' && Number.isFinite(value));
    if (!totals.length) return { ...base, code: 'AZURE_METRICS_UNAVAILABLE' };
    const used = totals.reduce((sum: number, value: number) => sum + value, 0);
    // Azure metrics can lag, and this is a calendar-month metric, not a billing guarantee.
    return { ...base, used, remaining: Math.max(0, base.allowance - used), code: 'AZURE_METRICS_AVAILABLE', periodStart: start.toISOString(), checkedAt: now.toISOString() };
  } catch { return { ...base, code: 'AZURE_METRICS_UNAVAILABLE' }; }
}
