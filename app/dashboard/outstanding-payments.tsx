'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowDownUp } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

type Outstanding = {
  outstanding_row_id: string; customer: string | null; job_number: string | null;
  outstanding_amount: number | null; due_date: string | null;
  overdue_by: number | null; status: string | null; source: string | null;
};
export type OutstandingSortColumn = 'customer' | 'job_number';
export type OutstandingSort = { column: OutstandingSortColumn; direction: 'ascending' | 'descending' } | null;
const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 2 });
const dateLabel = (value: string | null) => value ? new Date(value + 'T00:00:00+07:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }) : '-';

export function useOutstandingPayments(limit?: number) {
  const [rows, setRows] = useState<Outstanding[]>([]);
  const [total, setTotal] = useState(0);
  const [tableLoading, setTableLoading] = useState(true);
  const [tableError, setTableError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setTableLoading(true); setTableError(''); setRows([]); setTotal(0);
      try {
        const result: Outstanding[] = [];
        const pageSize = limit ?? 500;
        let totalCount = 0;
        for (let offset = 0; ; offset += pageSize) {
          const { data, error, count } = await supabase.from('b1_outstanding')
            .select('outstanding_row_id, customer, job_number, outstanding_amount, due_date, overdue_by, status, source', { count: offset === 0 ? 'exact' : undefined })
            .order('due_date').order('outstanding_row_id')
            .range(offset, offset + pageSize - 1).abortSignal(controller.signal);
          if (controller.signal.aborted) return;
          if (error) throw error;
          if (offset === 0) totalCount = count ?? 0;
          result.push(...(data ?? []));
          if (limit !== undefined || !data || data.length < pageSize) break;
        }
        if (!controller.signal.aborted) { setRows(result); setTotal(totalCount); }
      } catch (error) {
        if (!controller.signal.aborted) {
          const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Koneksi database gagal.';
          setTableError('Gagal memuat outstanding: ' + message);
        }
      } finally { if (!controller.signal.aborted) setTableLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [limit, reload]);

  return { rows, total, tableLoading, tableError, retry: () => setReload((value) => value + 1) };
}

export function OutstandingPaymentsTable({ rows: visibleRows, tableLoading, tableError, emptyMessage = 'Belum ada data outstanding.', sort = null, onSort }: {
  rows: Outstanding[]; tableLoading: boolean; tableError: string; emptyMessage?: string;
  sort?: OutstandingSort; onSort?: (column: OutstandingSortColumn) => void;
}) {
  const rows = visibleRows;
  return (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left border-collapse">
              <thead>
                <tr className="bg-violet-50/70 border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                  {['Issue', 'Customer', 'Job Number', 'Amount', 'Due Date', 'Status/Source'].map((heading) => {
                    const column = heading === 'Customer' ? 'customer' : heading === 'Job Number' ? 'job_number' : null;
                    const sortable = column !== null && onSort !== undefined;
                    const direction = sort?.column === column ? sort?.direction : undefined;
                    const Icon = direction === 'ascending' ? ArrowUp : direction === 'descending' ? ArrowDown : ArrowDownUp;
                    const nextOrder = direction === 'ascending' ? 'Z–A' : direction === 'descending' ? 'urutan awal' : 'A–Z';
                    return (
                      <th key={heading} scope="col" aria-sort={sortable ? direction ?? 'none' : undefined} className="py-3 px-3 font-semibold">
                        {sortable ? (
                          <button type="button" onClick={() => onSort(column)} aria-label={`${heading}: urutkan ${nextOrder}`} title={`Urutkan ${nextOrder}`} className={`flex cursor-pointer items-center gap-1.5 rounded uppercase tracking-wider hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-purple-500 ${direction ? 'text-slate-700' : ''}`}>
                            {heading}<Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                          </button>
                        ) : heading}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {tableLoading ? <tr><td colSpan={6} className="p-4" role="status">Memuat outstanding...</td></tr> : tableError ? <tr><td colSpan={6} className="p-4 text-red-600" role="alert">{tableError}</td></tr> : rows.length === 0 ? <tr><td colSpan={6} className="p-4 text-slate-500" role="status">{emptyMessage}</td></tr> : visibleRows.map((row) => (
                  <tr key={row.outstanding_row_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-3 font-medium">Outstanding Payment</td><td className="py-4 px-3">{row.customer || '-'}</td><td className="py-4 px-3 whitespace-nowrap">{row.job_number || '-'}</td>
                    <td className="py-4 px-3 whitespace-nowrap tabular-nums">{row.outstanding_amount == null ? '-' : rupiah.format(Number(row.outstanding_amount))}</td>
                    <td className="py-4 px-3 whitespace-nowrap">{dateLabel(row.due_date)}</td>
                    <td className={`py-4 px-3 whitespace-nowrap font-semibold ${row.status?.toUpperCase() === 'OVERDUE' ? 'text-rose-500' : 'text-slate-600'}`}>{row.status || '-'} / {row.source || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
  );
}
