'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardShell from './dashboard-shell';
import { OutstandingPaymentsTable, useOutstandingPayments } from './outstanding-payments';
import { ResponsiveContainer, BarChart, Bar, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import SalesPerformanceTrend, { useSalesPerformanceTrend } from './sales-performance-trend';
import { supabase } from '@/lib/supabaseClient';

function formatRupiah(num: number) {
  if (num >= 1_000_000_000) {
    return `Rp ${(num / 1_000_000_000).toFixed(2)} B`;
  } else if (num >= 1_000_000) {
    return `Rp ${(num / 1_000_000).toFixed(1)} M`;
  }
  return `Rp ${num.toLocaleString('id-ID')}`;
}

const jobVacancies = [
  { id: 1, position: 'Senior Logistics Coordinator', department: 'Logistik', quota: 2, status: 'Urgent' },
  { id: 2, position: 'Fullstack Web Developer', department: 'IT', quota: 1, status: 'Open' },
  { id: 3, position: 'Tax & Accounting Specialist', department: 'Finance', quota: 1, status: 'Open' },
  { id: 4, position: 'Key Account Executive', department: 'Commercial', quota: 3, status: 'Urgent' },
  { id: 5, position: 'Warehouse Operations Lead', department: 'Logistik', quota: 2, status: 'Open' },
];

type ClientSalesRow = {
  customer_name: string | null;
  revenue: number | null;
  period_month: string | null;
};

function useTopPurchasingClients() {
  const [rows, setRows] = useState<ClientSalesRow[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
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
            monthStr = raw.length >= 7 ? raw.substring(0, 7) : raw;
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

  const availableMonths = Array.from(
    new Set(rows.map((r) => r.period_month).filter((m): m is string => Boolean(m)))
  ).sort().reverse();

  const filteredRows = selectedMonth === 'all' 
    ? rows 
    : rows.filter((r) => r.period_month === selectedMonth); 

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
    const shortName = item.client.length > 8 
      ? item.client.substring(0, 8) + '...' 
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
    availableMonths,
    selectedMonth,
    setSelectedMonth,
    loading,
    error,
  };
}

export default function SalesPerformance() {
  const router = useRouter();
  const trend = useSalesPerformanceTrend();
  const outstanding = useOutstandingPayments(3); 
  const topClients = useTopPurchasingClients();
  const [totalEmployees, setTotalEmployees] = useState<number>(0);
  const [activeCustomers, setActiveCustomers] = useState<number>(0);
  const [dbIssues, setDbIssues] = useState<any[]>([]);
  const [issuesLoading, setIssuesLoading] = useState<boolean>(true);
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [totalProfitVal, setTotalProfitVal] = useState<number>(0);
  const [totalOutstandingVal, setTotalOutstandingVal] = useState<number>(0);

  const urgentCount = dbIssues.filter(
    (item) => item.status === 'Urgent' || (item.priority && item.priority === 'Urgent')
  ).length;

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          router.replace('/landing-page');
          return;
        }

        const { count: empCount } = await supabase.from('d3_employee').select('*', { count: 'exact', head: true });
        if (empCount !== null) setTotalEmployees(empCount);

        const { count: custCount } = await supabase.from('a1_company_list').select('*', { count: 'exact', head: true });
        if (custCount !== null) setActiveCustomers(custCount);

        setIssuesLoading(true);
        const { data: issueData, error: issueErr } = await supabase.from('b1_vw_universal_issue').select('*');
        if (!issueErr && issueData) setDbIssues(issueData);

        const { data: profitData, error: profitError } = await supabase.from('b1_linechart').select('total_profit');
        if (!profitError && profitData) {
          const sumProfit = profitData.reduce((acc, row) => acc + Number(row.total_profit || 0), 0);
          setTotalProfitVal(sumProfit);
        }

        const { data: outData, error: outError } = await supabase.from('c1_company_sales_staging_rows').select('revenue');
        if (!outError && outData) {
          const sumOut = outData.reduce((acc, row) => acc + Number(row.revenue || 0), 0);
          setTotalOutstandingVal(sumOut * 0.25);
        }
      } catch (err) {
        console.error("Gagal mengambil data dashboard:", err);
      } finally {
        setIssuesLoading(false);
      }
    }

    void fetchDashboardData();
  }, [router]);

  const availableDepartments = Array.from(
    new Set(dbIssues.map((item) => item.source || item.department || item.reporter_department).filter(Boolean))
  );

  const filteredIssues = dbIssues.filter((item) => {
    const itemDept = item.source || item.department || item.reporter_department || '';
    const matchDept = selectedDepartment === 'All' || itemDept === selectedDepartment;
    const rawPriority = item.priority ? String(item.priority).trim() : '';
    const isUnspecified = !rawPriority || rawPriority === '-';

    let matchPriority = false;
    if (selectedPriority === 'All') matchPriority = true;
    else if (selectedPriority === 'Unspecified') matchPriority = isUnspecified;
    else matchPriority = rawPriority.toLowerCase() === selectedPriority.toLowerCase();

    return matchDept && matchPriority;
  }).slice(0, 5);

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
              <div className="flex items-center justify-between gap-1 mb-0.5 shrink-0">
                <h2 className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">Top Purchasing Clients</h2>
                <select
                  value={topClients.selectedMonth}
                  onChange={(e) => topClients.setSelectedMonth(e.target.value)}
                  className="bg-slate-50 text-[8px] font-semibold text-slate-700 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none"
                >
                  <option value="all">Semua Bulan</option>
                  {topClients.availableMonths.map((m) => (
                    <option key={m} value={m!}>
                      {new Date(m! + 'T00:00:00').toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                    </option>
                  ))}
                </select>
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
                      <XAxis dataKey="client" tick={{ fontSize: 9, fill: '#64748B' }} />
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
            
            {/* 1. Outstanding Payments (Padding diperlonggar & baris ditambah jadi 4 data) */}
            <div className="bg-white p-2 rounded-xl shadow-2xs border border-slate-200/85 flex-1 min-h-0 overflow-hidden [&_.p-6]:!p-0 [&_.mb-4]:!mb-0.5 [&_table]:!text-[9px] [&_th]:!py-1 [&_td]:!py-0.5">
              <div className="mb-1 flex items-center justify-between shrink-0">
                <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">Outstanding Payments</h3>
                <Link href="/dashboard/sales-performance" className="text-[9px] font-semibold text-violet-600 hover:underline">Lihat semua</Link>
              </div>
              <div className="w-full overflow-hidden">
                <OutstandingPaymentsTable rows={outstanding.rows} tableLoading={outstanding.tableLoading} tableError={outstanding.tableError} />
              </div>
            </div>

            {/* 2. Issue Board (Padding diperlonggar, ditambah jadi 6 baris agar rapat rapi tanpa celah kosong) */}
            <div className="bg-white p-2 rounded-xl shadow-2xs border border-slate-200/85 flex-1 min-h-0 overflow-hidden">
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                  <Link href="/dashboard/issue-board" className="hover:text-violet-600">Issue Board</Link>
                </h2>
                <div className="flex items-center gap-1">
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="bg-slate-50 text-[9px] font-semibold text-slate-700 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none"
                  >
                    <option value="All">Dept</option>
                    {availableDepartments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="bg-slate-50 text-[9px] font-semibold text-slate-700 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none"
                  >
                    <option value="All">Priority</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                  </select>
                </div>
              </div>

              <div className="w-full overflow-hidden">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="bg-violet-50/80 border-b border-slate-100 text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
                      <th className="py-1.5 px-1.5 w-[22%]">Dept</th>
                      <th className="py-1.5 px-1.5 w-[42%]">Issue</th>
                      <th className="py-1.5 px-1.5 w-[22%]">PIC</th>
                      <th className="py-1.5 px-1.5 w-[14%]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[9px] text-slate-700">
                    {issuesLoading ? (
                      <tr>
                        <td colSpan={4} className="py-1 px-1.5 text-center text-slate-400">Memuat...</td>
                      </tr>
                    ) : filteredIssues.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-1 px-1.5 text-center text-slate-400">Tidak ada isu</td>
                      </tr>
                    ) : (
                      filteredIssues.slice(0, 5).map((issue, idx) => (
                        <tr key={issue.id || idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-1 px-1.5 font-semibold text-slate-800 truncate">{issue.source || issue.department || '-'}</td>
                          <td className="py-1 px-1.5 truncate" title={issue.issue || issue.title}>{issue.issue || issue.title || '-'}</td>
                          <td className="py-1 px-1.5 truncate text-slate-500">{issue.pic || issue.employee_name || '-'}</td>
                          <td className="py-1 px-1.5 truncate font-bold text-purple-600">{issue.status || 'Open'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          {/* 3. Require Employee & Open Positions (Padding & ukuran font disesuaikan agar tidak kepotong) */}
          <div className="bg-white p-2 rounded-xl shadow-2xs border border-slate-200/85 flex-1 min-h-0 overflow-hidden">
            <div className="mb-0.5">
              <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">Require Employee & Open Positions</h2>
            </div>

            <div className="w-full overflow-hidden">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[9px] uppercase tracking-wider text-slate-600 font-semibold">
                    <th className="py-0.5 px-1.5 w-[45%]">Posisi Jabatan</th>
                    <th className="py-0.5 px-1.5 w-[25%]">Dept</th>
                    <th className="py-0.5 px-1.5 w-[15%]">Quota</th>
                    <th className="py-0.5 px-1.5 w-[15%]">Status</th>
                  </tr>
                </thead>
                <tbody className="text-[10px] text-slate-800 divide-y divide-slate-100">
                  {jobVacancies.slice(0, 5).map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-0.5 px-1.5 font-semibold text-slate-900 truncate" title={job.position}>{job.position}</td>
                      <td className="py-0.5 px-1.5 text-slate-600 truncate">{job.department}</td>
                      <td className="py-0.5 px-1.5 font-bold text-purple-700 truncate">{job.quota} Org</td>
                      <td className="py-0.5 px-1.5 truncate">
                        <span className={`inline-flex px-1 py-0.2 rounded text-[9px] font-bold border ${
                          job.status === 'Urgent' ? 'text-rose-600 bg-rose-50 border-rose-200' : 'text-blue-600 bg-blue-50 border-blue-200'
                        }`}>
                          {job.status}
                        </span>
                      </td>
                    </tr>
                  ))}
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