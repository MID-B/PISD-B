export type AccountProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean | null;
  departement_id: string | null;
  position: { title: string | null } | null;
  department: { name: string | null } | null;
};

export type StoredActivity = {
  id: string;
  register_id: string | null;
  user_id: string | null;
  description: string | null;
  ip_address: string | null;
  browser: string;
  created_at: string;
};

export type StoredLogin = {
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

export type LoginSession = StoredLogin & { loginAt: string | null; logoutAt: string | null };
export type AccountEvent = { id: string; description: string; createdAt: string };
export type AccountHistory = {
  id: string;
  name: string;
  email: string;
  department: string;
  departmentId: string | null;
  role: string;
  activities: StoredActivity[];
  sessions: LoginSession[];
  events: AccountEvent[];
  online: boolean;
  isActive: boolean;
};
export type AccountSummary = AccountHistory & { lastEvent: AccountEvent };
export const DETAIL_PAGE_SIZE = 5;

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
});
const displayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Jakarta', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
});

export function jakartaDay(timestamp: string | null): string {
  if (!timestamp || !Number.isFinite(Date.parse(timestamp))) return '';
  return dayFormatter.format(new Date(timestamp));
}

export function displayDateTime(timestamp: string | null): string {
  return timestamp && Number.isFinite(Date.parse(timestamp)) ? displayFormatter.format(new Date(timestamp)) : '-';
}

/** Presentation only: keep the original audit description in stored records. */
export function displayActivityDescription(description: string | null): string {
  if (!description?.trim()) return '-';
  const visit = description.trim().match(/^Membuka halaman\s+(\/\S*)\.?$/i);
  if (!visit) return description;
  const path = visit[1].replace(/\.$/, '').split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  const pages: Record<string, string> = {
    '/': 'halaman utama aplikasi',
    '/login': 'halaman Login',
    '/register': 'halaman Register',
    '/landing-page': 'halaman pemilihan sistem',
    '/dashboard': 'Dashboard MID',
    '/dashboard/sales-performance': 'halaman Sales Performance di sistem MID',
    '/dashboard/issue-board': 'halaman Issue Board di sistem MID',
    '/smki/dashboard': 'Dashboard SMKI',
    '/smki/account-maintains': 'halaman Account Maintains di sistem SMKI',
    '/smki/log-activity': 'halaman Log Activity di sistem SMKI',
    '/smki/log-login': 'halaman Log Login di sistem SMKI',
    '/smki/dashboard/loglogin': 'halaman Log Login di sistem SMKI',
  };
  const title = pages[path] || `halaman ${path.split('/').filter(Boolean).map((part) => {
    let label = part;
    try { label = decodeURIComponent(part); } catch { /* Preserve malformed legacy paths. */ }
    return label.replace(/[\/_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }).join(' > ')}`;
  return `Membuka ${title}.`;
}

function sessionTime(date: string | null, time: string | null): string | null {
  if (!date || !time) return null;
  const value = `${date}T${time}+07:00`;
  return Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
}

export function sessionMatchesDate(session: LoginSession, date: string): boolean {
  return Boolean(date) && (session.tanggal_login === date || session.tanggal_logout === date);
}

export function initials(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || '?';
}

/** Read-model only: no activity or login row is ever updated here. */
export function buildAccountHistories(profiles: AccountProfile[], activities: StoredActivity[], logins: StoredLogin[]): AccountHistory[] {
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const profileByEmail = new Map<string, AccountProfile | null>();
  for (const profile of profiles) {
    if (!profile.email) continue;
    const email = profile.email.trim().toLowerCase();
    profileByEmail.set(email, profileByEmail.has(email) ? null : profile);
  }
  const accounts = new Map<string, AccountHistory>();
  function account(id: string, snapshot?: StoredLogin) {
    let result = accounts.get(id);
    if (!result) {
      const profile = profileById.get(id);
      result = {
        id, name: profile?.full_name || snapshot?.nama || '-', email: profile?.email || snapshot?.email || '-',
        department: profile?.department?.name || snapshot?.departement || '-', departmentId: profile?.departement_id ?? null,
        role: profile?.position?.title || snapshot?.position || '-', activities: [], sessions: [], events: [], online: false,
        isActive: profile?.is_active !== false,
      };
      accounts.set(id, result);
    }
    return result;
  }
  // Old sessions without register_id can still be linked through an unambiguous profile email.
  for (const row of [...logins].sort((a, b) => `${b.tanggal_login} ${b.waktu_login ?? ''}`.localeCompare(`${a.tanggal_login} ${a.waktu_login ?? ''}`))) {
    const email = row.email?.trim().toLowerCase();
    const id = row.register_id || (email ? profileByEmail.get(email)?.id : undefined) || (email ? `email:${email}` : undefined);
    if (!id) continue;
    const owner = account(id, row);
    const session = { ...row, loginAt: sessionTime(row.tanggal_login, row.waktu_login), logoutAt: sessionTime(row.tanggal_logout, row.waktu_logout) };
    owner.sessions.push(session);
    if (session.loginAt) owner.events.push({ id: `login:${row.id}`, description: 'Login ke aplikasi.', createdAt: session.loginAt });
    if (session.logoutAt) owner.events.push({ id: `logout:${row.id}`, description: 'Logout dari aplikasi.', createdAt: session.logoutAt });
  }
  for (const row of activities) {
    const id = row.register_id || row.user_id;
    if (!id) continue;
    const owner = account(id);
    owner.activities.push(row);
    if (Number.isFinite(Date.parse(row.created_at))) {
      owner.events.push({ id: `activity:${row.id}`, description: row.description ?? '-', createdAt: row.created_at });
    }
  }
  for (const owner of accounts.values()) {
    owner.activities.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id.localeCompare(a.id));
    owner.events.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
      || Number(b.id.startsWith('activity:')) - Number(a.id.startsWith('activity:')) || b.id.localeCompare(a.id));
    const latest = owner.sessions[0];
    owner.online = Boolean(latest && !latest.tanggal_logout && !latest.waktu_logout);
  }
  return [...accounts.values()];
}

export function filterAccountSummaries(accounts: AccountHistory[], { search = '', departmentId = '', date = '' } = {}): AccountSummary[] {
  const term = search.trim().toLocaleLowerCase('id-ID');
  const results: AccountSummary[] = [];
  for (const account of accounts) {
    if (term && ![account.name, account.email].some((value) => value.toLocaleLowerCase('id-ID').includes(term))) continue;
    if (departmentId && (account.departmentId || `name:${account.department}`) !== departmentId) continue;
    const lastEvent = account.events.find((event) => !date || jakartaDay(event.createdAt) === date);
    if (lastEvent) results.push({ ...account, lastEvent });
  }
  return results.sort((a, b) => Date.parse(b.lastEvent.createdAt) - Date.parse(a.lastEvent.createdAt) || a.id.localeCompare(b.id));
}

export function firstMatchingPage<T>(rows: T[], matches: (row: T) => boolean): number {
  const index = rows.findIndex(matches);
  return index < 0 ? 1 : Math.floor(index / DETAIL_PAGE_SIZE) + 1;
}

export function detailPage<T>(rows: T[], requestedPage: number) {
  const totalPages = Math.max(1, Math.ceil(rows.length / DETAIL_PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const offset = (page - 1) * DETAIL_PAGE_SIZE;
  return { rows: rows.slice(offset, offset + DETAIL_PAGE_SIZE), page, totalPages, start: rows.length ? offset + 1 : 0, end: Math.min(offset + DETAIL_PAGE_SIZE, rows.length) };
}
