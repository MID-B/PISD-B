'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

type Report = { period_month: string; total_revenue: number | null; total_profit: number | null };
const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 2 });
export const monthLabel = (value: string) => new Date(value + 'T00:00:00+07:00').toLocaleDateString('id-ID', { month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });

export function useSalesPerformanceTrend() {
  const [period, setPeriod] = useState('3');
  const [reports, setReports] = useState<Report[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState('');
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
    void loadChart();
    return () => controller.abort();
  }, [reload]);

  const latest = reports.at(-1)?.period_month;
  const latestYear = latest?.slice(0, 4);
  const cutoff = latest ? new Date(latest + 'T00:00:00Z') : null;
  if (cutoff) cutoff.setUTCDate(1);
  if (cutoff && period !== 'ytd') cutoff.setUTCMonth(cutoff.getUTCMonth() - Number(period) + 1);
  const selected = reports.filter((row) => period === 'ytd'
    ? row.period_month.slice(0, 4) === latestYear
    : cutoff && row.period_month >= cutoff.toISOString().slice(0, 10));
  const data = selected.map((row) => ({ month: monthLabel(row.period_month), profit: row.total_profit === null ? null : Number(row.total_profit) / 1000000 }));
  const first = selected[0]?.total_profit;
  const last = selected.at(-1)?.total_profit;
  const growth = selected.length > 1 && first != null && Number(first) !== 0 && last != null
    ? (Number(last) - Number(first)) / Math.abs(Number(first)) * 100 : null;
  const range = selected.length ? `${monthLabel(selected[0].period_month)} – ${monthLabel(selected[selected.length - 1].period_month)}` : '-';

  return { period, setPeriod, selected, data, latestYear, growth, range, chartLoading, chartError, retry: () => setReload((value) => value + 1) };
}

export default function SalesPerformanceTrend({ model }: { model: ReturnType<typeof useSalesPerformanceTrend> }) {
  const { period, setPeriod, data, latestYear, growth, range, chartLoading, chartError, retry } = model;
  return (
    <>
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
      {chartError && <button type="button" onClick={retry} className="mt-4 text-sm text-blue-600 cursor-pointer">Coba lagi</button>}
    </>
  );
}

function errorMessage(error: unknown) {
  return error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Koneksi database gagal.';
}
