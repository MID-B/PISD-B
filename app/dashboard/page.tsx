'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardShell from './dashboard-shell';
import { OutstandingPaymentsTable, DashboardOutstandingTable, useOutstandingPayments } from './outstanding-payments';
import { ResponsiveContainer, BarChart, Bar, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import SalesPerformanceTrend, { useSalesPerformanceTrend } from './sales-performance-trend';
import { useDashboardIssues, DashboardIssueTable } from './dashboard-issue-table';
import { supabase } from '@/lib/supabaseClient';
import { sourceKey } from './issue-board/board-model';
import { loadBoardIssues } from './issue-board/board-data';
import type { ViewIssue } from './issue-board/board-model';

function formatRupiah(num: number) {
  if (num >= 1_000_000_000) {
    return `Rp ${(num / 1_000_000_000).toFixed(2)} M`;
  } else if (num >= 1_000_000) {
    return `Rp ${(num / 1_000_000).toFixed(1)} jt`;
  }
  return `Rp ${num.toLocaleString('id-ID')}`;
}

const jobVacancies = [
  { id: 1, position: 'Cash Manager', department: 'CCR', quota: 2, status: 'Urgent' },
  { id: 2, position: 'Field Agent', department: 'CRM', quota: 1, status: 'Open' },
  { id: 3, position: 'Billing', department: 'CCR', quota: 1, status: 'Open' },
  { id: 4, position: 'Sales Executive', department: 'CRM', quota: 3, status: 'Urgent' },
  { id: 5, position: 'HR Manager', department: 'HRMS', quota: 2, status: 'Open' },
];

type ClientSalesRow = {
  customer_name: string | null;
  revenue: number | null;
  period_month: string | null;
};

function useTopPurchasingClients() {
  const [rows, setRows] = useState<ClientSalesRow[]>([]);
  const [period, setPeriod] = useState<string>('3'); // '3', '6', 'year', 'month', 'range'
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-05');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function fetchTopClients() {
      setLoading(true);
      setError('');
      try {
        const { data, error: err } = await supabase
          .from('c1_company_sales_staging_rows')
          .select('*');

        if (err) throw err;

        const mappedData = (data || []).map((item: any) => {
          let monthStr = null;
          if (item.period_month) {
            const raw = String(item.period_month).trim();
            // Menyimpan format tanggal lengkap (YYYY-MM-DD) jika tersedia, atau YYYY-MM
            monthStr = raw.length >= 10 ? raw.substring(0, 10) : raw;
          }

          return {
            customer_name: item.customer_name ? String(item.customer_name).trim() : 'Unknown Client',
            revenue: Number(item.revenue || 0),
            period_month: monthStr,
          };
        });

        setRows(mappedData);
      } catch (err: any) {
        console.error("Supabase Fetch Error:", err);
        setError('Gagal memuat data');
      } finally {
        setLoading(false);
      }
    }

    void fetchTopClients();
  }, []);

  const availableYears = Array.from(
    new Set(rows.map((r) => r.period_month?.slice(0, 4)).filter((y): y is string => Boolean(y)))
  ).sort().reverse();

  const latestMonth = rows.at(-1)?.period_month?.slice(0, 7);

  // Logika pemfilteran termasuk opsi Rentang Tanggal ('range')
  const filteredRows = rows.filter((r) => {
    if (!r.period_month) return false;
    const rowDate = r.period_month; // Format 'YYYY-MM-DD' atau 'YYYY-MM'
    const rowMonthOnly = rowDate.slice(0, 7);

    if (period === 'range') {
      if (!startDate || !endDate) return true;
      // Normalisasi perbandingan jika period_month hanya YYYY-MM
      const normalizedRowDate = rowDate.length === 7 ? `${rowDate}-01` : rowDate;
      return normalizedRowDate >= startDate && normalizedRowDate <= endDate;
    }
    if (period === 'year') return rowMonthOnly.slice(0, 4) === selectedYear;
    if (period === 'month') return rowMonthOnly === selectedMonth;

    // Preset 3 atau 6 Bulan terakhir
    const monthsCount = Number(period);
    const cutoff = latestMonth ? new Date(latestMonth + '-01') : new Date();
    cutoff.setMonth(cutoff.getMonth() - monthsCount + 1);
    const cutoffStr = cutoff.toISOString().slice(0, 7);

    return rowMonthOnly >= cutoffStr && rowMonthOnly <= (latestMonth || rowMonthOnly);
  });

  function cleanCompanyName(name: string): string {
    if (!name) return 'Unknown Client';
    let clean = name.trim();
    clean = clean.replace(/^(PT|CV|UD)\.\s*/i, '$1 ');
    const match = clean.match(/^(PT|CV|UD)?\s*([A-Za-z\s]+)/i);
    if (match && match[0].trim().length > 3) {
      clean = match[0].trim();
    }
    return clean;
  }

  const aggregatedMap = new Map<string, { client: string; revenue: number; orders: number }>();

  filteredRows.forEach((row) => {
    const rawName = row.customer_name ? String(row.customer_name).trim() : 'Unknown Client';
    const cleanedName = cleanCompanyName(rawName);
    const mapKey = cleanedName.toLowerCase();
    const rev = Number(row.revenue || 0);

    if (aggregatedMap.has(mapKey)) {
      const existing = aggregatedMap.get(mapKey)!;
      existing.revenue += rev;
      existing.orders += 1;
    } else {
      aggregatedMap.set(mapKey, {
        client: cleanedName,
        revenue: rev,
        orders: 1,
      });
    }
  });

  const top4Clients = Array.from(aggregatedMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 4);

  const chartData = top4Clients.map((item) => {
    // Ubah angka 8 menjadi 15 atau 18 agar nama klien lebih panjang terlihat
    const shortName = item.client.length > 40 
      ? item.client.substring(0, 40) + '...' 
      : item.client;

    return {
      client: shortName,
      fullName: item.client,
      revenue: Math.round(item.revenue / 1_000_000),
      orders: item.orders,
    };
  });

  return {
    chartData,
    top4Clients,
    period, setPeriod,
    selectedYear, setSelectedYear,
    selectedMonth, setSelectedMonth,
    startDate, setStartDate,
    endDate, setEndDate,
    availableYears,
    loading,
    error,
  };
}

export default function SalesPerformance() {
  const router = useRouter();
  const trend = useSalesPerformanceTrend();
  const outstanding = useOutstandingPayments(8); 
  const topClients = useTopPurchasingClients();
  const [totalEmployees, setTotalEmployees] = useState<number>(0);
  const [activeCustomers, setActiveCustomers] = useState<number>(0);
  const [dashboardIssues, setDashboardIssues] = useState<ViewIssue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState<boolean>(true);
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [totalProfitVal, setTotalProfitVal] = useState<number>(0);
  const [totalOutstandingVal, setTotalOutstandingVal] = useState<number>(0);
  const issueBoard = useDashboardIssues();

  const urgentCount = dashboardIssues.length;

  useEffect(() => {
    const controller = new AbortController();
    async function fetchWidgetIssues() {
      setIssuesLoading(true);
      try {
        const result = await loadBoardIssues(controller.signal);
        if (!controller.signal.aborted) {
          setDashboardIssues(result || []);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Gagal memuat issue widget:", err);
          setDashboardIssues([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIssuesLoading(false);
        }
      }
    }
    void fetchWidgetIssues();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        // if (sessionError || !session) {
        //   router.replace('/landing-page');
        //   return;
        // }

        const { data: empData, error: empErr } = await supabase
          .from('b2_register')
          .select('id'); // Ambil kolom kuncinya saja agar ringan

        if (empErr) {
          console.error("Error Fetch b2_register:", empErr.message);
        } else if (empData) {
          setTotalEmployees(empData.length); // Menghitung total baris secara akurat dari data yang diterima
        }

        const { count: custCount } = await supabase.from('a1_customers').select('*', { count: 'exact', head: true });
        if (custCount !== null) setActiveCustomers(custCount);

        // setIssuesLoading(true);
        // const { data: issueData, error: issueErr } = await supabase.from('b1_vw_universal_issue').select('*');
        // if (!issueErr && issueData) setDbIssues(issueData);

        const { data: profitData, error: profitError } = await supabase.from('b1_linechart').select('total_profit');
        if (!profitError && profitData) {
          const sumProfit = profitData.reduce((acc, row) => acc + Number(row.total_profit || 0), 0);
          setTotalProfitVal(sumProfit);
        }

        const { data: outData, error: outError } = await supabase
          .from('b1_outstanding')
          .select('outstanding_amount'); 

        if (!outError && outData) {
          const sumOut = outData.reduce((acc, row) => acc + Number(row.outstanding_amount || 0), 0);
          setTotalOutstandingVal(sumOut);
        }
      } catch (err) {
        console.error("Gagal mengambil data dashboard:", err);
      } finally {
        setIssuesLoading(false);
      }
    }

    void fetchDashboardData();
  }, [router]);

  // Menjamin pilihan CCR, CRM, dan HRMS selalu ada di dropdown
  const availableDepartments = Array.from(
    new Set([
      'CCR', 'CRM', 'HRMS',
      ...dashboardIssues.map((item: any) => sourceKey(item.source || item.department))
    ])
  ).filter((dept) => dept && dept !== 'UNKNOWN') as string[];

  // Filter baris untuk widget dashboard (dibatasi 5 baris teratas)
  const filteredIssues = dashboardIssues.filter((item: any) => {
    const itemDept = sourceKey(item.source || item.department);
    const matchDept = selectedDepartment === 'All' || itemDept === selectedDepartment.trim().toUpperCase();
    
    const rawPriority = item.priority ? String(item.priority).trim().toUpperCase() : '';
    let matchPriority = false;
    if (selectedPriority === 'All') matchPriority = true;
    else if (selectedPriority === 'High') matchPriority = rawPriority.includes('HIGH');
    else if (selectedPriority === 'Medium') matchPriority = rawPriority.includes('MEDIUM');
    else if (selectedPriority === 'Low') matchPriority = rawPriority.includes('LOW');
    else matchPriority = rawPriority === selectedPriority.toUpperCase();

    return matchDept && matchPriority;
  }).slice(0, 5);

  const [isTopClientsPeriodOpen, setIsTopClientsPeriodOpen] = useState(false);

  return (
    <DashboardShell activePage="dashboard">
      {/* Container helikopter mode CEO: Anti-scroll mutlak & background eksekutif */}
      <div className="flex flex-col gap-1.5 h-full min-h-0 max-h-full p-1 bg-slate-100/80 rounded-xl text-xs overflow-hidden select-none">
        
        {/* ========================================================================= */}
        {/* 1. BARIS ATAS: 5 KARTU METRIK UTAMA (Warna Gradasi Awal & Frame Ditinggikan) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 shrink-0">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 p-2.5 rounded-xl border border-emerald-200/60 shadow-2xs flex flex-col justify-between">
            <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wide">Total Profit</span>
            <span className="text-xs sm:text-sm font-extrabold text-emerald-900 mt-1 truncate">{formatRupiah(totalProfitVal)}</span>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100/60 p-2.5 rounded-xl border border-amber-200/60 shadow-2xs flex flex-col justify-between">
            <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wide">Outstanding Pay</span>
            <span className="text-xs sm:text-sm font-extrabold text-amber-900 mt-1 truncate">{formatRupiah(totalOutstandingVal)}</span>
          </div>

          <div className="bg-gradient-to-br from-rose-50 to-rose-100/60 p-2.5 rounded-xl border border-rose-200/60 shadow-2xs flex flex-col justify-between">
            <span className="text-[9px] font-bold text-rose-700 uppercase tracking-wide">Urgent Issues</span>
            <span className="text-xs sm:text-sm font-extrabold text-rose-900 mt-1 truncate">{urgentCount} Issue</span>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100/60 p-2.5 rounded-xl border border-blue-200/60 shadow-2xs flex flex-col justify-between">
            <span className="text-[9px] font-bold text-blue-700 uppercase tracking-wide">Active Customers</span>
            <span className="text-xs sm:text-sm font-extrabold text-blue-900 mt-1 truncate">{activeCustomers} Klien</span>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100/60 p-2.5 rounded-xl border border-purple-200/60 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
            <span className="text-[9px] font-bold text-purple-700 uppercase tracking-wide">Total Employees</span>
            <span className="text-xs sm:text-sm font-extrabold text-purple-900 mt-1 truncate">{totalEmployees} Orang</span>
          </div>
        </div>

        {/* 2. LAYOUT UTAMA 2 KOLOM (PROPORTIONAL & SINGLE-SCREEN FIT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-1 flex-1 min-h-0 items-stretch overflow-hidden">
          {/* KOLOM KIRI (LEBAR 6/12): GRAFIK DASHBOARD UTAMA */}
          <div className="lg:col-span-6 flex flex-col gap-1 min-h-0 overflow-hidden">
            
            {/* Sales Performance Trend (Presisi Margin agar Garis & Bulan Mei-Jul Tidak Terpotong) */}
            <div className="bg-white p-2 rounded-xl shadow-2xs border border-slate-200/80 flex flex-col flex-1 min-h-0 justify-between overflow-hidden [&_.p-6]:!p-0 [&_.mb-4]:!mb-0 [&_.h-72]:!h-[120px] [&_h3]:!text-[10px] [&_p]:!text-[8px]">
              <div className="w-full h-full flex flex-col justify-between overflow-hidden">
                <SalesPerformanceTrend model={trend} />
              </div>
            </div>

            {/* Top Purchasing Clients (Grafik Batang Kompak) */}
            <div className="bg-white p-2.5 rounded-xl shadow-2xs border border-slate-200/80 flex flex-col flex-1 min-h-0 justify-between">
              <div className="flex flex-wrap items-center justify-between gap-1 mb-0.5 shrink-0">
                <h2 className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">Top Purchasing Clients</h2>
                
                {/* KUMPULAN KONTROL FILTER (Kecil, Kustom Dropdown, & Hover #C3C6D7) */}
                <div className="flex flex-wrap items-center gap-1">            
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsTopClientsPeriodOpen(!isTopClientsPeriodOpen)}
                      className="bg-white text-[9px] font-bold text-slate-700 border border-[#D9E2EC] rounded-full px-3 py-1 cursor-pointer hover:bg-[#C3C6D7] transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <span>
                        {{
                          '3': 'Per 3 Bulan',
                          '6': 'Per 6 Bulan',
                          year: 'Per Tahun',
                          month: 'Per Bulan',
                          range: 'Rentang Tanggal'
                        }[topClients.period]}
                      </span>
                      <span className="text-[8px]">▾</span>
                    </button>

                    {isTopClientsPeriodOpen && (
                      <div className="absolute right-0 top-full mt-1 z-50 min-w-full bg-white border border-[#D9E2EC] rounded-xl shadow-md overflow-hidden py-1">
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
                              topClients.setPeriod(value);
                              setIsTopClientsPeriodOpen(false);
                            }}
                            className="block w-full text-left px-3 py-2 text-[9px] font-bold text-slate-700 hover:bg-[#C3C6D7] transition-colors cursor-pointer"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Filter Tahun */}
                  {topClients.period === 'year' && (
                    <select
                      value={topClients.selectedYear}
                      onChange={(e) => topClients.setSelectedYear(e.target.value)}
                      className="bg-white text-[9px] font-bold text-slate-700 border border-[#D9E2EC] rounded-full px-3 py-1 focus:outline-none shadow-2xs cursor-pointer hover:bg-[#C3C6D7] transition-colors"
                    >
                      {topClients.availableYears.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  )}

                  {/* Filter Bulan */}
                  {topClients.period === 'month' && (
                    <input
                      type="month"
                      value={topClients.selectedMonth}
                      onChange={(e) => topClients.setSelectedMonth(e.target.value)}
                      className="bg-white text-[9px] font-bold text-slate-700 border border-[#D9E2EC] rounded-full px-3 py-1 focus:outline-none shadow-2xs cursor-pointer"
                    />
                  )}

                  {/* Filter Rentang Tanggal */}
                  {topClients.period === 'range' && (
                    <div className="flex items-center gap-1">
                      <input
                        type="date"
                        value={topClients.startDate}
                        onChange={(e) => topClients.setStartDate(e.target.value)}
                        className="bg-white text-[8px] font-bold text-slate-700 border border-[#D9E2EC] rounded-full px-2.5 py-1 focus:outline-none shadow-2xs cursor-pointer"
                      />
                      <span className="text-[8px] text-slate-500">s/d</span>
                      <input
                        type="date"
                        value={topClients.endDate}
                        onChange={(e) => topClients.setEndDate(e.target.value)}
                        className="bg-white text-[8px] font-bold text-slate-700 border border-[#D9E2EC] rounded-full px-2.5 py-1 focus:outline-none shadow-2xs cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>

              {topClients.loading ? (
                <p className="text-[9px] text-slate-400 py-2 text-center">Memuat...</p>
              ) : topClients.error ? (
                <p className="text-[9px] text-rose-500 py-2 text-center">{topClients.error}</p>
              ) : topClients.chartData.length === 0 ? (
                <p className="text-[9px] text-slate-400 py-2 text-center">Tidak ada data.</p>
              ) : (
                <div className="min-w-0 w-full flex-1 min-h-[90px]">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={topClients.chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }} barGap={3}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="client" tick={{ fontSize: 8, fill: '#64748B' }} interval={0} />
                      <YAxis tick={{ fontSize: 9, fill: '#64748B' }} />
                      <Tooltip
                        formatter={(val: unknown, name: unknown) => [
                          name === 'revenue' ? `Rp ${String(val)}M` : `${String(val)} Pesanan`,
                          String(name) === 'revenue' ? 'Revenue' : 'Orders'
                        ]}
                        labelFormatter={(label, items) => items?.[0]?.payload?.fullName || label}
                      />
                      <Bar dataKey="revenue" fill="#7C4FE8" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="orders" fill="#2ED3CF" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* KOLOM KANAN (LEBAR 6/12): TABEL-TABEL DATA OPERASIONAL (LEBIH RAPI & RENGGANG) */}
          <div className="lg:col-span-6 flex flex-col gap-1 flex-1 min-h-0 overflow-hidden">
            
            {/* 1. Outstanding Payments */}
            <div className="bg-white p-2 rounded-xl shadow-2xs border border-[#D9E2EC] flex-1 min-h-0 overflow-hidden [&_.p-6]:!p-0 [&_.mb-4]:!mb-0.5 [&_table]:!text-[9px] [&_th]:!py-1 [&_td]:!py-0.5">
              {/* Header dengan tombol pill biru */}
              <div className="mb-1 flex items-center justify-between shrink-0 pr-1">
                <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">Outstanding Payments</h3>
                <Link 
                  href="/dashboard/sales-performance" 
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#3B6FF5] hover:bg-[#315be0] text-white rounded-full text-[9px] font-bold shadow-2xs transition-colors"
                >
                  <svg className="w-3 h-3 fill-none stroke-current stroke-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 3v18" />
                  </svg>
                  Lihat Semua
                </Link>
              </div>
              <div className="w-full overflow-hidden">
                <DashboardOutstandingTable rows={outstanding.rows} tableLoading={outstanding.tableLoading} tableError={outstanding.tableError} />
              </div>
            </div>

            {/* 2. Issue Board */}
            <div className="bg-white p-2 rounded-xl shadow-2xs border border-[#D9E2EC] flex-1 min-h-0 overflow-hidden">
              <DashboardIssueTable
                issues={issueBoard.issues}
                loading={issueBoard.loading}
                error={issueBoard.error}
              />
            </div>

          
            {/* 3. Require Employee & Open Positions (Disamakan persis dengan Issue Board) */}
              <div className="bg-white p-2 rounded-xl shadow-2xs border border-[#D9E2EC] flex-1 min-h-0 overflow-hidden">
                <div className="mb-1.5 flex items-center justify-between pr-1.5">
                  <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">Require Employee & Open Positions</h2>
                  <Link 
                    href="/dashboard/job-vacancies" 
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#3B6FF5] hover:bg-[#315be0] text-white rounded-full text-[9px] font-bold shadow-2xs transition-colors"
                  >
                    <svg className="w-3 h-3 fill-none stroke-current stroke-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18M9 3v18" />
                    </svg>
                    Lihat Semua
                  </Link>
                </div>

              <div className="w-full overflow-hidden">
                <table className="w-full text-left border-collapse table-fixed">
                  <colgroup>
                    <col className="w-[40%]" />
                    <col className="w-[22%]" />
                    <col className="w-[18%]" />
                    <col className="w-[20%]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-violet-50/80 border-b border-slate-100 text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
                      <th className="py-1.5 px-1.5 truncate">Position</th>
                      <th className="py-1.5 px-1.5 truncate">Department</th>
                      <th className="py-1.5 px-1.5 truncate">Quota</th>
                      <th className="py-1.5 px-1.5 truncate">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[9px] text-slate-700 bg-white">
                    {jobVacancies.slice(0, 5).map((job) => {
                      const isUrgent = job.status === 'Urgent';
                      // Menggunakan titik indikator warna (merah untuk Urgent, biru/hijau untuk Open)
                      const statusDotColor = isUrgent ? '#E11D48' : '#0284C7';

                      return (
                        <tr key={job.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-1 px-1.5 font-semibold text-slate-800 truncate" title={job.position}>
                            {job.position}
                          </td>
                          <td className="py-1 px-1.5 text-slate-600 truncate">
                            {job.department}
                          </td>
                          <td className="py-1 px-1.5 font-bold text-purple-700 truncate">
                            {job.quota} Orang
                          </td>
                          <td className="py-1 px-1.5 truncate">
                            <span className="inline-flex items-center gap-1">
                              <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: statusDotColor }} />
                              <span className="truncate font-medium text-slate-700" title={job.status}>
                                {job.status}
                              </span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  ); 
}
