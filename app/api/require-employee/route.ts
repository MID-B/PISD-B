import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return Response.json({ error: 'Tidak terautentikasi.' }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return Response.json({ error: 'Konfigurasi Supabase belum tersedia.' }, { status: 500 });
  }

  try {
    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return Response.json({ error: 'Tidak terautentikasi.' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('b2_vw_require_employee')
      .select('position, department, status, description');

    if (error) {
      console.error('Gagal membaca b2_vw_require_employee.', { code: error.code });
      return Response.json({ error: 'Data Require Employee gagal dimuat.' }, { status: 500 });
    }

    return Response.json({ data: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Data Require Employee gagal dimuat.' }, { status: 500 });
  }
}
