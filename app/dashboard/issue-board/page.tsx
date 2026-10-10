'use client';

import { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import DashboardShell from '../dashboard-shell';
import { issues, issueDateFormatter, type Issue, type IssueStatus, type IssuePriority } from './issue-data';

const statuses = [
  { name: 'In Progress', color: '#3981FF', background: '#EFF6FF' },
  { name: 'Open', color: '#F59E0B', background: '#FFFBEB' },
  { name: 'Pending', color: '#9560FF', background: '#F5F0FF' },
  { name: 'Done', color: '#10B981', background: '#ECFDF5' },
  { name: 'To Do', color: '#77808F', background: '#F3F4F6' },
] as const;

const priorityClasses: Record<IssuePriority, string> = {
  High: 'border-rose-100 bg-rose-50 text-rose-600',
  Medium: 'border-amber-100 bg-amber-50 text-amber-600',
  Low: 'border-emerald-100 bg-emerald-50 text-emerald-600',
};
const dueDateLabel = (value: string | null) => value
  ? issueDateFormatter.format(new Date(`${value}T00:00:00+07:00`)) : '-';

export default function IssueBoardPage() {
  const [selectedStatus, setSelectedStatus] = useState<IssueStatus | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<IssuePriority | 'unset' | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const selectedStyle = statuses.find((status) => status.name === selectedIssue?.status);

  useEffect(() => {
    if (selectedIssue && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [selectedIssue]);

  const rows = issues.filter((issue) => (!selectedStatus || issue.status === selectedStatus)
    && (!selectedPriority || (selectedPriority === 'unset' ? issue.priority === null : issue.priority === selectedPriority)));
  const activeFilterCount = Number(selectedStatus !== null) + Number(selectedPriority !== null);

  return (
    <DashboardShell activePage="issue-board">
      <section aria-labelledby="issue-page-title" className="space-y-5">
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-5 gap-5" aria-label="Ringkasan status issue">
          {statuses.map(({ name, background }) => (
            <div key={name}
              style={{ background: `linear-gradient(145deg, #FFFFFF 35%, ${background} 100%)` }}
              className="flex min-h-36 flex-col rounded-xl border border-blue-100 px-6 py-5 text-[#243F70] shadow-[0_2px_5px_rgba(43,82,153,0.18),0_0_8px_rgba(96,165,250,0.12)]">
              <span className="block min-h-10 max-w-24 text-[15px] font-semibold uppercase leading-5 tracking-wide">{name}</span>
              <span className="mt-2 block text-[34px] font-bold leading-none tabular-nums">{issues.filter((issue) => issue.status === name).length}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
          <h2 id="issue-page-title" className="text-2xl font-bold uppercase leading-tight tracking-tight text-[#243F70]">ISSUE BOARD</h2>
          <p className="mt-1 text-xs text-slate-500">Track and Trace all jobs posted at PT Andima Transportindo.</p>
        </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="flex items-center gap-3 text-[10px]">
              <details className="relative">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-500 [&::-webkit-details-marker]:hidden">
                  <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />Filter
                  {activeFilterCount > 0 && <span className="rounded-full bg-blue-50 px-1.5 text-blue-600">{activeFilterCount}</span>}
                </summary>
                <div className="absolute right-0 top-full z-20 mt-2 w-64 space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
                  <label className="block text-xs font-medium text-slate-600">Status
                    <select value={selectedStatus ?? ''} onChange={(event) => setSelectedStatus((event.target.value || null) as IssueStatus | null)} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-blue-500">
                      <option value="">Semua status</option>
                      {statuses.map(({ name }) => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs font-medium text-slate-600">Priority
                    <select value={selectedPriority ?? ''} onChange={(event) => setSelectedPriority((event.target.value || null) as IssuePriority | 'unset' | null)} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-blue-500">
                      <option value="">Semua priority</option>
                      <option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option><option value="unset">Belum ditentukan</option>
                    </select>
                  </label>
                  <button type="button" disabled={activeFilterCount === 0} onClick={() => { setSelectedStatus(null); setSelectedPriority(null); }} className="cursor-pointer text-xs font-medium text-blue-600 hover:underline disabled:cursor-default disabled:text-slate-400">Reset filter</button>
                </div>
              </details>
            </div>
          </div>
        </div>
        <section aria-label="Tabel issue" className="overflow-hidden rounded-[18px] border border-[#DBE7FF] bg-white shadow-[0_2px_8px_rgba(83,133,232,0.22),0_0_4px_rgba(147,184,255,0.2)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] table-fixed border-collapse text-center [&_tbody_td]:px-3 [&_tbody_td]:py-3 [&_tbody_td]:align-middle [&_tbody_th]:px-3 [&_tbody_th]:py-3 [&_tbody_th]:align-middle">
              <colgroup>
                <col style={{ width: '11%' }} /><col style={{ width: '14%' }} />
                <col style={{ width: '21%' }} /><col style={{ width: '13%' }} />
                <col style={{ width: '10%' }} /><col style={{ width: '9%' }} />
                <col style={{ width: '10%' }} /><col style={{ width: '12%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-[#9FBEFF] bg-white text-xs tracking-normal text-[#243F70]">
                  {['Ticket Code', 'Departemen', 'Issue', 'PIC', 'Date', 'Priority', 'Due Date', 'Status'].map((heading) => <th key={heading} scope="col" className="px-3 py-3.5 font-semibold">{heading}</th>)}
                </tr>
              </thead>
              <tbody className="text-[11px] font-medium leading-snug text-[#3B5686]">
                {rows.map((issue) => {
                  const status = statuses.find((item) => item.name === issue.status)!;
                  return (
                    <tr key={issue.id}
                      onClick={(event) => {
                        event.currentTarget.querySelector('button')?.focus();
                        setSelectedIssue(issue);
                      }}
                      className="cursor-pointer border-b border-[#B4CCFF] transition-colors last:border-b-0 hover:bg-[#F5F8FF] focus-within:bg-[#F5F8FF]">
                      <th scope="row" className="whitespace-nowrap px-5 py-4 text-[11px] font-semibold text-[#243F70]">
                        <button type="button" aria-haspopup="dialog" aria-label={`Lihat detail ${issue.ticket_code}`} onClick={() => setSelectedIssue(issue)} className="cursor-pointer rounded text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500">{issue.ticket_code}</button>
                      </th>
                      <td className="px-5 py-4 text-left font-semibold leading-snug text-[#3B5686]">{issue.reporter_department}</td>
                      <td className="px-5 py-4"><span className="block break-words text-left font-medium leading-snug text-[#3B5686]" title={issue.title}>{issue.title}</span></td>
                      <td className="px-5 py-4"><span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[6px] font-semibold" style={{ color: status.color, backgroundColor: status.background }}>{issue.source}</span>{issue.employee_id}</span></td>
                      <td className="px-5 py-4 whitespace-nowrap">{issueDateFormatter.format(new Date(issue.created_at))}</td>
                      <td className="px-5 py-4">{issue.priority ? <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${priorityClasses[issue.priority]}`}>{issue.priority}</span> : <span className="text-slate-400">-</span>}</td>
                      <td className="px-5 py-4 whitespace-nowrap">{dueDateLabel(issue.due_date)}</td>
                      <td className="px-5 py-4"><span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-medium" style={{ color: status.color, backgroundColor: status.background, borderColor: `${status.color}40` }}><span aria-hidden="true" className="h-1 w-1 rounded-full bg-current" />{issue.status}</span></td>
                    </tr>
                  );
                })}
                {rows.length === 0 && <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-500">Tidak ada issue yang sesuai dengan filter.</td></tr>}
              </tbody>
            </table>
          </div>
          <p role="status" className="border-t border-[#B4CCFF] bg-white px-4 py-3 text-[10px] text-[#7186AD]">Menampilkan {rows.length} dari {issues.length} issue.</p>
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
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[360px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-slate-200 border-t-2 border-t-[#20304E] bg-white p-0 text-[#253044] shadow-2xl backdrop:bg-slate-950/40">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 id="issue-dialog-title" className="text-sm font-bold">Detail Issue</h2>
          <button type="button" aria-label="Tutup detail issue" onClick={() => dialogRef.current?.close()} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-500"><X className="h-4 w-4" /></button>
        </div>
        {selectedIssue && (
          <div className="px-6 pb-5">
            <dl className="divide-y divide-slate-100 text-xs">
              <div className="py-4"><dt className="mb-1 text-[9px] uppercase text-slate-400">Issue</dt><dd className="font-semibold leading-relaxed">{selectedIssue.title}</dd></div>
              <div className="py-4"><dt className="mb-1 text-[9px] uppercase text-slate-400">Sumber</dt><dd className="font-semibold">{selectedIssue.source}</dd></div>
              <div className="py-4"><dt className="mb-1 text-[9px] uppercase text-slate-400">Deskripsi</dt><dd className="font-semibold leading-relaxed">{selectedIssue.description}</dd></div>
              <div className="py-4"><dt className="mb-1 text-[9px] uppercase text-slate-400">PIC</dt><dd className="flex items-center gap-2 font-semibold"><span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-[9px] text-white">E</span>{selectedIssue.employee_id}</dd></div>
              <div className="py-4"><dt className="mb-1 text-[9px] uppercase text-slate-400">Task</dt><dd className="font-semibold leading-relaxed">{selectedIssue.task}</dd></div>
              <div className="py-4"><dt className="mb-1 text-[9px] uppercase text-slate-400">Priority</dt><dd className="font-semibold">{selectedIssue.priority || '-'}</dd></div>
              <div className="py-4"><dt className="mb-1 text-[9px] uppercase text-slate-400">Due Date</dt><dd className="font-semibold">{dueDateLabel(selectedIssue.due_date)}</dd></div>
              <div className="py-4"><dt className="mb-2 text-[9px] uppercase text-slate-400">Status</dt><dd><span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-medium" style={{ color: selectedStyle?.color, borderColor: selectedStyle?.color }}><span aria-hidden="true" className="h-1 w-1 rounded-full bg-current" />{selectedIssue.status}</span></dd></div>
            </dl>
            <button type="button" onClick={() => dialogRef.current?.close()} className="mt-5 w-full cursor-pointer rounded-md bg-[#0752DF] py-2.5 text-xs font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">Tutup</button>
          </div>
        )}
      </dialog>
    </DashboardShell>
  );
}
