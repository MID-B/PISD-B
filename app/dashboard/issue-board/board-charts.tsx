'use client';

type Segment = { label: string; count: number; color: string };
export function DepartmentChart({ segments, total }: { segments: Segment[]; total: number }) {
  return <div className="flex min-h-0 flex-1 flex-wrap items-center justify-center gap-5 py-1">
    <svg role="img" aria-label={`Issues by department: ${total} issue`} viewBox="0 0 180 180" className="h-[120px] w-[120px] shrink-0">
      <circle cx="90" cy="90" r="66" fill="none" stroke="#f1f5f9" strokeWidth="24" />
      {segments.map((segment, index) => {
        const share = total ? segment.count / total * 100 : 0;
        const start = total ? segments.slice(0, index).reduce((sum, previous) => sum + previous.count, 0) / total * 100 : 0;
        return <circle key={segment.label} cx="90" cy="90" r="66" pathLength="100" fill="none" stroke={segment.color} strokeWidth="24" strokeDasharray={`${share} ${100 - share}`} strokeDashoffset={-start} transform="rotate(-90 90 90)" />;
      })}
      <text x="90" y="90" textAnchor="middle" dominantBaseline="middle" fill="#0f172a" fontSize="30" fontWeight="800">{total}</text>
      <text x="90" y="115" textAnchor="middle" fill="#64748b" fontSize="13">issues</text>
    </svg>
    <ul className="space-y-2 text-xs">{segments.map((segment) => <li key={segment.label} className="flex items-center gap-2"><span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: segment.color }} /><span className="min-w-12 text-slate-600">{segment.label}</span><strong className="text-slate-800">{segment.count}</strong><span className="text-slate-400">{total ? Math.round(segment.count / total * 100) : 0}%</span></li>)}</ul>
  </div>;
}
export function PriorityCharts({ segments, total }: { segments: Segment[]; total: number }) {
  return <div className="grid flex-1 grid-cols-2 items-center gap-3 py-1 sm:grid-cols-4">{segments.map((segment) => {
    const share = total ? segment.count / total * 100 : 0;
    return <div key={segment.label} className="min-w-0 text-center">
      <svg role="img" aria-label={`${segment.label}: ${segment.count} issue (${Math.round(share)}%)`} viewBox="0 0 110 110" className="mx-auto h-[84px] max-w-full">
        <circle cx="55" cy="55" r="42" fill="none" stroke="#f1f5f9" strokeWidth="11" />
        {share > 0 && <circle cx="55" cy="55" r="42" pathLength="100" fill="none" stroke={segment.color} strokeWidth="11" strokeLinecap="round" strokeDasharray={`${share} ${100 - share}`} transform="rotate(-90 55 55)" />}
        <text x="55" y="52" textAnchor="middle" dominantBaseline="middle" fill="#0f172a" fontSize="25" fontWeight="800">{segment.count}</text>
        <text x="55" y="73" textAnchor="middle" fill="#64748b" fontSize="13">{Math.round(share)}%</text>
      </svg>
      <p className="mt-1 flex items-center justify-center gap-1.5 text-[11px] text-slate-600"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: segment.color }} />{segment.label}</p>
    </div>;
  })}</div>;
}
export function DueDateChart({ onTrack, dueSoon, overdue, percent }: { onTrack: number; dueSoon: number; overdue: number; percent: number | null }) {
  const total = onTrack + dueSoon + overdue;
  const segments = [{ label: 'On Track', count: onTrack, color: '#34d399' }, { label: 'Due Soon', count: dueSoon, color: '#fbbf24' }, { label: 'Overdue', count: overdue, color: '#f87171' }];
  return <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 pt-1">
    <svg role="img" aria-label={`Due date: ${onTrack} on track, ${dueSoon} due soon, ${overdue} overdue`} viewBox="0 0 260 145" className="h-[76px] max-w-full">
      <path d="M 20 130 A 110 110 0 0 1 240 130" fill="none" stroke="#f1f5f9" strokeWidth="24" />
      {segments.map((segment, index) => {
        const share = total ? segment.count / total * 100 : 0;
        const start = total ? segments.slice(0, index).reduce((sum, previous) => sum + previous.count, 0) / total * 100 : 0;
        return share > 0 ? <path key={segment.label} d="M 20 130 A 110 110 0 0 1 240 130" fill="none" stroke={segment.color} strokeWidth="24" pathLength="100" strokeDasharray={`${share} ${100 - share}`} strokeDashoffset={-start} /> : null;
      })}
      <text x="130" y="123" textAnchor="middle" fill="#0f172a" fontSize="34" fontWeight="800">{percent === null ? '—' : `${Math.round(percent)}%`}</text>
    </svg>
    <p className="text-center text-[10px] text-slate-500">On Track · {onTrack} dari {total} issue dengan due date</p>
    <dl className="grid w-full max-w-[430px] grid-cols-3 gap-2">{segments.map((segment) => <div key={segment.label} className="rounded-lg border border-slate-200 border-t-2 bg-white px-2 py-1" style={{ borderTopColor: segment.color }}><dt className="flex items-center gap-1.5 text-[10px] text-slate-500"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: segment.color }} />{segment.label}</dt><dd className="mt-0.5 text-base font-extrabold" style={{ color: segment.color }}>{segment.count}</dd></div>)}</dl>
  </div>;
}
