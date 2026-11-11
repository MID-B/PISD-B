
import { supabase } from "@/lib/supabaseClient";

const LOGIN_LOG_SESSION_KEY = "b3_log_login_id";
const LOG_TIME_ZONE = "Asia/Jakarta";

function getJakartaDateTime() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LOG_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );

  return {
    tanggal: `${values.year}-${values.month}-${values.day}`,
    waktu: `${values.hour}:${values.minute}:${values.second}`,
  };
}

export type LoginLogRecord = {
  id: string;
  register_id: string | null;
  nama: string | null;
  email: string | null;
  position: string | null;
  departement: string | null;
  tanggal_login: string;
  waktu_login: string | null;
  tanggal_logout: string | null;
  waktu_logout: string | null;
};

export type LoginLogFilters = {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  nameSearch?: string;
  emailSearch?: string;
  department?: string;
};

export async function fetchLoginLogs({
  page = 1,
  pageSize = 10,
  startDate,
  endDate,
  nameSearch = '',
  emailSearch = '',
  department = '',
}: LoginLogFilters = {}): Promise<{
  rows: LoginLogRecord[];
  total: number;
}> {
  const size = [10, 25, 50].includes(pageSize) ? pageSize : 10;
  const safePage = Math.max(1, Math.floor(page));
  const from = (safePage - 1) * size;
  const to = from + size - 1;

  let query = supabase
    .from('b3_log_login')
    .select(
      `
        id,
        register_id,
        nama,
        email,
        "position",
        departement,
        tanggal_login,
        waktu_login,
        tanggal_logout,
        waktu_logout
      `,
      { count: 'exact' },
    );

  if (startDate) query = query.gte('tanggal_login', startDate);
  if (endDate) query = query.lte('tanggal_login', endDate);

  const search = nameSearch.trim();
  if (search) {
    query = query.or(
      `nama.ilike.%${search}%,email.ilike.%${search}%`,
    );
  }

  const dept = department.trim();
  if (dept) query = query.ilike('departement', dept);

  const { data, error, count } = await query
    .order('tanggal_login', { ascending: false })
    .order('waktu_login', { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`Gagal mengambil log login: ${error.message}`);
  }

  return {
    rows: (data ?? []) as LoginLogRecord[],
    total: count ?? 0,
  };
}

export async function recordLogin(): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    throw new Error(
      `Tidak dapat membaca pengguna yang login: ${userError?.message ?? "email pengguna tidak tersedia"
      }`
    );
  }

  const { data: register, error: registerError } = await supabase
    .from("b2_register")
    .select(`
      id,
      full_name,
      email,
      position_id,
      departement_id
    `)
    .ilike("email", user.email)
    .single();

  if (registerError || !register) {
    throw new Error(
      `Gagal membaca profil b2_register: ${registerError?.message ?? "profil tidak ditemukan"
      }`
    );
  }

  if (!register.position_id) {
    throw new Error(
      "Profil pengguna belum memiliki position_id di b2_register."
    );
  }

  if (!register.departement_id) {
    throw new Error(
      "Profil pengguna belum memiliki departement_id di b2_register."
    );
  }

  const { data: positionData, error: positionError } = await supabase
    .from("d3_positions")
    .select("title")
    .eq("id", register.position_id)
    .maybeSingle();

  if (positionError || !positionData?.title) {
    throw new Error(
      `Gagal membaca posisi dari d3_positions: ${positionError?.message ??
      "posisi tidak ditemukan atau tidak diizinkan oleh RLS/Data API"
      }`
    );
  }

  const { data: departmentData, error: departmentError } = await supabase
    .from("d3_departments")
    .select("name")
    .eq("id", register.departement_id)
    .maybeSingle();

  if (departmentError || !departmentData?.name) {
    throw new Error(
      `Gagal membaca departemen dari d3_departments: ${departmentError?.message ??
      "departemen tidak ditemukan atau tidak diizinkan oleh RLS/Data API"
      }`
    );
  }

  const loginTime = getJakartaDateTime();

  const { data: log, error: logError } = await supabase
    .from("b3_log_login")
    .upsert(
      {
        register_id: register.id,
        nama: register.full_name,
        email: register.email,
        position: positionData.title,
        departement: departmentData.name,
        tanggal_login: loginTime.tanggal,
        waktu_login: loginTime.waktu,
        tanggal_logout: null,
        waktu_logout: null,
        last_seen_at: new Date().toISOString(),
      },
      {
        onConflict: "register_id, tanggal_login", // Mencegah error duplicate key
      }
    )
    .select("id")
    .single();

  if (logError || !log) {
    throw new Error(
      `Gagal menyimpan riwayat login: ${logError?.message ?? "ID log tidak dikembalikan"
      }`
    );
  }

  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(
      LOGIN_LOG_SESSION_KEY,
      log.id
    );
  }
}

export async function recordLogout(): Promise<void> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.email) {
      return;
    }

    const logoutTime = getJakartaDateTime();

    // 1. Cari log login paling baru milik user yang belum logout (waktu_logout masih null)
    const { data: latestLog, error: fetchError } = await supabase
      .from("b3_log_login")
      .select("id")
      .eq("email", user.email)
      .is("waktu_logout", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError || !latestLog) {
      console.warn("Tidak ditemukan sesi login aktif untuk di-logout:", fetchError?.message);
      return;
    }

    // 2. Update baris log login tersebut dengan tanggal & waktu logout
    const { error: updateError } = await supabase
      .from("b3_log_login")
      .update({
        tanggal_logout: logoutTime.tanggal,
        waktu_logout: logoutTime.waktu,
      })
      .eq("id", latestLog.id);

    if (updateError) {
      console.error("Gagal mencatat logout:", updateError.message);
      return;
    }

    // 3. Bersihkan sessionStorage jika ada
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(LOGIN_LOG_SESSION_KEY);
    }
  } catch (error) {
    console.error("Error recordLogout:", error);
  }
}