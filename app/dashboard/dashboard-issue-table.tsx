'use client';

import { Text } from '@/components/language';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchUniversalIssues, type UniversalIssue } from './issue-board/issue-data';
import { priorityStyle, sourceColor, formatIssueDate as formatDate } from './issue-board/board-model';

export function useDashboardIssues() {
  const [issues, setIssues] = useState<UniversalIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const result = await fetchUniversalIssues();
        if (result.error) throw result.error;
        setIssues(result.data || []);
      } catch (err: any) {
        setError(err?.message || 'Gagal memuat issue');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return { issues, loading, error };
}

function getPriorityRank(priority: unknown): number {
  const normalized = String(priority || '').trim().toLowerCase();
  if (normalized.includes('urgent') || normalized.includes('high')) return 1;
  if (normalized.includes('medium')) return 2;
  if (normalized.includes('low')) return 3;
  return 4;
}

export function DashboardIssueTable({
  issues,
  loading,
  error,
}: {
  issues: UniversalIssue[];
  loading: boolean;
  error: string;
}) {
  const sortedIssues = [...issues]
    .sort((a: any, b: any) => {
      const rankDiff = getPriorityRank(a.priority) - getPriorityRank(b.priority);
      if (rankDiff !== 0) return rankDiff;

      const dateA = new Date(a.date || a.created_at || 0).getTime();
      const dateB = new Date(b.date || b.created_at || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, 6);

  return (
    <div className="w-full overflow-hidden">
      {/* HEADER: Ditambahkan pr-1.5 agar teks 'Lihat semua' sedikit bergeser ke kiri */}
      <div className="flex items-center justify-between gap-1 mb-1.5 pr-1.5">
        <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide"><Text>Issue Board</Text></h3>
        <Link 
          href="/dashboard/issue-board" 
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#3B6FF5] hover:bg-[#315be0] text-white rounded-full text-[9px] font-bold shadow-2xs transition-colors"
        >
          <svg className="w-3 h-3 fill-none stroke-current stroke-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 3v18" />
          </svg>
          <Text>Lihat Semua
        </Text></Link>
      </div>

      <table className="w-full text-left border-collapse table-fixed">
        <colgroup>
          <col className="w-[18%]" />
          <col className="w-[36%]" />
          <col className="w-[18%]" />
          <col className="w-[14%]" />
          <col className="w-[14%]" />
        </colgroup>
        <thead>
          <tr className="bg-violet-50/80 border-b border-slate-100 text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
            <th className="py-1.5 px-1 truncate"><Text>Department</Text></th>
            <th className="py-1.5 px-1 truncate"><Text>Issue</Text></th>
            <th className="py-1.5 px-1 truncate"><Text>PIC</Text></th>
            <th className="py-1.5 px-1 truncate"><Text>Priority</Text></th>
            <th className="py-1.5 px-1 truncate"><Text>Due Date</Text></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-[9px] text-slate-700">
          {loading ? (
            <tr><td colSpan={5} className="py-2 px-1 text-center text-slate-400"><Text>Memuat issue...</Text></td></tr>
          ) : error ? (
            <tr><td colSpan={5} className="py-2 px-1 text-center text-rose-500"><Text dynamic>{error}</Text></td></tr>
          ) : sortedIssues.length === 0 ? (
            <tr><td colSpan={5} className="py-2 px-1 text-center text-slate-400"><Text>Tidak ada isu</Text></td></tr>
          ) : (
            sortedIssues.map((issue: any, idx) => {
              const deptName = issue.source || issue.department || issue.reporter_department || '-';
              const issueTitle = issue.issue || issue.title || '-';
              const picName = issue.pic_name || issue.pic_id || issue.pic || '-';
              const priority = priorityStyle(issue.priority);
              const dueDateStr = formatDate(issue.due_date) || '-';
              const dotColor = sourceColor(issue.source || issue.department);

              return (
                <tr key={`${issue.source || issue.department || 'issue'}:${issue.reference_code || issue.id || 'unknown'}:${idx}`} className="hover:bg-slate-50/60 transition-colors">
                  {/* Kolom Department */}
                  <td className="py-1 px-1 truncate font-semibold text-slate-800">
                    <span className="inline-flex items-center gap-1">
                      <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
                      <span className="truncate" title={deptName}><Text dynamic>{deptName}</Text></span>
                    </span>
                  </td>

                  {/* Kolom Issue */}
                  <td className="py-1 px-1 truncate" title={issueTitle}><Text dynamic protect={[picName]}>{issueTitle}</Text></td>

                  {/* Kolom PIC */}
                  <td className="py-1 px-1 truncate text-slate-500" title={picName}>{picName}</td>

                  {/* Kolom Priority dengan badge warna dari board-model */}
                  <td className="py-1 px-1 truncate">
                    <span className="inline-flex items-center gap-1">
                      <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-sm" style={{ backgroundColor: priority.color }} />
                      <span className="truncate font-medium text-slate-700" title={priority.label}><Text dynamic>{priority.label}</Text></span>
                    </span>
                  </td>

                  {/* Kolom Due Date */}
                  <td className="py-1 px-1 truncate font-medium text-slate-700" title={dueDateStr}>{dueDateStr}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
