'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, ListFilter, ChevronDown, RotateCcw, X } from 'lucide-react';
import DashboardShell from '../dashboard-shell';
import { issues, issueDateFormatter, type Issue, type IssueStatus, type IssuePriority } from './issue-data';

const statuses = [
  { name: 'In Progress', color: '#3981FF', background: '#EFF6FF', cardText: '#1E40AF', description: 'Issue sedang dikerjakan' },
  { name: 'In Review', color: '#06B6D4', background: '#ECFEFF', cardText: '#155E75', description: 'Issue sedang ditinjau' },
  { name: 'Open', color: '#F59E0B', background: '#FFFBEB', cardText: '#92400E', description: 'Issue baru yang perlu ditindaklanjuti' },
  { name: 'Pending', color: '#9560FF', background: '#F5F0FF', cardText: '#6B21A8', description: 'Issue menunggu tindak lanjut' },
  { name: 'Done', color: '#10B981', background: '#ECFDF5', cardText: '#065F46', description: 'Issue telah selesai ditangani' },
  { name: 'To Do', color: '#77808F', background: '#F3F4F6', cardText: '#374151', description: 'Issue yang belum dikerjakan' },
] as const;

const dueDateLabel = (value: string | null) => value
  ? issueDateFormatter.format(new Date(`${value}T00:00:00+07:00`)) : '-';

export default function IssueBoardPage() {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<IssueStatus | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<IssuePriority | 'unset' | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const selectedStyle = statuses.find((status) => status.name === selectedIssue?.status);

  useEffect(() => {
    if (selectedIssue && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [selectedIssue]);

  const searchQuery = search.trim().toLowerCase();
  const rows = issues.filter((issue) => (!selectedStatus || issue.status === selectedStatus)
    && (!selectedPriority || (selectedPriority === 'unset' ? issue.priority === null : issue.priority === selectedPriority))
    && (!searchQuery || [issue.ticket_code, issue.reporter_department, issue.title, issue.employee_id, issue.source, issue.priority, issue.status]
      .some((value) => value?.toLowerCase().includes(searchQuery))));

  return (
    <DashboardShell activePage="issue-board">
      <section aria-labelledby="issue-page-title" className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3" aria-label="Ringkasan status issue">
          {statuses.map(({ name, color, background, cardText, description }) => (
            <div key={name}
              style={{ background: `linear-gradient(135deg, ${background}, ${color}18)`, borderColor: `${color}40`, color: cardText }}
              className="p-4 rounded-xl border shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wide">{name}</span>
              <div className="mt-2">
                <span className="text-xl sm:text-2xl font-extrabold tabular-nums">{issues.filter((issue) => issue.status === name).length} Issue</span>
                <p className="text-[10px] font-medium mt-0.5">{description}</p>
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
              <input
                type="search"
                aria-label="Cari issue berdasarkan ticket code, departemen, issue, PIC, source, priority, atau status"
                placeholder="Cari issue, ticket code, PIC..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-[#F5F5FA] pl-9 pr-3 text-xs text-slate-700 placeholder:text-slate-400 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
              <div className="relative sm:w-48">
                <ListFilter aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <select
                  aria-label="Filter status issue"
                  value={selectedStatus ?? ''}
                  onChange={(event) => setSelectedStatus((event.target.value || null) as IssueStatus | null)}
                  className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-[#F5F5FA] pl-9 pr-8 text-xs font-medium text-slate-600 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                >
                  <option value="">Semua Status</option>
                  {statuses.map(({ name }) => <option key={name} value={name}>{name}</option>)}
                </select>
                <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              </div>
              <div className="relative sm:w-44">
                <select
                  aria-label="Filter priority issue"
                  value={selectedPriority ?? ''}
                  onChange={(event) => setSelectedPriority((event.target.value || null) as IssuePriority | 'unset' | null)}
                  className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-[#F5F5FA] pl-3 pr-8 text-xs font-medium text-slate-600 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                >
                  <option value="">Semua Priority</option>
                  <option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option><option value="unset">Belum ditentukan</option>
                </select>
                <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              </div>
              <button
                type="button"
                disabled={!search && !selectedStatus && !selectedPriority}
                onClick={() => { setSearch(''); setSelectedStatus(null); setSelectedPriority(null); }}
                className="col-span-2 inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-[#F5F5FA] px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
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
                <tr className="bg-violet-50/70 border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                  {['Ticket Code', 'Departemen', 'Issue', 'PIC', 'Date', 'Priority', 'Due Date', 'Status'].map((heading) => <th key={heading} scope="col" className="py-3 px-3 font-semibold">{heading}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {rows.map((issue) => {
                  const status = statuses.find((item) => item.name === issue.status)!;
                  return (
                    <tr key={issue.id}
                      onClick={(event) => {
                        event.currentTarget.querySelector('button')?.focus();
                        setSelectedIssue(issue);
                      }}
                      className="cursor-pointer hover:bg-slate-50/50 focus-within:bg-slate-50/50 transition-colors">
                      <th scope="row" className="whitespace-nowrap px-3 py-4 font-medium">
                        <button type="button" aria-haspopup="dialog" aria-label={`Lihat detail ${issue.ticket_code}`} onClick={() => setSelectedIssue(issue)} className="cursor-pointer rounded text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500">{issue.ticket_code}</button>
                      </th>
                      <td className="px-3 py-4">{issue.reporter_department}</td>
                      <td className="px-3 py-4"><span className="block break-words" title={issue.title}>{issue.title}</span></td>
                      <td className="px-3 py-4"><span className="inline-flex items-center gap-1.5 whitespace-nowrap"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[6px] font-semibold" style={{ color: status.color, backgroundColor: status.background }}>{issue.source}</span>{issue.employee_id}</span></td>
                      <td className="px-3 py-4 whitespace-nowrap">{issueDateFormatter.format(new Date(issue.created_at))}</td>
                      <td className="px-3 py-4">{issue.priority ? <span className="font-semibold">{issue.priority}</span> : <span className="text-slate-400">-</span>}</td>
                      <td className="px-3 py-4 whitespace-nowrap">{dueDateLabel(issue.due_date)}</td>
                      <td className="px-3 py-4 whitespace-nowrap font-semibold" style={{ color: status.color }}>{issue.status}</td>
                    </tr>
                  );
                })}
                {rows.length === 0 && <tr><td colSpan={8} className="p-4 text-slate-500">Tidak ada issue yang sesuai dengan {searchQuery ? 'pencarian dan filter' : 'filter'}.</td></tr>}
              </tbody>
            </table>
          </div>
          <p role="status" className="border-t border-slate-100 bg-white px-3 py-3 text-xs text-slate-500">Menampilkan {rows.length} dari {issues.length} issue.</p>
        </section>
      </section>
      <dialog ref={dialogRef} aria-labelledby="issue-dialog-title"
        onClose={() => setSelectedIssue(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const rect = event.currentTarget.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close();
          }
        }}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[560px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-[#253044] shadow-2xl backdrop:bg-slate-950/40">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <h2 id="issue-dialog-title" className="text-base font-bold text-slate-900">Detail Issue</h2>
          <button type="button" aria-label="Tutup detail issue" onClick={() => dialogRef.current?.close()} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-500"><X className="h-4 w-4" /></button>
        </div>
        {selectedIssue && (
          <div className="px-6 pb-5 pt-5">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-xs sm:grid-cols-2 [&_dd]:break-words [&_dt]:mb-1.5 [&_dt]:text-[10px] [&_dt]:font-medium [&_dt]:uppercase [&_dt]:tracking-wide [&_dt]:text-slate-500">
              <div className="border-b border-slate-100 pb-4 sm:col-span-2">
                <dt>Issue</dt>
                <dd className="text-base font-semibold leading-relaxed text-slate-900">{selectedIssue.title}</dd>
              </div>
              <div>
                <dt>Sumber</dt>
                <dd className="font-semibold">{selectedIssue.source}</dd>
              </div>
              <div>
                <dt>PIC</dt>
                <dd className="flex items-center gap-2 font-semibold"><span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-[9px] text-white">E</span>{selectedIssue.employee_id}</dd>
              </div>
              <div className="border-t border-slate-100 pt-4 sm:col-span-2">
                <dt>Deskripsi</dt>
                <dd className="leading-relaxed text-slate-600">{selectedIssue.description}</dd>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 sm:col-span-2">
                <dt>Task</dt>
                <dd className="font-medium leading-relaxed">{selectedIssue.task}</dd>
              </div>
              <div>
                <dt>Priority</dt>
                <dd className="font-semibold">{selectedIssue.priority || '-'}</dd>
              </div>
              <div>
                <dt>Due Date</dt>
                <dd className="font-semibold">{dueDateLabel(selectedIssue.due_date)}</dd>
              </div>
              <div className="border-t border-slate-100 pt-4 sm:col-span-2">
                <dt>Status</dt>
                <dd><span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-medium" style={{ color: selectedStyle?.color, borderColor: selectedStyle?.color }}><span aria-hidden="true" className="h-1 w-1 rounded-full bg-current" />{selectedIssue.status}</span></dd>
              </div>
            </dl>
            <button type="button" onClick={() => dialogRef.current?.close()} className="mt-5 w-full cursor-pointer rounded-md bg-[#0752DF] py-2.5 text-xs font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">Tutup</button>
          </div>
        )}
      </dialog>
    </DashboardShell>
  );
}
