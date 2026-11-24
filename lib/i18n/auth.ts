import 'server-only';
import { createClient } from '@supabase/supabase-js';

export async function translationUser(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !key) return null;
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const { data, error } = await supabase.auth.getUser(token);
    return error ? null : data.user;
  } catch { return null; }
}

// Best-effort instance-local abuse control; Azure still enforces its resource quota.
const limits = new Map<string, { count: number; reset: number }>();
export function allowTranslation(userId: string) {
  const now = Date.now();
  for (const [key, entry] of limits) if (entry.reset < now) limits.delete(key);
  const entry = limits.get(userId) ?? { count: 0, reset: now + 60_000 };
  if (entry.count >= 20 || (!limits.has(userId) && limits.size >= 5000)) return false;
  entry.count++;
  limits.set(userId, entry);
  return true;
}
