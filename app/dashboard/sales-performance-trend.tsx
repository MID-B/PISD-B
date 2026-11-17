'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

type Report = { period_month: string; total_revenue: number | null; total_profit: number | null };
const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 2 });
export const monthLabel = (value: string) => new Date(value + 'T00:00:00+07:00').toLocaleDateString('id-ID', { month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });

export function useSalesPerformanceTrend() {
  const [period, setPeriod] = useState('3'); // '3', '6', 'ytd'
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-05');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

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

  // Logika Pemfilteran Data Berdasarkan Jenis Filter yang Dipilih
  const selected = reports.filter((row) => {
    const rowMonth = row.period_month; // Format 'YYYY-MM-DD' atau 'YYYY-MM'

    if (period === 'year') {
      return rowMonth.slice(0, 4) === selectedYear;
    }
    if (period === 'month') {
      return rowMonth.slice(0, 7) === selectedMonth;
    }
    if (period === 'range') {
      if (!startDate || !endDate) return true;
      return rowMonth >= startDate && rowMonth <= endDate;
    }

    // Preset 3 atau 6 Bulan
    const cutoff = latest ? new Date(latest + 'T00:00:00Z') : null;
    if (cutoff) cutoff.setUTCDate(1);
    if (cutoff) cutoff.setUTCMonth(cutoff.getUTCMonth() - Number(period) + 1);
    
    return cutoff && rowMonth >= cutoff.toISOString().slice(0, 10);
  });

  const data = selected.map((row) => ({ month: monthLabel(row.period_month), profit: row.total_profit === null ? null : Number(row.total_profit) / 1000000 }));
  const first = selected[0]?.total_profit;
  const last = selected.at(-1)?.total_profit;
  const growth = selected.length > 1 && first != null && Number(first) !== 0 && last != null
    ? (Number(last) - Number(first)) / Math.abs(Number(first)) * 100 : null;
  const range = selected.length ? `${monthLabel(selected[0].period_month)} – ${monthLabel(selected[selected.length - 1].period_month)}` : '-';

  return { 
    period, setPeriod, 
    selectedYear, setSelectedYear,
    selectedMonth, setSelectedMonth,
    startDate, setStartDate,
    endDate, setEndDate,
    selected, data, latestYear, growth, range, chartLoading, chartError, retry: () => setReload((value) => value + 1) 
  };
}

export default function SalesPerformanceTrend({ 
    model, 
    compact = true 
  }: { 
    model: ReturnType<typeof useSalesPerformanceTrend>; 
    compact?: boolean; 
  }) {
  const { 
    period, setPeriod, 
    selectedYear, setSelectedYear,
    selectedMonth, setSelectedMonth,
    startDate, setStartDate,
    endDate, setEndDate,
    data, latestYear, growth, range, chartLoading, chartError, retry 
  } = model;

  const [isPeriodOpen, setIsPeriodOpen] = useState(false);

  return (
    <div className={`bg-white rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between ${compact ? 'h-full p-2' : 'p-6'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-1 mb-0.5 shrink-0">
          <div>
            {/* Judul disamakan ukurannya dengan Top Purchasing Clients */}
            <h2 id="sales-title" className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">Sales Performance Trend</h2>
            <p className="text-[8px] text-slate-400 mt-0.5 uppercase tracking-wide">Total profit company sales report periode {range}.</p>
          </div>

          {/* KUMPULAN KONTROL FILTER */}
          <div className="flex items-center justify-between gap-1 mb-0.5 shrink-0">
            {/* 1 DROPDOWN UTAMA */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPeriodOpen(!isPeriodOpen)}
                className="bg-slate-50 text-[9px] font-bold text-slate-700 border border-[#D9E2EC] rounded-full px-3 py-1 cursor-pointer hover:bg-[#C3C6D7] transition-colors"
              >
                {{
                  '3': 'Per 3 Bulan',
                  '6': 'Per 6 Bulan',
                  year: 'Per Tahun',
                  month: 'Per Bulan',
                  range: 'Rentang Tanggal'
                }[period]}
                <span className="ml-1">▾</span>
              </button>

              {isPeriodOpen && (
                <div className="absolute left-0 top-full mt-1 z-50 min-w-full bg-white border border-[#D9E2EC] rounded-lg shadow-md overflow-hidden">
                  {[
                    ['3', 'Per 3 Bulan'],
                    ['6', 'Per 6 Bulan'],
                    ['year', 'Per Tahun'],
                    ['month', 'Per Bulan'],
                    ['range', 'Rentang Tanggal']
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setPeriod(value);
                        setIsPeriodOpen(false);
                      }}
                      className="block w-full text-left px-3 py-2 text-[9px] font-bold text-slate-700 hover:bg-[#C3C6D7] transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* MUNCUL JIKA PILIH 'Per Tahun' */}
            {period === 'year' && (
              <select 
                value={selectedYear} 
                onChange={(event) => setSelectedYear(event.target.value)} 
                className="bg-slate-50 text-[9px] font-bold text-slate-700 border border-[#D9E2EC] rounded-full px-3 py-1 focus:outline-none shadow-2xs cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            )}

            {/* MUNCUL JIKA PILIH 'Per Bulan' */}
            {period === 'month' && (
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={(event) => setSelectedMonth(event.target.value)} 
                className="bg-slate-50 text-[9px] font-bold text-slate-700 border border-[#D9E2EC] rounded-full px-3 py-1 focus:outline-none shadow-2xs cursor-pointer"
              />
            )}

            {/* MUNCUL JIKA PILIH 'Rentang Tanggal' */}
            {period === 'range' && (
              <div className="flex items-center gap-1">
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(event) => setStartDate(event.target.value)} 
                  className="bg-slate-50 text-[8px] font-bold text-slate-700 border border-[#D9E2EC] rounded-full px-2 py-1 focus:outline-none shadow-2xs"
                />
                <span className="text-[8px] text-slate-500">s/d</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(event) => setEndDate(event.target.value)} 
                  className="bg-slate-50 text-[8px] font-bold text-slate-700 border border-[#D9E2EC] rounded-full px-2 py-1 focus:outline-none shadow-2xs"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-1 mb-1 text-[9px] text-slate-500">
          <span>Profit (dalam juta rupiah)</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-cyan-500" />Total Profit</span>
        </div>
        
        <div className={`w-full ${compact ? 'flex-1 min-h-[85px]' : 'h-72 my-2'}`} role="group" aria-label={`Sales performance chart, ${range}`}>
          {chartLoading ? <p role="status">Memuat grafik...</p> : chartError ? <p role="alert" className="text-sm text-red-600">{chartError}</p> : !data.length ? <p className="text-sm text-slate-500">Belum ada data grafik pada periode ini.</p> : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart 
                data={data} 
                margin={compact ? { top: 5, right: 10, left: -25, bottom: 2 } : { top: 10, right: 20, left: 0, bottom: 5 }} 
                accessibilityLayer
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: compact ? 9 : 12, fill: '#64748B' }} tickMargin={compact ? 2 : 8} />
                <YAxis width={compact ? 70 : 80} tick={{ fontSize: compact ? 9 : 12, fill: '#64748B' }} tickFormatter={(value: number) => `Rp${value}M`} />
                <Tooltip formatter={(value) => [rupiah.format(Number(value) * 1000000), 'Total Profit']} />
                <Line type="monotone" dataKey="profit" name="Total Profit" stroke="#06B6D4" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className={`border-t border-slate-100 ${compact ? 'pt-1 mt-1' : 'pt-4 mt-6'} shrink-0`} aria-live="polite">
          {!compact && <h3 className="text-xs font-semibold text-slate-700 mb-1">Description</h3>}
          <p className={`${compact ? 'text-[8px]' : 'text-[11px]'} text-slate-500 truncate leading-tight`}>
            {growth === null ? 'Perbandingan pertumbuhan tersedia jika terdapat minimal dua bulan profit.' : `Total profit ${growth < 0 ? 'menurun' : growth > 0 ? 'meningkat' : 'berubah'} ${Math.abs(growth).toLocaleString('id-ID', { maximumFractionDigits: 1 })}% selama periode ${range}.`}
          </p>
        </div>
      {chartError && <button type="button" onClick={retry} className="mt-4 text-sm text-blue-600 cursor-pointer">Coba lagi</button>}
    </div>
  );
}

function errorMessage(error: unknown) {
  return error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Koneksi database gagal.';
}