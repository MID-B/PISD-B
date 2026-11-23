import { translationUser, allowTranslation } from '@/lib/i18n/auth';
import { isLanguage } from '@/lib/i18n/messages';
import { translateBatch, TranslationError } from '@/lib/i18n/azure';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };

export async function POST(request: Request) {
  const user = await translationUser(request);
  if (!user) return Response.json({ code: 'UNAUTHENTICATED' }, { status: 401, headers });
  if (!allowTranslation(user.id)) return Response.json({ code: 'TRANSLATOR_RATE_LIMIT' }, { status: 429, headers });
  // Read a bounded body even when Content-Length is absent or misleading.
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ code: 'INVALID_REQUEST' }, { status: 400, headers });
  let raw = '', size = 0;
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 64_000) { await reader.cancel(); return Response.json({ code: 'REQUEST_TOO_LARGE' }, { status: 413, headers }); }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    const body = JSON.parse(raw);
    if (!isLanguage(body?.target) || !Array.isArray(body.texts) || body.texts.length < 1 || body.texts.length > 40
      || !body.texts.every((text: unknown) => typeof text === 'string' && text.trim() && text.length <= 3000)
      || body.texts.reduce((sum: number, text: string) => sum + Array.from(text).length, 0) > 12_000
      || (body.protectedTerms !== undefined && (!Array.isArray(body.protectedTerms) || body.protectedTerms.length > 60
        || !body.protectedTerms.every((term: unknown) => typeof term === 'string' && term.length <= 200)))) {
      return Response.json({ code: 'INVALID_REQUEST' }, { status: 400, headers });
    }
    const translations = await translateBatch(user.id, body.texts, body.target, body.protectedTerms ?? []);
    return Response.json({ translations }, { headers });
  } catch (error) {
    if (error instanceof TranslationError) return Response.json({ code: error.code }, { status: error.status, headers });
    return Response.json({ code: 'INVALID_REQUEST' }, { status: 400, headers });
  }
}
