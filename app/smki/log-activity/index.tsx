"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, RotateCcw, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { loadAccountHistories } from './data';
import {
  detailPage, displayActivityDescription, displayDateTime, filterAccountSummaries, firstMatchingPage, initials, jakartaDay, sessionMatchesDate,
  type AccountHistory,
} from './model';

const DEPARTMENTS = [
  { id: '6e116b24-22fe-4b8f-be7e-2159b99022bd', name: 'Human Resources' },
  { id: '8113ab6f-d5cc-4c94-bbf6-e08047931fab', name: 'Information Technology' },
  { id: '1653db5f-2b64-418f-b28b-68cb7b9dae8e', name: 'Finance, Accounting & Tax' },
  { id: '97ac5d35-5da2-4f5d-9d36-78500f403cc7', name: 'Commercial & Customer Success' },
];
type HistoryTab = 'activity' | 'login';
const ACCOUNT_PAGE_SIZE = 10;

function Status({ online, isActive }: { online: boolean; isActive: boolean }) {
  const textColor = !isActive ? 'text-red-600' : online ? 'text-emerald-600' : 'text-slate-500';
  const dotColor = !isActive ? 'bg-red-500' : online ? 'bg-emerald-500' : 'bg-slate-300';
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap font-semibold ${textColor}`}>
    <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
    {!isActive ? 'Deactive' : online ? 'Online' : 'Offline'}
  </span>;
}

function HistoryPagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  const start = Math.max(1, Math.min(page - 1, totalPages - 4));
  const numbers = Array.from({ length: Math.min(5, totalPages) }, (_, index) => start + index);
  const buttonClass = 'inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 cursor-pointer hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-40';
  return <nav aria-label="Pagination riwayat akun" className="flex items-center gap-1.5">
    <button type="button" aria-label="Halaman sebelumnya" disabled={page <= 1} onClick={() => onChange(page - 1)} className={buttonClass}>&lsaquo;</button>
    {numbers.map((number) => <button key={number} type="button" aria-label={`Halaman ${number}`} aria-current={number === page ? 'page' : undefined} onClick={() => onChange(number)} className={number === page ? 'inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-blue-600 bg-blue-600 px-2 text-xs font-semibold text-white cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500' : buttonClass}>{number}</button>)}
    <button type="button" aria-label="Halaman berikutnya" disabled={page >= totalPages} onClick={() => onChange(page + 1)} className={buttonClass}>&rsaquo;</button>
  </nav>;
}

export default function LogActivity({ active }: { active: boolean }) {
  const [accounts, setAccounts] = useState<AccountHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [date, setDate] = useState('');
  const [requestedAccountPage, setRequestedAccountPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<HistoryTab>('activity');
  const [requestedPage, setRequestedPage] = useState(1);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    let pending = false;
    async function load() {
      if (pending || controller.signal.aborted) return;
      pending = true;
      try {
        const result = await loadAccountHistories(controller.signal);
        if (!controller.signal.aborted) { setAccounts(result); setError(''); }
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Koneksi database gagal.');
      } finally {
        pending = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    const refresh = () => { if (document.visibilityState !== 'hidden') void load(); };
    void load();
    const channel = supabase.channel('smki-account-activity')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'b1_activity' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'b3_log_login' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'b2_register' }, refresh)
      .subscribe();
    // Polling also refreshes login status if b3_log_login is not published to Realtime.
    const interval = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      void supabase.removeChannel(channel);
    };
  }, [active, reload]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (active && selectedId) {
      if (!dialog?.open) dialog?.showModal();
    } else if (dialog?.open) dialog.close();
  }, [active, selectedId]);

  const rows = useMemo(() => filterAccountSummaries(accounts, { search, departmentId, date }), [accounts, search, departmentId, date]);
  const accountTotalPages = Math.max(1, Math.ceil(rows.length / ACCOUNT_PAGE_SIZE));
  const accountPage = Math.min(requestedAccountPage, accountTotalPages);
  const accountOffset = (accountPage - 1) * ACCOUNT_PAGE_SIZE;
  const visibleAccounts = rows.slice(accountOffset, accountOffset + ACCOUNT_PAGE_SIZE);
  const departments = useMemo(() => {
    const choices = new Map(DEPARTMENTS.map((department) => [department.id, department.name]));
    for (const account of accounts) if (account.department !== '-') choices.set(account.departmentId || `name:${account.department}`, account.department);
    return [...choices].map(([id, name]) => ({ id, name }));
  }, [accounts]);
  const selected = accounts.find((account) => account.id === selectedId);
  const latestSession = selected?.sessions[0];
  const activityPage = detailPage(selected?.activities ?? [], requestedPage);
  const loginPage = detailPage(selected?.sessions ?? [], requestedPage);
  const currentPage = tab === 'activity' ? activityPage : loginPage;
  const total = tab === 'activity' ? selected?.activities.length ?? 0 : selected?.sessions.length ?? 0;
  const matchCount = !selected || !date ? 0 : tab === 'activity'
    ? selected.activities.filter((activity) => jakartaDay(activity.created_at) === date).length
    : selected.sessions.filter((session) => sessionMatchesDate(session, date)).length;

  function openAccount(account: AccountHistory) {
    const activityMatch = (activity: AccountHistory['activities'][number]) => jakartaDay(activity.created_at) === date;
    const showLogin = account.activities.length === 0 || Boolean(date && !account.activities.some(activityMatch)
      && account.sessions.some((session) => sessionMatchesDate(session, date)));
    setTab(showLogin ? 'login' : 'activity');
    setRequestedPage(!date ? 1 : showLogin
      ? firstMatchingPage(account.sessions, (session) => sessionMatchesDate(session, date))
      : firstMatchingPage(account.activities, activityMatch));
    setSelectedId(account.id);
  }
  function changeTab(next: HistoryTab) {
    setTab(next);
    if (!selected || !date) { setRequestedPage(1); return; }
    setRequestedPage(next === 'activity'
      ? firstMatchingPage(selected.activities, (activity) => jakartaDay(activity.created_at) === date)
      : firstMatchingPage(selected.sessions, (session) => sessionMatchesDate(session, date)));
  }

  return (
    <div hidden={!active} className="min-h-0 flex-1 overflow-auto bg-[#f1f3fc] px-4 py-5 sm:px-6" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="relative min-w-[200px] flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="search" aria-label="Cari akun berdasarkan nama atau email" placeholder="Search by Employee's Name or Email" value={search} onChange={(event) => { setSearch(event.target.value); setRequestedAccountPage(1); }} className="h-10 w-full rounded-xl border border-transparent bg-[#f1f3fe] pl-10 pr-4 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:border-purple-300 focus:bg-white focus:outline-none" />
        </div>
        <select aria-label="Filter departemen" value={departmentId} onChange={(event) => { setDepartmentId(event.target.value); setRequestedAccountPage(1); }} className="h-10 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 shadow-2xs focus:border-purple-400 focus:outline-none sm:w-56">
          <option value="">All Department</option>
          {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
        </select>
        <div className={`relative flex h-10 shrink-0 items-center rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 shadow-2xs focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100 ${date ? 'w-40 justify-between px-3.5' : 'w-10 justify-center'}`}>
          {date && <span aria-hidden="true">{date.split('-').reverse().join('/')}</span>}
          <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0" />
          <input type="date" aria-label="Filter Date" value={date} onClick={(event) => {
            try { event.currentTarget.showPicker?.(); } catch { /* Keep native date input available when the browser cannot open its picker. */ }
          }} onChange={(event) => { setDate(event.target.value); setRequestedAccountPage(1); }} className="absolute inset-0 h-full w-full cursor-pointer opacity-0 [color-scheme:light]" />
        </div>
        <button type="button" onClick={() => { setSearch(''); setDepartmentId(''); setDate(''); setRequestedAccountPage(1); }} className="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-transparent px-3.5 text-xs font-semibold text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-purple-600 focus-visible:outline-2 focus-visible:outline-blue-500"><RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />Reset</button>
      </div>
      {error && <div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">Gagal memuat Log Activity: {error} <button type="button" onClick={() => setReload((value) => value + 1)} className="cursor-pointer underline">Coba lagi</button></div>}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table aria-label="Daftar akun Log Activity" className="w-full min-w-[850px] table-fixed border-collapse text-left text-xs text-slate-800 [&_td]:px-4 [&_td]:py-4 [&_th]:px-4 [&_th]:py-3">
          <colgroup><col className="w-[25%]" /><col className="w-[22%]" /><col className="w-[28%]" /><col className="w-[16%]" /><col className="w-[9%]" /></colgroup>
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-extrabold tracking-[0.5px] text-slate-500 [&_th]:font-extrabold">
            <tr><th scope="col">EMPLOYEE&apos;S NAME</th><th scope="col">DEPARTMENT</th><th scope="col">LAST ACTIVITY</th><th scope="col" aria-sort="descending">LAST DATE</th><th scope="col">STATUS</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={5} role="status">Memuat Log Activity...</td></tr> : rows.length === 0 ? <tr><td colSpan={5} className="text-slate-500">{error ? 'Data belum dapat ditampilkan.' : 'Tidak ada akun dengan aktivitas sesuai filter.'}</td></tr> : visibleAccounts.map((account) => <tr key={account.id} onClick={() => openAccount(account)} className="cursor-pointer border-b border-slate-100 last:border-b-0 hover:bg-slate-50 focus-within:bg-slate-50">
              <td><button type="button" aria-haspopup="dialog" aria-label={`Lihat riwayat ${account.name}`} onClick={(event) => { event.stopPropagation(); openAccount(account); }} className="flex w-full cursor-pointer items-center gap-2.5 rounded text-left font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"><span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-300 text-[11px] text-slate-700">{initials(account.name)}</span><span className="break-words">{account.name}</span></button></td>
              <td className="break-words font-semibold text-slate-700">{account.department}</td>
              <td className="whitespace-pre-wrap break-words">{displayActivityDescription(account.lastEvent.description)}</td>
              <td>{displayDateTime(account.lastEvent.createdAt)}</td>
              <td><Status online={account.online} isActive={account.isActive} /></td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {!loading && <footer className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <p role="status" className="text-[11px] text-slate-500">Menampilkan {rows.length ? accountOffset + 1 : 0}&ndash;{Math.min(accountOffset + ACCOUNT_PAGE_SIZE, rows.length)} dari {rows.length} akun</p>
        <HistoryPagination page={accountPage} totalPages={accountTotalPages} onChange={setRequestedAccountPage} />
      </footer>}

      <dialog ref={dialogRef} aria-label={selected ? `Detail akun ${selected.name}` : 'Detail akun'} onClose={() => setSelectedId(null)} onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close();
      }} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[1120px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-700/60">
        <button type="button" aria-label="Tutup detail akun" onClick={() => dialogRef.current?.close()} className="absolute right-2 top-2 z-20 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-500"><X aria-hidden="true" className="h-4 w-4" /></button>
        {selected && <div className="grid gap-6 p-6 md:grid-cols-[220px_minmax(0,1fr)]">
          <aside aria-label="Profil akun" className="min-w-0 text-xs">
            <div aria-hidden="true" className="mx-auto mb-5 flex h-28 w-28 items-center justify-center rounded-full bg-[#dbe3f0] text-5xl font-bold text-slate-900">{initials(selected.name)}</div>
            <dl className="space-y-4 [&_dt]:mb-1 [&_dt]:text-slate-500 [&_dd]:break-words [&_dd]:font-semibold">
              <div><dt>Nama</dt><dd>{selected.name}</dd></div>
              <div><dt>Departemen</dt><dd>{selected.department}</dd></div>
              <div><dt>Email</dt><dd>{selected.email}</dd></div>
              <div><dt>Role</dt><dd>{selected.role}</dd></div>
            </dl>
            <section aria-label="Sesi terakhir" className="mt-5 rounded-xl border border-slate-200 bg-[#f1f4fa] p-3">
              <div className="mb-4 flex items-center justify-between gap-2"><h3 className="text-[11px] font-bold">SESI TERAKHIR</h3><Status online={selected.online} isActive={selected.isActive} /></div>
              <dl className="space-y-3 [&_dt]:mb-1 [&_dt]:text-slate-500 [&_dd]:font-semibold"><div><dt>Login</dt><dd>{displayDateTime(latestSession?.loginAt ?? null)}</dd></div><div><dt>Logout</dt><dd>{displayDateTime(latestSession?.logoutAt ?? null)}</dd></div></dl>
            </section>
          </aside>
          <section aria-label="Riwayat akun" className="flex h-[560px] min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200">
            <div className="flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-x-3 border-b border-slate-200 px-4">
              <div role="tablist" aria-label="Jenis riwayat" className="flex self-stretch">
                <button id="account-activity-tab" type="button" role="tab" aria-selected={tab === 'activity'} aria-controls="account-history-panel" onClick={() => changeTab('activity')} className={`cursor-pointer border-b-2 px-2 py-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-blue-500 ${tab === 'activity' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>Activity ({selected.activities.length})</button>
                <button id="account-login-tab" type="button" role="tab" aria-selected={tab === 'login'} aria-controls="account-history-panel" onClick={() => changeTab('login')} className={`cursor-pointer border-b-2 px-2 py-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-blue-500 ${tab === 'login' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>Login History ({selected.sessions.length})</button>
              </div>
              {date && <p role="status" className="my-2 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] text-slate-900">{matchCount} sesuai filter tanggal {date}</p>}
            </div>
            <div id="account-history-panel" role="tabpanel" aria-labelledby={tab === 'activity' ? 'account-activity-tab' : 'account-login-tab'} tabIndex={0} className="min-h-0 flex-1 overflow-auto focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-blue-500">
              {tab === 'activity' ? <table aria-label="Riwayat aktivitas akun" className="w-full min-w-[580px] table-fixed border-collapse text-left text-xs [&_td]:px-4 [&_td]:py-4 [&_th]:px-4 [&_th]:py-3">
                <colgroup><col className="w-[19%]" /><col className="w-[15%]" /><col className="w-[40%]" /><col className="w-[26%]" /></colgroup>
                <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] tracking-wide text-slate-600"><tr className="border-b border-slate-200"><th scope="col">IP ADDRESS</th><th scope="col">BROWSER</th><th scope="col">DESCRIPTION</th><th scope="col">DATE TIME</th></tr></thead>
                <tbody>{activityPage.rows.length ? activityPage.rows.map((activity) => {
                  const highlighted = Boolean(date && jakartaDay(activity.created_at) === date);
                  return <tr key={activity.id} className={`border-b border-slate-200 ${highlighted ? 'bg-amber-100' : 'bg-white'}`}><td className={`break-words ${highlighted ? 'shadow-[inset_4px_0_0_#2563eb]' : ''}`}>{activity.ip_address || '-'}</td><td className="break-words">{activity.browser}</td><td className="whitespace-pre-wrap break-words">{displayActivityDescription(activity.description)}</td><td>{displayDateTime(activity.created_at)}</td></tr>;
                }) : <tr><td colSpan={4} className="text-slate-500">Belum ada aktivitas.</td></tr>}</tbody>
              </table> : <table aria-label="Riwayat login akun" className="w-full min-w-[420px] table-fixed border-collapse text-left text-xs [&_td]:px-4 [&_td]:py-4 [&_th]:px-4 [&_th]:py-3">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] tracking-wide text-slate-600"><tr className="border-b border-slate-200"><th scope="col">LOGIN</th><th scope="col">LOGOUT</th></tr></thead>
                <tbody>{loginPage.rows.length ? loginPage.rows.map((session) => {
                  const highlighted = sessionMatchesDate(session, date);
                  return <tr key={session.id} className={`border-b border-slate-200 ${highlighted ? 'bg-amber-100' : 'bg-white'}`}><td className={highlighted ? 'shadow-[inset_4px_0_0_#2563eb]' : ''}>{displayDateTime(session.loginAt)}</td><td>{displayDateTime(session.logoutAt)}</td></tr>;
                }) : <tr><td colSpan={2} className="text-slate-500">Belum ada riwayat login.</td></tr>}</tbody>
              </table>}
            </div>
            <footer className="sticky bottom-0 z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
              <p role="status" className="text-[11px] text-slate-500">Menampilkan {currentPage.start}&ndash;{currentPage.end} dari {total} {tab === 'activity' ? 'aktivitas' : 'sesi login'}</p>
              <HistoryPagination page={currentPage.page} totalPages={currentPage.totalPages} onChange={setRequestedPage} />
            </footer>
          </section>
        </div>}
      </dialog>
    </div>
  );
}
