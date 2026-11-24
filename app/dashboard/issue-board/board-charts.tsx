'use client';

import { Text } from '@/components/language';

type Segment = { label: string; count: number; color: string };

export function DepartmentChart({ segments, total }: { segments: Segment[]; total: number }) {
  return <div className="flex flex-1 flex-wrap items-center justify-center gap-6 py-3">
    <svg role="img" aria-label={`Issues by department: ${total} issue`} viewBox="0 0 180 180" className="h-48 w-48 shrink-0">
      <circle cx="90" cy="90" r="66" fill="none" stroke="#f1f5f9" strokeWidth="24" />
      {segments.map((segment, index) => {
        const share = total ? segment.count / total * 100 : 0;
        const start = total ? segments.slice(0, index).reduce((sum, previous) => sum + previous.count, 0) / total * 100 : 0;
        return share > 0 ? <circle key={segment.label} cx="90" cy="90" r="66" pathLength="100" fill="none" stroke={segment.color} strokeWidth="24" strokeDasharray={`${share} ${100 - share}`} strokeDashoffset={-start} transform="rotate(-90 90 90)" /> : null;
      })}
      <text x="90" y="88" textAnchor="middle" dominantBaseline="middle" fill="#0f172a" fontSize="30" fontWeight="700" fontFamily="var(--font-poppins), sans-serif">{total}</text>
      <text x="90" y="111" textAnchor="middle" fill="#64748b" fontSize="14" fontFamily="var(--font-inter), sans-serif"><Text>issues</Text></text>
    </svg>
    <ul className="space-y-3 text-sm">{segments.map((segment) => <li key={segment.label} className="grid grid-cols-[12px_minmax(44px,1fr)_auto_auto] items-center gap-2.5"><span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ background: segment.color }} /><span className="text-slate-600"><Text dynamic>{segment.label}</Text></span><strong className="text-base tabular-nums text-slate-800">{segment.count}</strong><span className="tabular-nums text-slate-500"><Text dynamic>{total ? Math.round(segment.count / total * 100) : 0}</Text>%</span></li>)}</ul>
  </div>;
}

export function PriorityCharts({ segments, total }: { segments: Segment[]; total: number }) {
  const maximum = Math.max(1, ...segments.map(segment => segment.count));
  return <div className="flex flex-1 flex-col justify-center py-3">
    <ul aria-label={`Prioritas dari ${total} issue`} className="space-y-4">{segments.map(segment => <li key={segment.label} className="grid grid-cols-[112px_minmax(0,1fr)_32px] items-center gap-3 text-sm">
      <span className="break-words text-slate-600"><Text dynamic>{segment.label}</Text></span>
      <div className="h-6 overflow-hidden rounded bg-slate-100"><div className="h-full rounded-sm" style={{ width: `${segment.count / maximum * 100}%`, background: segment.color }} /></div>
      <strong className="text-right text-base tabular-nums text-slate-800">{segment.count}</strong>
    </li>)}</ul>
    <div aria-hidden="true" className="mt-3 grid grid-cols-[112px_minmax(0,1fr)_32px] gap-3 text-xs tabular-nums text-slate-500"><span /><span className="flex justify-between"><span>0</span><span>{maximum}</span></span><span /></div>
  </div>;
}

export function AgingChart({ segments }: { segments: Segment[] }) {
  const maximum = Math.max(1, ...segments.map(segment => segment.count));
  const step = Math.max(1, Math.ceil(maximum / 4));
  const axisMaximum = step * 4;
  const plotHeight = 156;
  const baseline = 182;
  const columnSpace = 504 / Math.max(1, segments.length);
  return <div className="flex flex-1 items-center py-2">
    <svg role="img" aria-label={`Umur issue overdue: ${segments.map(segment => `${segment.label}: ${segment.count}`).join(', ')}`} viewBox="0 0 560 228" className="w-full">
      {Array.from({ length: 5 }, (_, index) => {
        const y = baseline - index / 4 * plotHeight;
        return <g key={index}><line x1="40" x2="544" y1={y} y2={y} stroke="#e2e8f0" strokeDasharray={index ? '3 4' : undefined} /><text x="30" y={y + 5} textAnchor="end" fontSize="14" fill="#64748b">{index * step}</text></g>;
      })}
      {segments.map((segment, index) => {
        const x = 40 + columnSpace * index + columnSpace / 2;
        const height = segment.count / axisMaximum * plotHeight;
        const label = segment.label.replace('More than 30 Days', '> 30 days').replace('Days', 'days');
        return <g key={segment.label}>
          <title><Text dynamic>{segment.label}</Text>: {segment.count} <Text>issue</Text></title>
          <rect x={x - 32} y={baseline - height} width="64" height={height} rx="3" fill={segment.color} />
          <text x={x} y={baseline - height - 9} textAnchor="middle" fontSize="17" fontWeight="700" fill="#334155" fontFamily="var(--font-poppins), sans-serif">{segment.count}</text>
          <text x={x} y="211" textAnchor="middle" fontSize="15" fill="#64748b" fontFamily="var(--font-inter), sans-serif"><Text dynamic>{label}</Text></text>
        </g>;
      })}
    </svg>
  </div>;
}

export function DueDateChart({ onTrack, dueSoon, overdue }: { onTrack: number; dueSoon: number; overdue: number }) {
  const total = onTrack + dueSoon + overdue;
  const segments = [
    { label: 'On Track', count: onTrack, color: '#10b981' },
    { label: 'Due Soon', count: dueSoon, color: '#f59e0b' },
    { label: 'Overdue', count: overdue, color: '#ef4444' },
  ];
  return <div className="flex flex-1 flex-col justify-center gap-5 py-4">
    <div role="img" aria-label={`Due date: ${onTrack} on track, ${dueSoon} due soon, ${overdue} overdue`} className="flex h-10 w-full overflow-hidden rounded-lg bg-slate-100">
      {segments.filter(segment => segment.count > 0).map(segment => {
        const share = segment.count / total * 100;
        return <div key={segment.label} title={`${segment.label}: ${segment.count} dari ${total}`} className="flex min-w-0 items-center justify-center overflow-hidden text-sm font-semibold text-white" style={{ width: `${share}%`, backgroundColor: segment.color }}><Text dynamic>{share >= 14 ? `${Math.round(share)}%` : null}</Text></div>;
      })}
    </div>
    <dl className="grid grid-cols-3 divide-x divide-slate-200">{segments.map(segment => <div key={segment.label} className="min-w-0 px-2 first:pl-0 last:pr-0">
      <dt className="flex flex-wrap items-center gap-1.5 font-sans text-sm text-slate-600"><span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} /><Text dynamic>{segment.label}</Text></dt>
      <dd className="mt-1 font-[family-name:var(--font-poppins)] text-[28px] font-bold leading-tight tabular-nums" style={{ color: segment.color }}>{segment.count}</dd>
    </div>)}</dl>
  </div>;
}
