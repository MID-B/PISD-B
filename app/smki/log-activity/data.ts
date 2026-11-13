import { supabase } from '@/lib/supabaseClient';
import { formatUserAgent } from '@/query/activity';
import { buildAccountHistories, type AccountProfile, type StoredActivity, type StoredLogin } from './model';

const BATCH_SIZE = 500;
type DatabaseError = { message: string } | null;

/** Fetch every page; Supabase's default response limit must not truncate account histories. */
async function readPages<T>(read: (start: number, end: number) => PromiseLike<{ data: unknown[] | null; error: DatabaseError }>, signal: AbortSignal): Promise<T[]> {
  const rows: T[] = [];
  for (let start = 0; ; start += BATCH_SIZE) {
    signal.throwIfAborted();
    const { data, error } = await read(start, start + BATCH_SIZE - 1);
    signal.throwIfAborted();
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < BATCH_SIZE) return rows;
  }
}

export async function loadAccountHistories(signal: AbortSignal) {
  const [profiles, activities, logins] = await Promise.all([
    readPages<AccountProfile>((start, end) => supabase.from('b2_register')
      .select('id, full_name, email, is_active, departement_id, position:d3_positions!position_id(title), department:d3_departments!departement_id(name)')
      .order('id').range(start, end).abortSignal(signal), signal),
    readPages<Omit<StoredActivity, 'browser'> & { user_agent: string | null }>((start, end) => supabase.from('b1_activity')
      .select('id, register_id, user_id, description, ip_address, user_agent, created_at')
      .order('created_at', { ascending: false }).order('id', { ascending: false }).range(start, end).abortSignal(signal), signal),
    readPages<StoredLogin>((start, end) => supabase.from('b3_log_login')
      .select('id, register_id, nama, email, position, departement, tanggal_login, waktu_login, tanggal_logout, waktu_logout')
      .order('tanggal_login', { ascending: false }).order('waktu_login', { ascending: false }).order('id', { ascending: false })
      .range(start, end).abortSignal(signal), signal),
  ]);
  return buildAccountHistories(profiles, activities.map((row) => ({ ...row, browser: formatUserAgent(row.user_agent) })), logins);
}
