'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ListFilter, ChevronDown, RotateCcw, X } from 'lucide-react';
import DashboardShell from '../dashboard-shell';
import { supabase } from '@/lib/supabaseClient';

type ViewIssue = {
  source: string | null;
  issue_code: string | null;
  issue: string | null;
  description: string | null;
  note: string | null;
  date: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  pic_id: string | null;
  pic_name: string | null;
};

const statuses = [
  { name: 'IN PROGRESS', label: 'In Progress', color: '#3981FF', background: '#EFF6FF', cardText: '#1E40AF', description: 'Issue sedang dikerjakan' },
  { name: 'IN REVIEW', label: 'In Review', color: '#06B6D4', background: '#ECFEFF', cardText: '#155E75', description: 'Issue sedang ditinjau' },
  { name: 'OPEN', label: 'Open', color: '#F59E0B', background: '#FFFBEB', cardText: '#92400E', description: 'Issue baru yang perlu ditindaklanjuti' },
  { name: 'PENDING', label: 'Pending', color: '#9560FF', background: '#F5F0FF', cardText: '#6B21A8', description: 'Issue menunggu tindak lanjut' },
  { name: 'DONE', label: 'Done', color: '#10B981', background: '#ECFDF5', cardText: '#065F46', description: 'Issue telah selesai ditangani' },
  { name: 'TO DO', label: 'To Do', color: '#77808F', background: '#F3F4F6', cardText: '#374151', description: 'Issue yang belum dikerjakan' },
] as const;

const priorities = ['High', 'Medium', 'Low'];

const issueDateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta',
});

function normalizeStatus(status: string | null) {
  return status?.trim().toUpperCase().replace(/_/g, ' ') ?? '';
}

function getStatusStyle(status: string | null) {
  const normalized = normalizeStatus(status);
  return statuses.find((item) => item.name === normalized) ?? {
    name: normalized || 'UNKNOWN',
    label: status || 'Unknown',
    color: '#77808F',
    background: '#F3F4F6',
    cardText: '#374151',
    description: 'Status issue',
  };
}

function formatDate(value: string | null) {
  if (!value) return '-';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00+07:00`)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? value : issueDateFormatter.format(date);
}

export default function IssueBoardPage() {
  const [issues, setIssues] = useState<ViewIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<ViewIssue | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let active = true;

    async function loadIssues() {
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from('b1_vw_universal_issue')
        .select('source, issue_code, issue, description, note, date, status, priority, due_date, pic_id, pic_name')
        .order('date', { ascending: false });

      if (!active) return;
      if (queryError) {
        setError(queryError.message);
        setIssues([]);
      } else {
        setIssues((data ?? []) as ViewIssue[]);
      }
      setLoading(false);
    }

    void loadIssues();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (selectedIssue && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [selectedIssue]);

  const searchQuery = search.trim().toLowerCase();
  const rows = useMemo(() => issues.filter((issue) => {
    const matchesStatus = !selectedStatus || normalizeStatus(issue.status) === selectedStatus;
    const matchesPriority = !selectedPriority
      || (selectedPriority === 'unset' ? !issue.priority : issue.priority?.toLowerCase() === selectedPriority.toLowerCase());
    const matchesSearch = !searchQuery || [
      issue.issue_code, issue.source, issue.issue, issue.pic_id, issue.pic_name,
      issue.date, issue.status, issue.priority, issue.description, issue.note,
    ].some((value) => value?.toLowerCase().includes(searchQuery));
    return matchesStatus && matchesPriority && matchesSearch;
  }), [issues, searchQuery, selectedPriority, selectedStatus]);

  const additionalStatuses = Array.from(new Set(issues
    .map((issue) => issue.status?.trim())
    .filter((status): status is string => Boolean(status))
    .filter((status) => !statuses.some((item) => item.name === normalizeStatus(status)))));

  const additionalPriorities = Array.from(new Set(issues
    .map((issue) => issue.priority?.trim())
    .filter((priority): priority is string => Boolean(priority))
    .filter((priority) => !priorities.some((item) => item.toLowerCase() === priority.toLowerCase()))));

  return (
    <DashboardShell activePage="issue-board">
      <section aria-labelledby="issue-page-title" className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" aria-label="Ringkasan status issue">
          {statuses.map(({ name, label, color, background, cardText, description }) => (
            <div key={name} style={{ background: `linear-gradient(135deg, ${background}, ${color}18)`, borderColor: `${color}40`, color: cardText }} className="flex flex-col justify-between rounded-xl border p-4 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wide">{label}</span>
              <div className="mt-2">
                <span className="text-xl font-extrabold tabular-nums sm:text-2xl">
                  {issues.filter((issue) => normalizeStatus(issue.status) === name).length} Issue
                </span>
                <p className="mt-0.5 text-[10px] font-medium">{description}</p>
              </div>
            </div>
          ))}
        </div>

        <div>
          <h2 id="issue-page-title" className="text-2xl font-bold uppercase leading-tight tracking-tight text-black">ISSUE BOARD</h2>
          <p className="mt-1 text-xs text-slate-500">Track and Trace all jobs posted at PT Andima Transportindo.</p>
          <div className="mt-3 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input type="search" aria-label="Cari issue berdasarkan kode, departemen, issue, PIC, source, priority, atau status" placeholder="Cari issue, ticket code, PIC..." value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-[#F5F5FA] pl-9 pr-3 text-xs text-slate-700 shadow-sm placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
              <div className="relative sm:w-48">
                <ListFilter aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <select aria-label="Filter status issue" value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)} className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-[#F5F5FA] pl-9 pr-8 text-xs font-medium text-slate-600 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">
                  <option value="">Semua Status</option>
                  {statuses.map(({ name, label }) => <option key={name} value={name}>{label}</option>)}
                  {additionalStatuses.map((status) => <option key={status} value={normalizeStatus(status)}>{status}</option>)}
                </select>
                <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              </div>
              <div className="relative sm:w-44">
                <select aria-label="Filter priority issue" value={selectedPriority} onChange={(event) => setSelectedPriority(event.target.value)} className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-[#F5F5FA] pl-3 pr-8 text-xs font-medium text-slate-600 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">
                  <option value="">Semua Priority</option>
                  {priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                  <option value="unset">Belum ditentukan</option>
                  {additionalPriorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                </select>
                <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              </div>
              <button type="button" disabled={!search && !selectedStatus && !selectedPriority} onClick={() => { setSearch(''); setSelectedStatus(''); setSelectedPriority(''); }} className="col-span-2 inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-[#F5F5FA] px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-40">
                <RotateCcw aria-hidden="true" className="h-3 w-3" />Reset Filter
              </button>
            </div>
          </div>
        </div>

        <section aria-label="Tabel issue" className="bg-white p-4 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] table-fixed border-collapse text-left">
              <colgroup>
                <col style={{ width: '11%' }} /><col style={{ width: '14%' }} />
                <col style={{ width: '21%' }} /><col style={{ width: '13%' }} />
                <col style={{ width: '10%' }} /><col style={{ width: '9%' }} />
                <col style={{ width: '10%' }} /><col style={{ width: '12%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-100 bg-violet-50/70 text-[10px] uppercase tracking-wider text-slate-400">
                  {['Issue Code', 'Departemen', 'Issue', 'PIC', 'Date', 'Priority', 'Due Date', 'Status'].map((heading) => <th key={heading} scope="col" className="px-3 py-3 font-semibold">{heading}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {loading ? (
                  <tr><td colSpan={8} className="p-4 text-slate-500">Memuat issue...</td></tr>
                ) : error ? (
                  <tr><td colSpan={8} className="p-4 text-red-600">Gagal memuat issue: {error}</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={8} className="p-4 text-slate-500">Tidak ada issue yang sesuai dengan {searchQuery ? 'pencarian dan filter' : 'filter'}.</td></tr>
                ) : rows.map((issue, index) => {
                  const statusStyle = getStatusStyle(issue.status);
                  return (
                    <tr key={`${issue.source}-${issue.issue_code}-${index}`} onClick={() => setSelectedIssue(issue)} className="cursor-pointer transition-colors hover:bg-slate-50/50 focus-within:bg-slate-50/50">
                      <th scope="row" className="whitespace-nowrap px-3 py-4 font-medium">
                        <button type="button" aria-haspopup="dialog" aria-label={`Lihat detail ${issue.issue_code || 'issue'}`} onClick={(event) => { event.stopPropagation(); setSelectedIssue(issue); }} className="cursor-pointer rounded text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500">{issue.issue_code || '-'}</button>
                      </th>
                      <td className="px-3 py-4">{issue.source || '-'}</td>
                      <td className="px-3 py-4"><span className="block break-words" title={issue.issue ?? undefined}>{issue.issue || '-'}</span></td>
                      <td className="px-3 py-4"><span className="inline-flex items-center gap-1.5 whitespace-nowrap"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[6px] font-semibold" style={{ color: statusStyle.color, backgroundColor: statusStyle.background }}>{(issue.source || '?').slice(0, 4)}</span>{issue.pic_name || issue.pic_id || '-'}</span></td>
                      <td className="whitespace-nowrap px-3 py-4">{formatDate(issue.date)}</td>
                      <td className="px-3 py-4">{issue.priority ? <span className="font-semibold">{issue.priority}</span> : <span className="text-slate-400">-</span>}</td>
                      <td className="whitespace-nowrap px-3 py-4">{formatDate(issue.due_date)}</td>
                      <td className="whitespace-nowrap px-3 py-4 font-semibold" style={{ color: statusStyle.color }}>{statusStyle.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p role="status" className="border-t border-slate-100 bg-white px-3 py-3 text-xs text-slate-500">Menampilkan {loading ? '...' : rows.length} dari {issues.length} issue.</p>
        </section>
      </section>

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
    </DashboardShell>
  );
}
