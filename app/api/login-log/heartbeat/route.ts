import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

function getJakartaDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return Response.json({ error: 'Tidak terautentikasi.' }, { status: 401 });

  try {
    const admin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      return Response.json({ error: 'Tidak terautentikasi.' }, { status: 401 });
    }

    // b3_log_login.register_id stores b2_register.id, not necessarily Auth's user.id.
    let { data: register, error: registerError } = await admin.from('b2_register')
      .select('id').eq('auth_user_id', user.id).maybeSingle();
    if (!register && !registerError) {
      ({ data: register, error: registerError } = await admin.from('b2_register')
        .select('id').eq('id', user.id).maybeSingle());
    }
    if (!register && !registerError && user.email) {
      ({ data: register, error: registerError } = await admin.from('b2_register')
        .select('id').ilike('email', user.email).maybeSingle());
    }
    if (registerError || !register) {
      console.error('Akun b2_register untuk sesi MID tidak ditemukan.');
      return Response.json({ success: true, logged: false });
    }

    const { data: login, error: findError } = await admin.from('b3_log_login')
      .select('id')
      .eq('register_id', register.id)
      .is('waktu_logout', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError) {
      console.error('Gagal mencari sesi untuk heartbeat Log Login.', { code: findError.code });
      return Response.json({ error: 'Gagal memperbarui heartbeat.' }, { status: 500 });
    }

    if (!login) {
      // Returning from the landing page can remount the dashboard while the
      // Auth session is still valid. Reopen today's single daily row only for
      // that explicit page-entry/focus heartbeat, never for background pings.
      if (request.headers.get('x-resume-login-session') !== 'true') {
        return Response.json({ success: true, logged: false });
      }
      const { data: closedToday, error: closedTodayError } = await admin.from('b3_log_login')
        .select('id')
        .eq('register_id', register.id)
        .eq('tanggal_login', getJakartaDate())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (closedTodayError) {
        console.error('Gagal mencari sesi harian untuk dibuka kembali.', { code: closedTodayError.code });
        return Response.json({ error: 'Gagal memperbarui heartbeat.' }, { status: 500 });
      }
      if (!closedToday) return Response.json({ success: true, logged: false });

      const { error: reopenError } = await admin.from('b3_log_login').update({
        tanggal_logout: null,
        waktu_logout: null,
        last_seen_at: new Date().toISOString(),
      }).eq('id', closedToday.id);
      if (reopenError) {
        console.error('Gagal membuka kembali sesi harian.', { code: reopenError.code });
        return Response.json({ error: 'Gagal memperbarui heartbeat.' }, { status: 500 });
      }
      return Response.json({ success: true, logged: true });
    }

    const { error: updateError } = await admin.from('b3_log_login')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', login.id)
      .is('waktu_logout', null);

    if (updateError) {
      console.error('Gagal menyimpan heartbeat Log Login.', { code: updateError.code });
      return Response.json({ error: 'Gagal memperbarui heartbeat.' }, { status: 500 });
    }

    return Response.json({ success: true, logged: true });
  } catch {
    console.error('Endpoint heartbeat Log Login gagal.');
    return Response.json({ error: 'Gagal memperbarui heartbeat.' }, { status: 500 });
  }
}
