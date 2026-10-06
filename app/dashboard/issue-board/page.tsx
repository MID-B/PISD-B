'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, CircleX, Clock3, Folder, RefreshCw, X } from 'lucide-react';
import DashboardShell from '../dashboard-shell';
import { issues, type Issue, type IssueStatus } from './issue-data';

const statuses = [
  { name: 'In Progress', icon: RefreshCw, color: '#3981FF', background: '#EFF6FF' },
  { name: 'Open', icon: Folder, color: '#F59E0B', background: '#FFFBEB' },
  { name: 'Pending', icon: Clock3, color: '#9560FF', background: '#F5F0FF' },
  { name: 'Completed', icon: CheckCircle2, color: '#10B981', background: '#ECFDF5' },
  { name: 'Closed', icon: CircleX, color: '#77808F', background: '#F3F4F6' },
] as const;

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta',
});

export default function IssueBoardPage() {
  const [selectedStatus, setSelectedStatus] = useState<IssueStatus | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const selectedStyle = statuses.find((status) => status.name === selectedIssue?.status);

  useEffect(() => {
    if (selectedIssue && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [selectedIssue]);

  const rows = selectedStatus ? issues.filter((issue) => issue.status === selectedStatus) : issues;

  return (
    <DashboardShell activePage="issue-board">
      <section aria-labelledby="issue-page-title" className="space-y-5">
        <div>
          <h2 id="issue-page-title" className="text-2xl font-bold tracking-tight text-[#17233D]">Issue Board</h2>
          <p className="mt-1 text-xs text-slate-500">Track and Trace all jobs posted at PT Andima Transportindo.</p>
        </div>

        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-5 gap-3" aria-label="Filter status issue">
          {statuses.map(({ name, icon: Icon, color, background }) => (
            <button key={name} type="button" aria-pressed={selectedStatus === name}
              onClick={() => setSelectedStatus(selectedStatus === name ? null : name)}
              style={{ borderColor: color, backgroundColor: selectedStatus === name ? background : '#FFFFFF' }}
              className="relative min-h-24 rounded-xl border border-l-[3px] p-4 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500 cursor-pointer">
              <Icon aria-hidden="true" className="absolute right-4 top-4 h-5 w-5 opacity-30" style={{ color }} />
              <span className="block text-[40px] font-bold leading-none text-[#14203C]">{issues.filter((issue) => issue.status === name).length}</span>
              <span className="mt-2 block text-[10px] font-bold uppercase tracking-wide" style={{ color }}>{name}</span>
            </button>
          ))}
        </div>

        <section aria-labelledby="issue-table-title" className="min-h-[560px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.07)]">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5">
            <div>
              <h3 id="issue-table-title" className="text-sm font-bold text-[#20304E]">Issue Board</h3>
              <p className="mt-1 text-[11px] text-slate-500">Daftar Pemantauan isu operasional departemen &amp; anggota</p>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="text-slate-400">Data contoh</span>
              {selectedStatus && <button type="button" onClick={() => setSelectedStatus(null)} className="text-blue-600 hover:underline cursor-pointer">Tampilkan semua</button>}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-y border-slate-100 bg-[#FAFBFD] text-[9px] uppercase tracking-wide text-slate-500">
                  {['Ticket Code', 'Departemen', 'Issue', 'PIC', 'Date', 'Status'].map((heading) => <th key={heading} scope="col" className="px-5 py-3 font-medium">{heading}</th>)}
                </tr>
              </thead>
              <tbody className="text-[11px] text-slate-600">
                {rows.map((issue) => {
                  const status = statuses.find((item) => item.name === issue.status)!;
                  return (
                    <tr key={issue.id}
                      onClick={(event) => {
                        event.currentTarget.querySelector('button')?.focus();
                        setSelectedIssue(issue);
                      }}
                      className="cursor-pointer border-b border-slate-50 even:bg-[#FCFCFD] hover:bg-blue-50/60 focus-within:bg-blue-50/60">
                      <th scope="row" className="whitespace-nowrap px-5 py-4 font-semibold text-[#20304E]">
                        <button type="button" aria-haspopup="dialog" aria-label={`Lihat detail ${issue.ticket_code}`} onClick={() => setSelectedIssue(issue)} className="cursor-pointer rounded text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500">{issue.ticket_code}</button>
                      </th>
                      <td className="px-5 py-4 whitespace-nowrap">{issue.reporter_department}</td>
                      <td className="px-5 py-4"><span className="block max-w-44 truncate font-medium text-[#20304E]" title={issue.title}>{issue.title}</span></td>
                      <td className="px-5 py-4"><span className="inline-flex items-center gap-2 whitespace-nowrap"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[7px] font-bold" style={{ color: status.color, backgroundColor: status.background }}>{issue.source}</span>{issue.employee_id}</span></td>
                      <td className="px-5 py-4 whitespace-nowrap">{dateFormatter.format(new Date(issue.created_at))}</td>
                      <td className="px-5 py-4"><span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-semibold" style={{ color: status.color, backgroundColor: status.background }}><span aria-hidden="true" className="h-1 w-1 rounded-full bg-current" />{issue.status}</span></td>
                    </tr>
                  );
                })}
                {rows.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">Belum ada issue dengan status {selectedStatus}.</td></tr>}
              </tbody>
            </table>
          </div>
          <p role="status" className="sr-only">{rows.length} issue ditampilkan{selectedStatus ? ` dengan status ${selectedStatus}` : ''}.</p>
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
              <div className="py-4"><dt className="mb-2 text-[9px] uppercase text-slate-400">Status</dt><dd><span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-medium" style={{ color: selectedStyle?.color, borderColor: selectedStyle?.color }}><span aria-hidden="true" className="h-1 w-1 rounded-full bg-current" />{selectedIssue.status}</span></dd></div>
            </dl>
            <button type="button" onClick={() => dialogRef.current?.close()} className="mt-5 w-full cursor-pointer rounded-md bg-[#0752DF] py-2.5 text-xs font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">Tutup</button>
          </div>
        )}
      </dialog>
    </DashboardShell>
  );
}
