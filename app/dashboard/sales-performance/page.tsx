'use client';

import { useEffect, useState } from 'react';
import DashboardShell from '../dashboard-shell';
import { supabase } from '@/lib/supabaseClient';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

type Report = { period_month: string; total_revenue: number | null; total_profit: number | null };
type Outstanding = {
  outstanding_row_id: string; customer: string | null; job_number: string | null;
  outstanding_amount: number | null; due_date: string | null;
  overdue_by: number | null; status: string | null; source: string | null;
};
const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 2 });
const monthLabel = (value: string) => new Date(value + 'T00:00:00+07:00').toLocaleDateString('id-ID', { month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
const dateLabel = (value: string | null) => value ? new Date(value + 'T00:00:00+07:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }) : '-';

export default function SalesPerformance() {
  const [period, setPeriod] = useState('3');
  const [reports, setReports] = useState<Report[]>([]);
  const [rows, setRows] = useState<Outstanding[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [chartError, setChartError] = useState('');
  const [tableError, setTableError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadChart() {
      setChartLoading(true); setChartError(''); setReports([]);
      try {
        const result: Report[] = [];
        for (let offset = 0; ; offset += 500) {
          const { data, error } = await supabase.from('b1_linechart')
            .select('period_month, total_revenue, total_profit').order('period_month')
            .range(offset, offset + 499).abortSignal(controller.signal);
          if (error) throw error;
          result.push(...(data ?? []));
          if (!data || data.length < 500) break;
        }
        if (!controller.signal.aborted) setReports(result);
      } catch (error) {
        if (!controller.signal.aborted) setChartError('Gagal memuat grafik: ' + errorMessage(error));
      } finally { if (!controller.signal.aborted) setChartLoading(false); }
    }
    async function loadOutstanding() {
      setTableLoading(true); setTableError(''); setRows([]);
      try {
        const result: Outstanding[] = [];
        for (let offset = 0; ; offset += 500) {
          const { data, error } = await supabase.from('b1_outstanding')
            .select('outstanding_row_id, customer, job_number, outstanding_amount, due_date, overdue_by, status, source')
            .order('due_date').order('outstanding_row_id')
            .range(offset, offset + 499).abortSignal(controller.signal);
          if (error) throw error;
          result.push(...(data ?? []));
          if (!data || data.length < 500) break;
        }
        if (!controller.signal.aborted) setRows(result);
      } catch (error) {
        if (!controller.signal.aborted) setTableError('Gagal memuat outstanding: ' + errorMessage(error));
      } finally { if (!controller.signal.aborted) setTableLoading(false); }
    }
    void loadChart(); void loadOutstanding();
    return () => controller.abort();
  }, [reload]);

  // The period selector affects monthly profit only; outstanding has no report-period column.
  const latest = reports.at(-1)?.period_month;
  const latestYear = latest?.slice(0, 4);
  const cutoff = latest ? new Date(latest + 'T00:00:00Z') : null;
  if (cutoff) cutoff.setUTCMonth(cutoff.getUTCMonth() - Number(period) + 1);
  const selected = reports.filter((row) => period === 'ytd'
    ? row.period_month.slice(0, 4) === latestYear
    : cutoff && row.period_month >= cutoff.toISOString().slice(0, 10));
  const data = selected.map((row) => ({ month: monthLabel(row.period_month), profit: row.total_profit === null ? null : Number(row.total_profit) / 1000000 }));
  const first = selected[0]?.total_profit;
  const last = selected.at(-1)?.total_profit;
  const growth = selected.length > 1 && first != null && Number(first) !== 0 && last != null
    ? (Number(last) - Number(first)) / Math.abs(Number(first)) * 100 : null;
  const range = selected.length ? `${monthLabel(selected[0].period_month)} ? ${monthLabel(selected[selected.length - 1].period_month)}` : '-';

  return (
    <DashboardShell activePage="sales-performance">
      <section aria-labelledby="sales-title" className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h2 id="sales-title" className="font-bold text-slate-800 text-base">Sales Performance Trend</h2>
            <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-wide">Total profit company sales report periode {range}.</p>
          </div>
          <select aria-label="Sales report period" value={period} onChange={(event) => setPeriod(event.target.value)} className="self-start bg-white text-slate-700 text-xs font-medium px-3 py-2 rounded-full border border-purple-200 focus:outline-2 focus:outline-purple-500 cursor-pointer">
            <option value="3">Last 3 Months</option><option value="6">Last 6 Months</option><option value="ytd">YTD{latestYear ? ` ${latestYear}` : ''}</option>
          </select>
        </div>
        <div className="flex items-center justify-between mt-6 mb-4 text-[11px] text-slate-500">
          <span>Profit (dalam juta rupiah)</span><span className="flex items-center gap-2"><i className="h-3 w-3 rounded-sm bg-cyan-500" />Total Profit</span>
        </div>
        <div className="h-64 sm:h-80 my-2" role="group" aria-label={`Sales performance chart, ${range}`}>
          {chartLoading ? <p role="status">Memuat grafik...</p> : chartError ? <p role="alert" className="text-sm text-red-600">{chartError}</p> : !data.length ? <p className="text-sm text-slate-500">Belum ada data grafik pada periode ini.</p> : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} accessibilityLayer>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} tickMargin={8} />
                <YAxis width={80} tick={{ fontSize: 12, fill: '#64748B' }} tickFormatter={(value: number) => `Rp${value}M`} />
                <Tooltip formatter={(value) => [rupiah.format(Number(value) * 1000000), 'Total Profit']} />
                <Line type="monotone" dataKey="profit" name="Total Profit" stroke="#06B6D4" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="border-t border-slate-100 pt-3 mt-5" aria-live="polite">
          <h3 className="text-xs font-semibold text-slate-700">Description</h3>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{growth === null ? 'Perbandingan pertumbuhan tersedia jika terdapat minimal dua bulan dengan profit awal bukan nol.' : `Total profit ${growth < 0 ? 'menurun' : growth > 0 ? 'meningkat' : 'berubah'} ${Math.abs(growth).toLocaleString('id-ID', { maximumFractionDigits: 1 })}% selama periode ${range}.`}</p>
        </div>
        <section aria-labelledby="sales-details" className="border-t border-slate-100 mt-8 pt-6">
          <h3 id="sales-details" className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-4">Outstanding Payments (IDR)</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left border-collapse">
              <thead><tr className="bg-violet-50/70 border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">{['Issue', 'Customer', 'Job Number', 'Amount', 'Due Date', 'Status/Source'].map((heading) => <th key={heading} scope="col" className="py-3 px-3 font-semibold">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {tableLoading ? <tr><td colSpan={6} className="p-4" role="status">Memuat outstanding...</td></tr> : tableError ? <tr><td colSpan={6} className="p-4 text-red-600" role="alert">{tableError}</td></tr> : rows.length === 0 ? <tr><td colSpan={6} className="p-4 text-slate-500">Belum ada data outstanding.</td></tr> : rows.map((row) => (
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
        </section>
        {(chartError || tableError) && <button type="button" onClick={() => setReload((value) => value + 1)} className="mt-4 text-sm text-blue-600 cursor-pointer">Coba lagi</button>}
      </section>
    </DashboardShell>
  );
}

function errorMessage(error: unknown) {
  return error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Koneksi database gagal.';
}
