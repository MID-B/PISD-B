"use client";

import { useEffect, useRef, useState } from 'react';
import { Search, X, CalendarDays, RotateCcw } from 'lucide-react';
import Pagination from '@/components/pagination';
import { supabase } from '@/lib/supabaseClient';
import { getActivities, getActivityById, matchesActivity, type ActivityLog as ActivityLogRow } from '@/query/activity';

const DEPARTMENT_OPTIONS = [
  "Human Resources",
  "Information Technology",
  "Finance, Accounting & Tax",
  "Commercial & Customer Success",
];

const DEPARTMENT_UUID_MAP: Record<string, string> = {
  "Human Resources": "6e116b24-22fe-4b8f-be7e-2159b99022bd",
  "Information Technology": "8113ab6f-d5cc-4c94-bbf6-e08047931fab",
  "Finance, Accounting & Tax": "1653db5f-2b64-418f-b28b-68cb7b9dae8e",
  "Commercial & Customer Success": "97ac5d35-5da2-4f5d-9d36-78500f403cc7",
};

export default function LogActivity({ active }: { active: boolean }) {
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [activityLogs, setActivityLogs] = useState<ActivityLogRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState('');
  const [activityReload, setActivityReload] = useState(0);
  const [activityPage, setActivityPage] = useState(1);
  const activityPageSize = 10;
  const [activityTotal, setActivityTotal] = useState(0);
  const [activitySearch, setActivitySearch] = useState('');
  const [activityStartDate, setActivityStartDate] = useState('');
  const [activityEndDate, setActivityEndDate] = useState('');
  const [draftStartDate, setDraftStartDate] = useState('');
  const [draftEndDate, setDraftEndDate] = useState('');
  const dateRangeDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!active) return;
    let disposed = false;
    let revision = 0;
    const filters = {
      page: activityPage, pageSize: activityPageSize, search: activitySearch,
      startDate: activityStartDate, endDate: activityEndDate,
      ascending: Boolean(activityStartDate),
      departmentId: selectedDepartment === 'All' ? undefined : DEPARTMENT_UUID_MAP[selectedDepartment],
    };
    async function loadActivity(showLoading = true) {
      const request = ++revision;
      if (showLoading) { setActivityLoading(true); setActivityError(''); }
      try {
        const result = await getActivities(filters);
        if (disposed || request !== revision) return;
        const lastPage = Math.max(1, Math.ceil(result.total / activityPageSize));
        if (activityPage > lastPage) { setActivityPage(lastPage); return; }
        setActivityLogs(result.rows);
        setActivityTotal(result.total);
        setActivityError('');
      } catch (error) {
        if (!disposed && request === revision) {
          setActivityError(`Gagal membaca b1_activity: ${error instanceof Error ? error.message : 'Koneksi database gagal.'}`);
        }
      } finally {
        if (!disposed && request === revision) setActivityLoading(false);
      }
    }
    const channel = supabase.channel('smki-log-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'b1_activity' }, (payload) => {
        void (async () => {
          try {
            const activity = await getActivityById(String(payload.new.id));
            if (disposed || !activity || !matchesActivity(activity, filters)) return;
            await loadActivity(false);
          } catch { console.error('Gagal memperbarui Log Activity melalui Realtime.'); }
        })();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && !disposed) void loadActivity(false);
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.error('Koneksi Realtime Log Activity gagal.');
      });
    void loadActivity();
    return () => { disposed = true; void supabase.removeChannel(channel); };
  }, [active, activityReload, activityPage, activityPageSize, activitySearch, activityStartDate, activityEndDate, selectedDepartment]);

  const activityTotalPages = Math.max(1, Math.ceil(activityTotal / activityPageSize));
  const filterDateLabel = (date: string) => date.split('-').reverse().join('/');
  const activityRangeLabel = activityStartDate && activityEndDate
    ? `${filterDateLabel(activityStartDate)} - ${filterDateLabel(activityEndDate)}`
    : activityStartDate ? `Mulai ${filterDateLabel(activityStartDate)}`
      : activityEndDate ? `Sampai ${filterDateLabel(activityEndDate)}` : '';

  return (
    <div hidden={!active} style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "20px 24px", boxSizing: "border-box" }}>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs mb-5 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <div className="relative flex-1 min-w-[240px]">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input type="search" aria-label="Search Log Activity" placeholder="Search by Employee's Name or Email" value={activitySearch} onChange={(event) => { setActivitySearch(event.target.value); setActivityPage(1); }} className="w-full h-10 pl-10 pr-10 bg-[#f1f3fe] text-xs font-medium text-slate-700 placeholder-slate-400 rounded-xl border border-transparent focus:border-purple-300 focus:bg-white focus:outline-none transition-all [&::-webkit-search-cancel-button]:hidden" />
                  {activitySearch && <button type="button" aria-label="Clear search" onClick={() => { setActivitySearch(''); setActivityPage(1); }} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"><X aria-hidden="true" className="h-3.5 w-3.5" /></button>}
                </div>
                <select aria-label="Filter Log Activity by department" value={selectedDepartment} onChange={(event) => { setSelectedDepartment(event.target.value); setActivityPage(1); }} className="h-10 w-full sm:w-56 px-3.5 bg-white text-xs font-medium text-slate-700 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-400 cursor-pointer shadow-2xs">
                  <option value="All">All Department</option>
                  {DEPARTMENT_OPTIONS.map((department) => <option key={department} value={department}>{department}</option>)}
                </select>
                <button type="button" aria-haspopup="dialog" onClick={() => { setDraftStartDate(activityStartDate); setDraftEndDate(activityEndDate); dateRangeDialogRef.current?.showModal(); }} className={`flex h-10 w-full sm:w-56 items-center justify-between gap-2 rounded-xl border bg-white px-3.5 text-xs font-medium cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-purple-400 ${activityRangeLabel ? 'border-purple-300 text-slate-700' : 'border-slate-200 text-slate-700'}`}>
                  <span className="truncate">{activityRangeLabel || 'Date'}</span>
                  <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" />
                </button>
                <button type="button" onClick={() => { setActivitySearch(''); setSelectedDepartment('All'); setActivityStartDate(''); setActivityEndDate(''); setDraftStartDate(''); setDraftEndDate(''); setActivityPage(1); }} className="h-10 px-3.5 flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-purple-600 bg-transparent hover:bg-slate-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-200">
                  <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />Reset
                </button>
                <dialog
                  ref={dateRangeDialogRef}
                  aria-labelledby="activity-date-range-title"
                  className="fixed inset-0 m-auto w-[480px] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-6 text-[#555555] shadow-xl backdrop:bg-slate-900/30"
                  onClick={(event) => {
                    if (event.target !== event.currentTarget) return;
                    const rect = event.currentTarget.getBoundingClientRect();
                    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close();
                  }}
                >
                  <form onSubmit={(event) => {
                    event.preventDefault();
                    if (draftStartDate && draftEndDate && draftStartDate > draftEndDate) return;
                    setActivityStartDate(draftStartDate); setActivityEndDate(draftEndDate); setActivityPage(1);
                    dateRangeDialogRef.current?.close();
                  }}>
                    <h2 id="activity-date-range-title" className="text-[28px] font-bold leading-tight text-black">Filter</h2>
                    <p className="mt-1.5 text-sm text-[#707070]">Pilih rentang tanggal aktivitas.</p>
                    <div className="mt-5">
                      <div role="group" aria-label="Rentang tanggal" className="grid grid-cols-1 gap-4 min-[440px]:grid-cols-2">
                        <label className="block min-w-0">
                          <span className="mb-2 block text-sm font-medium text-slate-700">Tanggal mulai</span>
                          <input type="date" value={draftStartDate} onChange={(event) => {
                            const start = event.target.value;
                            setDraftStartDate(start);
                            if (start && draftEndDate && start > draftEndDate) setDraftEndDate('');
                          }} className="h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 [color-scheme:light]" />
                        </label>
                        <label className="block min-w-0">
                          <span className="mb-2 block text-sm font-medium text-slate-700">Tanggal akhir</span>
                          <input type="date" value={draftEndDate} min={draftStartDate || undefined} onChange={(event) => setDraftEndDate(event.target.value)} className="h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 [color-scheme:light]" />
                        </label>
                      </div>
                    </div>
                    {draftStartDate && draftEndDate && draftStartDate > draftEndDate && <p role="alert" className="mt-2 text-xs text-red-600">Tanggal akhir harus sama atau setelah tanggal mulai.</p>}
                    <div className="mt-8 grid grid-cols-[1fr_1.4fr] gap-4">
                      <button type="button" onClick={() => { setActivityStartDate(''); setActivityEndDate(''); setDraftStartDate(''); setDraftEndDate(''); setActivityPage(1); }} className="h-12 cursor-pointer rounded-lg border border-[#B8B8B8] bg-white text-base font-semibold text-[#555555] hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-500">Reset</button>
                      <button type="submit" disabled={Boolean(draftStartDate && draftEndDate && draftStartDate > draftEndDate)} className="h-12 cursor-pointer rounded-lg bg-[#386BF6] text-base font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-40">Apply</button>
                    </div>
                  </form>
                </dialog>
              </div>
              <div className="w-full overflow-x-auto rounded-md border border-slate-200 bg-white">
              <table aria-label="Log Activity SMKI" className="w-full min-w-[1200px] table-fixed border-collapse text-left [&_th]:px-4 [&_th]:py-2.5 [&_th]:align-middle [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_td]:[overflow-wrap:anywhere]">
              <colgroup>
                <col style={{ width: "14%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "17%" }} />
                <col style={{ width: "10%" }} />
              </colgroup>
              <thead style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: "11px", fontWeight: 800, letterSpacing: "0.5px", color: "#64748b", background: "#f8fafc" }} className="[&_th]:font-extrabold [&_th]:whitespace-nowrap">
              <tr className="border-b border-slate-200">
                <th scope="col">EMPLOYEE&apos;S NAME</th>
                <th scope="col">E-MAIL</th>
                <th scope="col">DEPARTMENT</th>
                <th scope="col">ROLE</th>
                <th scope="col">IP ADDRESS</th>
                <th scope="col">BROWSER</th>
                <th scope="col">DESCRIPTION</th>
                <th scope="col" aria-sort={activityStartDate ? 'ascending' : 'descending'} className="whitespace-nowrap">DATE TIME</th>
              </tr>
              </thead>
              <tbody style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px", fontWeight: 400, color: "#1e293b" }} className="bg-white">
              {activityLoading ? (
                <tr><td colSpan={8}><div role="status" className="text-slate-500">Memuat Log Activity...</div></td></tr>
              ) : activityError ? (
                <tr><td colSpan={8}><div role="alert" className="text-red-600">
                  <p>{activityError}</p>
                  <button type="button" onClick={() => setActivityReload((value) => value + 1)} className="mt-2 cursor-pointer text-blue-600">Coba lagi</button>
                </div></td></tr>
              ) : activityLogs.length > 0 ? (
                activityLogs.map((activity) => {
                  const timestamp = new Date(activity.createdAt);
                  return (
                    <tr key={activity.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                      <td className="font-bold"><div className="flex items-center gap-2.5 min-w-0">
                        <span aria-hidden="true" className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-slate-300 text-[11px] font-bold text-slate-700">{activity.name.trim().charAt(0).toUpperCase() || '?'}</span>
                        <span className="min-w-0">{activity.name}</span>
                      </div></td>
                      <td className="text-slate-500">{activity.email}</td>
                      <td className="font-semibold text-slate-700">{activity.department}</td>
                      <td className="font-semibold text-slate-700">{activity.role}</td>
                      <td>{activity.ipAddress}</td>
                      <td>{activity.userAgent}</td>
                      <td className="whitespace-pre-line">{activity.description}</td>
                      <td><div style={{ display: "flex", flexDirection: "column", whiteSpace: "nowrap" }}>
                        <span>{activity.createdAt ? timestamp.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Jakarta" }) : "-"}</span>
                        <span>{activity.createdAt ? timestamp.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Jakarta" }) : "-"}</span>
                      </div></td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={8} className="text-slate-500">
                  Tidak ada aktivitas yang sesuai dengan pencarian dan filter.
                </td></tr>
              )}
              </tbody>
            </table>
            </div>
            {!activityLoading && !activityError && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-slate-500">
                <p role="status">Showing <b>{activityTotal ? (activityPage - 1) * activityPageSize + 1 : 0}-{Math.min(activityPage * activityPageSize, activityTotal)}</b> of <b>{activityTotal}</b> activities</p>
                <div className="[&_svg]:hidden [&_button]:rounded-[10px] [&_button]:text-[13px] [&_button[aria-current=page]]:shadow-none"><Pagination label="Pagination Log Activity" page={activityPage} totalPages={activityTotalPages} onPageChange={setActivityPage} /></div>
              </div>
            )}
          </div>
  );
}
