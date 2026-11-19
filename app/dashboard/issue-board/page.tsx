"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, CalendarDays, Search, RotateCcw, Table2, X } from 'lucide-react';
import Pagination from '@/components/pagination';
import DashboardShell from '../dashboard-shell';
import { fetchUniversalIssues } from './issue-data';
import { DepartmentChart, DueDateChart, PriorityCharts } from './board-charts';
import {
  STATUSES, PRIORITIES, PAGE_SIZE, boardDateError, currentIssueDay, filterBoard, searchBoard, sortBoard,
  sourceKey, sourceColor, normalizeStatus, priorityKey, priorityStyle, issueDay,
  formatIssueDate as formatDate, statusStyle as getStatusStyle, summarizeBoard,
  type ViewIssue, type BoardFilters, type BoardSort, type SortColumn,
} from './board-model';

const initialFilters: BoardFilters = { source: '', status: '', priority: '', start: '', end: '' };
const initialSort: BoardSort = { column: 'date', ascending: false };
const panelClass = 'flex min-w-0 flex-col rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs';
const inputClass = 'h-9 cursor-pointer rounded-lg border border-slate-200 bg-[#F5F5FA] px-3 text-xs font-medium text-slate-700 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500';
const columns: { key: SortColumn; label: string }[] = [
  { key: 'reference_code', label: 'Reference Code' }, { key: 'source', label: 'Department / Source' },
  { key: 'issue', label: 'Issue' }, { key: 'pic_name', label: 'PIC' },
  { key: 'date', label: 'Date & Time Received' }, { key: 'priority', label: 'Priority' },
  { key: 'due_date', label: 'Due Date' }, { key: 'status', label: 'Status' },
];

function IssueDateInput({ value, label, error, onChange }: { value: string; label: string; error: string; onChange: (value: string) => void }) {
  return <div title={label} className={`relative flex h-10 shrink-0 items-center rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 shadow-2xs focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100 ${value ? 'w-40 justify-between px-3.5' : 'w-10 justify-center'}`}>
    {value && <span aria-hidden="true">{value.split('-').reverse().join('/')}</span>}
    <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0" />
    <input type="date" aria-label={label} aria-invalid={Boolean(error)} aria-describedby={error ? 'issue-date-error' : undefined} value={value} onClick={(event) => {
      try { event.currentTarget.showPicker?.(); } catch { /* Retain native date input support in browsers without a picker. */ }
    }} onChange={(event) => onChange(event.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0 [color-scheme:light]" />
  </div>;
}

export default function IssueBoardPage() {
  const [issues, setIssues] = useState<ViewIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [filters, setFilters] = useState<BoardFilters>(initialFilters);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<BoardSort>(initialSort);
  const [requestedPage, setRequestedPage] = useState(1);
  const [showTable, setShowTable] = useState(false);
  const [today, setToday] = useState(currentIssueDay);
  const [selectedIssue, setSelectedIssue] = useState<ViewIssue | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const tableRef = useRef<HTMLElement>(null);
  const openTableRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadIssues() {
      setLoading(true); setError('');
      try {
        const result = await fetchUniversalIssues(controller.signal);
        if (result.error) throw result.error;
        if (!controller.signal.aborted) setIssues(result.data ?? []);
      } catch (failure) {
        if (!controller.signal.aborted) {
          setIssues([]);
          setError(failure && typeof failure === 'object' && 'message' in failure ? String(failure.message) : 'Koneksi database gagal.');
        }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void loadIssues();
    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    const interval = window.setInterval(() => setToday(currentIssueDay()), 60_000);
    const refreshDay = () => setToday(currentIssueDay());
    window.addEventListener('focus', refreshDay);
    return () => { window.clearInterval(interval); window.removeEventListener('focus', refreshDay); };
  }, []);
  useEffect(() => {
    if (selectedIssue && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [selectedIssue]);
  useEffect(() => {
    if (showTable) tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [showTable]);

  const dateError = boardDateError(filters);
  const scope = useMemo(() => filterBoard(issues, filters), [issues, filters]);
  const summary = useMemo(() => summarizeBoard(scope, today), [scope, today]);
  const tableRows = useMemo(() => sortBoard(searchBoard(scope, search), sort), [scope, search, sort]);
  const totalPages = Math.max(1, Math.ceil(tableRows.length / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * PAGE_SIZE;
  const visibleRows = tableRows.slice(offset, offset + PAGE_SIZE);
  const sourceOptions = Array.from(new Set(['CCR', 'CRM', 'HRMS', ...issues.map((issue) => sourceKey(issue.source))]));
  const additionalStatuses = Array.from(new Set(issues.map((issue) => normalizeStatus(issue.status)).filter((status) => status && !STATUSES.some((item) => item.name === status))));
  const additionalPriorities = Array.from(new Set(issues.map((issue) => priorityKey(issue.priority)).filter((priority) => !PRIORITIES.some((item) => item.key === priority))));
  const ready = !loading && !error && !dateError;
  const chartMessage = loading ? 'Memuat issue...' : error ? 'Data belum dapat ditampilkan.' : '';
  const count = (value: number) => loading ? '...' : !ready ? '-' : value.toLocaleString('id-ID');
  const share = (value: number) => summary.total ? Math.round(value / summary.total * 100) : 0;
  const maxAging = Math.max(1, ...summary.aging.map((bucket) => bucket.count));

  function changeFilter(key: keyof BoardFilters, value: string) {
    setFilters((previous) => ({ ...previous, [key]: value })); setRequestedPage(1);
  }
  function resetFilters() { setFilters(initialFilters); setSearch(''); setSort(initialSort); setRequestedPage(1); }
  function openTable() {
    if (showTable) tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else setShowTable(true);
  }
  function handleSort(column: SortColumn) {
    setSort((previous) => ({ column, ascending: previous.column === column ? !previous.ascending : true }));
    setRequestedPage(1);
  }

  return <DashboardShell activePage="issue-board">
    <div className="space-y-4">
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">Gagal memuat issue: {error} <button type="button" onClick={() => setReload((value) => value + 1)} className="cursor-pointer underline">Coba lagi</button></div>}
      <div aria-label="Issue Board overview" className="grid gap-2.5 lg:min-h-[calc(100dvh-104px)] lg:grid-rows-[auto_auto_minmax(190px,1fr)_auto]">
        <section aria-label="Ringkasan status issue" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
          <div className="flex flex-col justify-between rounded-xl border border-blue-600 bg-blue-600 p-2.5 text-white shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wide">Total Issues</span>
            <strong className="my-0.5 text-xl font-extrabold tabular-nums">{count(summary.total)}</strong>
            <p className="text-[10px] text-blue-100">{count(summary.unresolved)} belum Done{ready && summary.unknownStatus ? ` (${summary.unknownStatus} status lain)` : ''}</p>
          </div>
          {summary.statuses.map((status) => <div key={status.name} style={{ background: `linear-gradient(135deg, ${status.background}, ${status.color}18)`, borderColor: `${status.color}40`, color: status.cardText }} className="flex flex-col justify-between rounded-xl border p-2.5 shadow-xs">
            <span className="flex items-center gap-1.5 text-[11px] font-bold"><span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: status.color }} />{status.label}</span>
            <strong className="my-0.5 text-xl font-extrabold tabular-nums">{count(status.count)}</strong>
            <p className="text-[10px]">{ready ? `${share(status.count)}% dari total` : '-'}</p>
          </div>)}
        </section>

        <section aria-label="Filter Issue Board" className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-xs">
          <div className="min-w-0"><p className="mb-1 text-[10px] font-semibold text-slate-500">Department / Source</p><div role="group" aria-label="Filter department atau source" className="flex flex-wrap gap-1 rounded-lg bg-[#F5F5FA] p-1">
            {['', ...sourceOptions].map((source) => <button key={source} type="button" aria-pressed={filters.source === source} onClick={() => changeFilter('source', source)} className={`h-7 cursor-pointer rounded-md px-2.5 text-[11px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${filters.source === source ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-200/60'}`}>{source || 'All'}</button>)}
          </div></div>
          <label className="text-[10px] font-semibold text-slate-500">Status<select aria-label="Filter status issue" value={filters.status} onChange={(event) => changeFilter('status', event.target.value)} className={`${inputClass} mt-1 block w-32`}><option value="">All Status</option>{STATUSES.map((status) => <option key={status.name} value={status.name}>{status.label}</option>)}{additionalStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          <label className="text-[10px] font-semibold text-slate-500">Priority<select aria-label="Filter priority issue" value={filters.priority} onChange={(event) => changeFilter('priority', event.target.value)} className={`${inputClass} mt-1 block w-32`}><option value="">All Priority</option>{PRIORITIES.map((priority) => <option key={priority.key} value={priority.key}>{priority.label}</option>)}{additionalPriorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label>
          <fieldset className="min-w-0"><legend className="mb-1 text-[10px] font-semibold text-slate-500">Date range (received)</legend><div className="flex flex-wrap items-center gap-1.5"><IssueDateInput label="Tanggal mulai issue diterima" value={filters.start} error={dateError} onChange={(value) => changeFilter('start', value)} /><span className="text-xs text-slate-400">to</span><IssueDateInput label="Tanggal akhir issue diterima" value={filters.end} error={dateError} onChange={(value) => changeFilter('end', value)} /></div></fieldset>
          <button type="button" onClick={resetFilters} className="ml-auto inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-[#F5F5FA] px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"><RotateCcw aria-hidden="true" className="h-3 w-3" />Reset filters</button>
          {dateError && <p id="issue-date-error" role="alert" className="w-full text-xs text-rose-600">{dateError}</p>}
        </section>

        <div className="grid min-h-0 gap-3 lg:grid-cols-2">
          <section aria-labelledby="department-title" className={panelClass}><div className="flex items-center justify-between gap-3"><h2 id="department-title" className="text-sm font-bold text-slate-800">Issues by Department</h2><button ref={openTableRef} type="button" aria-expanded={showTable} aria-controls="issue-table" onClick={openTable} className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[11px] font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"><Table2 aria-hidden="true" className="h-3 w-3" />Lihat tabel</button></div>{chartMessage ? <p role="status" className="py-8 text-xs text-slate-500">{chartMessage}</p> : <DepartmentChart segments={summary.sources} total={summary.total} />}</section>
          <section aria-labelledby="priority-title" className={panelClass}><h2 id="priority-title" className="text-sm font-bold text-slate-800">Issues by Priority</h2>{chartMessage ? <p role="status" className="py-8 text-xs text-slate-500">{chartMessage}</p> : <PriorityCharts segments={summary.priorities} total={summary.total} />}{ready && summary.otherPriorities > 0 && <p className="text-[10px] text-slate-500">{summary.otherPriorities} issue memakai priority lain di luar kategori di atas.</p>}</section>
        </div>

        <div className="grid min-h-0 gap-3 lg:grid-cols-2">
          <section aria-labelledby="aging-title" className={panelClass}><div className="flex flex-wrap items-baseline gap-2"><h2 id="aging-title" className="text-sm font-bold text-slate-800">Issue Aging</h2><p className="text-[10px] text-slate-500">{count(summary.overdue)} overdue &middot; hari sejak diterima</p></div>{chartMessage ? <p role="status" className="py-8 text-xs text-slate-500">{chartMessage}</p> : <ul className="flex flex-1 flex-col justify-evenly gap-3 py-3">{summary.aging.map((bucket) => <li key={bucket.label} className="grid grid-cols-[110px_minmax(0,1fr)_32px] items-center gap-3 text-[11px]"><span className="text-slate-600">{bucket.label}</span><div className="relative h-0.5 bg-slate-100"><div className="relative h-full" style={{ width: `${bucket.count / maxAging * 100}%`, backgroundColor: bucket.color }}>{bucket.count > 0 && <span aria-hidden="true" className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 translate-x-1/2 rounded-full border-2 border-white shadow-xs" style={{ backgroundColor: bucket.color }} />}</div></div><strong className="text-right text-slate-800">{bucket.count}</strong></li>)}</ul>}{ready && (summary.unknownReceived > 0 || summary.futureReceived > 0) && <p className="text-[10px] text-slate-500">{summary.unknownReceived} overdue tanpa tanggal diterima valid; {summary.futureReceived} overdue bertanggal diterima di masa depan.</p>}</section>
          <section aria-labelledby="due-title" className={panelClass}><div className="flex flex-wrap items-baseline gap-2"><h2 id="due-title" className="text-sm font-bold text-slate-800">Due Date Monitoring</h2><p className="text-[10px] text-slate-500">{count(summary.unresolved)} belum Done &middot; Due Soon: hari ini s.d. 2 hari lagi</p></div>{chartMessage ? <p role="status" className="py-8 text-xs text-slate-500">{chartMessage}</p> : <DueDateChart onTrack={summary.onTrack} dueSoon={summary.dueSoon} overdue={summary.overdue} percent={summary.onTrackPercent} />}{ready && summary.noDueDate > 0 && <p role="status" className="mt-2 text-center text-[10px] text-slate-500">{summary.noDueDate} issue tidak memiliki due date valid; tidak dimasukkan ke persentase.</p>}</section>
        </div>
      </div>

      {showTable && <section ref={tableRef} id="issue-table" aria-labelledby="issue-table-title" className="scroll-mt-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3"><h2 id="issue-table-title" className="text-lg font-bold uppercase tracking-wide text-slate-800">ISSUE BOARD</h2><button type="button" aria-label="Tutup tabel issue" title="Tutup tabel" onClick={() => { setShowTable(false); openTableRef.current?.focus({ preventScroll: true }); openTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }} className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"><X aria-hidden="true" className="h-4 w-4" /></button></div>
        <div className="flex flex-wrap items-center gap-3 px-4 py-3"><div className="relative w-full max-w-[380px]"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input type="search" aria-label="Cari issue berdasarkan ticket code atau judul issue" placeholder="Search Ticket Code / Issue..." value={search} onChange={(event) => { setSearch(event.target.value); setRequestedPage(1); }} className="h-9 w-full rounded-lg border border-slate-200 bg-[#F5F5FA] pl-9 pr-3 text-xs text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500" /></div></div>
        <div className="overflow-x-auto"><table aria-label="Daftar issue" className="w-full min-w-[1100px] table-fixed border-collapse text-left"><colgroup><col className="w-[11%]" /><col className="w-[13%]" /><col className="w-[21%]" /><col className="w-[12%]" /><col className="w-[14%]" /><col className="w-[9%]" /><col className="w-[10%]" /><col className="w-[10%]" /></colgroup><thead><tr className="border-y border-slate-100 bg-violet-50/70 text-[10px] uppercase tracking-wider text-slate-400">{columns.map((column) => {
          const sortable = column.key === 'date';
          const Icon = sort.ascending ? ArrowUp : ArrowDown;
          return <th key={column.key} scope="col" aria-sort={sortable ? sort.ascending ? 'ascending' : 'descending' : undefined} className="px-3 py-3 font-semibold">{sortable ? <button type="button" onClick={() => handleSort('date')} className="flex cursor-pointer items-center gap-1.5 rounded text-left uppercase tracking-wider hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">{column.label}<Icon aria-hidden="true" className="h-3 w-3 shrink-0" /></button> : column.label}</th>;
        })}</tr></thead><tbody className="divide-y divide-slate-100 text-xs text-slate-700">{loading || error || dateError || !visibleRows.length ? <tr><td colSpan={8} role="status" className="p-4 text-slate-500">{loading ? 'Memuat issue...' : error ? 'Data belum dapat ditampilkan.' : dateError || 'Tidak ada issue yang sesuai dengan pencarian dan filter.'}</td></tr> : visibleRows.map((issue, index) => {
          const status = getStatusStyle(issue.status), priority = priorityStyle(issue.priority);
          const due = issueDay(issue.due_date);
          const overdue = normalizeStatus(issue.status) !== 'DONE' && due && due < today;
          return <tr key={`${issue.source}:${issue.reference_code}:${offset + index}`} onClick={() => setSelectedIssue(issue)} className="cursor-pointer hover:bg-slate-50/50 focus-within:bg-slate-50/50"><th scope="row" className="px-3 py-3 font-semibold text-blue-700"><button type="button" aria-haspopup="dialog" aria-label={`Lihat detail ${issue.reference_code || 'issue'}`} onClick={(event) => { event.stopPropagation(); setSelectedIssue(issue); }} className="cursor-pointer rounded text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">{issue.reference_code || '-'}</button></th><td className="px-3 py-3"><span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: sourceColor(issue.source) }} />{issue.source || '-'}</span></td><td className="break-words px-3 py-3">{issue.issue || '-'}</td><td className="break-words px-3 py-3">{issue.pic_name || issue.pic_id || '-'}</td><td className="px-3 py-3">{formatDate(issue.date, true)}</td><td className="px-3 py-3"><span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-sm" style={{ backgroundColor: priority.color }} />{priority.label}</span></td><td className="px-3 py-3">{formatDate(issue.due_date)}{overdue && <span className="mt-1 block text-[10px] text-rose-500">Overdue</span>}</td><td className="px-3 py-3"><span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-semibold" style={{ color: status.color, backgroundColor: status.background, borderColor: `${status.color}40` }}><span aria-hidden="true" className="h-1 w-1 rounded-full bg-current" />{status.label}</span></td></tr>;
        })}</tbody></table></div>
        {ready && <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3"><p role="status" className="text-[11px] text-slate-500">Menampilkan {tableRows.length ? offset + 1 : 0}&ndash;{Math.min(offset + PAGE_SIZE, tableRows.length)} dari {tableRows.length} issue</p><Pagination compact label="Pagination Issue Board" page={page} totalPages={totalPages} onPageChange={setRequestedPage} /></footer>}
      </section>}
    </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="issue-dialog-title"
        onClose={() => setSelectedIssue(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[540px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-[#253044] shadow-2xl backdrop:bg-slate-950/40"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3">
          <h2 id="issue-dialog-title" className="text-base font-bold text-slate-900">Detail Issue</h2>
          <button
            type="button"
            aria-label="Tutup detail issue"
            onClick={() => dialogRef.current?.close()}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {selectedIssue && (
          <div className="px-5 pb-5 pt-4">
            <div className="border-b border-slate-100 pb-4">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">Issue</p>
              <p className="text-base font-semibold leading-relaxed text-slate-900">{selectedIssue.issue || '-'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-slate-100 py-4">
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">Sumber</p>
                <p className="text-xs font-semibold text-slate-700">{selectedIssue.source || '-'}</p>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">PIC</p>
                <p className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-[9px] text-white">E</span>
                  {selectedIssue.pic_name || selectedIssue.pic_id || '-'}
                </p>
              </div>
            </div>

            <div className="border-b border-slate-100 py-4">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">Deskripsi</p>
              <p className="text-xs leading-relaxed text-slate-600">{selectedIssue.description || '-'}</p>
            </div>

            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">Note</p>
              <p className="text-xs font-medium leading-relaxed text-slate-700">{selectedIssue.note || '-'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-slate-100 py-4">
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">Priority</p>
                <p className="text-xs font-semibold text-slate-700">{selectedIssue.priority || '-'}</p>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">Due Date</p>
                <p className="text-xs font-semibold text-slate-700">{formatDate(selectedIssue.due_date)}</p>
              </div>
            </div>

            <div className="py-4">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">Status</p>
              {(() => {
                const statusStyle = getStatusStyle(selectedIssue.status);
                return (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-medium"
                    style={{ color: statusStyle.color, borderColor: statusStyle.color }}
                  >
                    <span aria-hidden="true" className="h-1 w-1 rounded-full bg-current" />
                    {statusStyle.label}
                  </span>
                );
              })()}
            </div>

            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="w-full cursor-pointer rounded-md bg-[#0752DF] py-2.5 text-xs font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Tutup
            </button>
          </div>
        )}
      </dialog>
    </DashboardShell>;
}
