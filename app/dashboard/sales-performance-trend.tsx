'use client';

import { Text, LanguageInput, useLanguage, useUiText } from '@/components/language';
import { localizeMonthLabel } from '@/lib/i18n/messages';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

type Report = { period_month: string; total_revenue: number | null; total_profit: number | null };
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
  const rangeError = period !== 'range' ? '' : !startDate || !endDate
    ? 'Pilih tanggal mulai dan tanggal akhir.'
    : startDate > endDate ? 'Tanggal akhir harus sama atau setelah tanggal mulai.' : '';

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
      if (rangeError) return false;
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
    selected, data, latestYear, growth, range, rangeError, chartLoading, chartError, retry: () => setReload((value) => value + 1)
  };
}

export default function SalesPerformanceTrend({ 
    model, 
    compact = true,
    fitHeight = false,
  }: { 
    model: ReturnType<typeof useSalesPerformanceTrend>; 
    compact?: boolean; 
    fitHeight?: boolean;
  }) {
  const { 
    period, setPeriod, 
    selectedYear, setSelectedYear,
    selectedMonth, setSelectedMonth,
    startDate, setStartDate,
    endDate, setEndDate,
    data, growth, range, rangeError, chartLoading, chartError, retry
  } = model;

  const language = useLanguage();
  const t = useUiText();
  const localizedMonth = (value: string) => localizeMonthLabel(value, language);
  const currency = new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-GB', { style: 'currency', currency: 'IDR', maximumFractionDigits: 2 });
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);

  return (
    <div className={`bg-white border border-slate-200/80 flex min-w-0 flex-col justify-between ${compact ? 'rounded-xl shadow-2xs h-full p-2' : 'rounded-2xl shadow-xs h-full min-h-0 p-4'}`}>
        <div className={`flex flex-col justify-between shrink-0 ${compact ? 'lg:flex-row lg:items-center gap-1 mb-0.5' : 'gap-3 mb-3'}`}>
          <div>
            <h2 id="sales-title" className={`${compact ? 'text-[10px] uppercase tracking-wide' : 'text-base'} font-bold text-slate-800`}><Text>Sales Performance Trend</Text></h2>
            <p className={compact ? 'text-[8px] text-slate-400 mt-0.5 uppercase tracking-wide' : 'text-sm text-slate-500 mt-1'}><Text>Total profit company sales report periode </Text><Text>{range}</Text>.</p>
          </div>

          {/* KUMPULAN KONTROL FILTER */}
          <div className={compact ? 'flex items-center justify-between gap-1 mb-0.5 shrink-0' : 'flex flex-wrap items-center gap-2 shrink-0'}>
            {/* 1 DROPDOWN UTAMA */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPeriodOpen(!isPeriodOpen)}
                className={`${compact ? 'text-[9px] rounded-full py-1' : 'text-sm rounded-lg h-10'} bg-slate-50 font-semibold text-slate-700 border border-[#D9E2EC] px-3 cursor-pointer hover:bg-slate-100 transition-colors`}
              >
                <Text>{{
                  '3': 'Per 3 Bulan',
                  '6': 'Per 6 Bulan',
                  year: 'Per Tahun',
                  month: 'Per Bulan',
                  range: 'Rentang Tanggal'
                }[period]}</Text>
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
                      className={`${compact ? 'text-[9px]' : 'text-sm'} block w-full text-left px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100 transition-colors`}
                    >
                      <Text dynamic>{label}</Text>
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
                className={`${compact ? 'text-[9px] rounded-full py-1' : 'text-sm rounded-lg h-10'} bg-slate-50 font-semibold text-slate-700 border border-[#D9E2EC] px-3 focus:outline-none shadow-2xs cursor-pointer hover:bg-slate-100 transition-colors`}
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            )}

            {/* MUNCUL JIKA PILIH 'Per Bulan' */}
            {period === 'month' && (
              <LanguageInput
                type="month" 
                value={selectedMonth} 
                onChange={(event) => setSelectedMonth(event.target.value)} 
                className={`${compact ? 'text-[9px] rounded-full py-1' : 'text-sm rounded-lg h-10'} bg-slate-50 font-semibold text-slate-700 border border-[#D9E2EC] px-3 focus:outline-none shadow-2xs cursor-pointer`}
              />
            )}

            {/* MUNCUL JIKA PILIH 'Rentang Tanggal' */}
            {period === 'range' && (
              <div className={compact ? 'flex items-center gap-1' : 'flex flex-wrap items-center gap-2'}>
                <LanguageInput
                  type="date" 
                  aria-label="Tanggal mulai grafik"
                  aria-invalid={Boolean(startDate && endDate && rangeError)}
                  aria-describedby={rangeError ? 'sales-range-message' : undefined}
                  value={startDate} 
                  onChange={(event) => setStartDate(event.target.value)} 
                  className={`${compact ? 'text-[8px] rounded-full py-1' : 'text-sm rounded-lg h-10 min-w-0'} bg-slate-50 font-semibold text-slate-700 border border-[#D9E2EC] px-2 focus:outline-none shadow-2xs`}
                />
                <span className={`${compact ? 'text-[8px]' : 'text-sm'} text-slate-500`}><Text>s/d</Text></span>
                <LanguageInput
                  type="date" 
                  aria-label="Tanggal akhir grafik"
                  aria-invalid={Boolean(startDate && endDate && rangeError)}
                  aria-describedby={rangeError ? 'sales-range-message' : undefined}
                  value={endDate} 
                  onChange={(event) => setEndDate(event.target.value)} 
                  className={`${compact ? 'text-[8px] rounded-full py-1' : 'text-sm rounded-lg h-10 min-w-0'} bg-slate-50 font-semibold text-slate-700 border border-[#D9E2EC] px-2 focus:outline-none shadow-2xs`}
                />
              </div>
            )}
          </div>
        </div>

        <div className={`flex items-center justify-between mt-1 mb-1 ${compact ? 'text-[9px]' : 'flex-wrap gap-2 text-sm'} text-slate-500`}>
          <span><Text>Profit (dalam juta rupiah)</Text></span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-cyan-500" /><Text>Total Profit</Text></span>
        </div>

        <div className={`w-full ${compact ? fitHeight ? 'min-h-[100px] flex-1 my-1' : 'flex-1 min-h-[85px]' : 'h-56 sm:h-64 my-3 shrink-0'}`} role="group" aria-label={`Sales performance chart, ${range}`}>
          {chartLoading ? <p role="status"><Text>Memuat grafik...</Text></p> : chartError ? <p role="alert" className="text-sm text-red-600">{chartError}</p> : rangeError ? <p id="sales-range-message" role="status" className="text-xs text-slate-500">{rangeError}</p> : !data.length ? <p className="text-sm text-slate-500"><Text>Belum ada data grafik pada periode ini.</Text></p> : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart 
                data={data} 
                margin={compact ? { top: 5, right: 10, left: -25, bottom: 2 } : { top: 10, right: 20, left: 0, bottom: 5 }} 
                accessibilityLayer
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="month" tickFormatter={localizedMonth} tick={{ fontSize: compact ? 9 : 12, fill: '#64748B' }} tickMargin={compact ? 2 : 8} />
                <YAxis width={compact ? 70 : 80} tick={{ fontSize: compact ? 9 : 12, fill: '#64748B' }} tickFormatter={(value: number) => `Rp${value}M`} />
                <Tooltip labelFormatter={(label) => localizedMonth(String(label))} formatter={(value) => [currency.format(Number(value) * 1000000), t('Total Profit')]} />
                <Line type="monotone" dataKey="profit" name={t('Total Profit')} stroke="#06B6D4" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className={`border-t border-slate-100 ${compact ? 'pt-1 mt-1' : 'pt-3 mt-2'} shrink-0`} aria-live="polite">
          {!compact && <h3 className="text-xs font-bold text-slate-700 mb-1"><Text>Description</Text></h3>}
          <p className={`${compact ? 'text-[8px] truncate leading-tight' : 'text-sm leading-relaxed'} text-slate-500`}>
            <Text dynamic>{rangeError ? 'Grafik dan ringkasan profit menunggu rentang tanggal yang valid.' : growth === null ? 'Perbandingan pertumbuhan tersedia jika terdapat minimal dua bulan profit.' : `Total profit ${growth < 0 ? 'menurun' : growth > 0 ? 'meningkat' : 'berubah'} ${Math.abs(growth).toLocaleString('id-ID', { maximumFractionDigits: 1 })}% selama periode ${range}.`}</Text>
          </p>
        </div>
      {chartError && <button type="button" onClick={retry} className="mt-4 text-sm text-blue-600 cursor-pointer"><Text>Coba lagi</Text></button>}
    </div>
  );
}

function errorMessage(error: unknown) {
  return error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Koneksi database gagal.';
}
