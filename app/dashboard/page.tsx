'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react'
import DashboardShell from './dashboard-shell';
import { OutstandingPaymentsTable, useOutstandingPayments } from './outstanding-payments';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import SalesPerformanceTrend, { useSalesPerformanceTrend } from './sales-performance-trend';
import { issues, issueDateFormatter, type IssueStatus } from './issue-board/issue-data';
import { supabase } from '@/lib/supabaseClient';

function formatRupiah(num: number) {
  if (num >= 1_000_000_000) {
    return `Rp ${(num / 1_000_000_000).toFixed(2)} B`;
  } else if (num >= 1_000_000) {
    return `Rp ${(num / 1_000_000).toFixed(1)} M`;
  }
  return `Rp ${num.toLocaleString('id-ID')}`;
}

const issueBadgeClasses: Record<IssueStatus, string> = {
  'In Progress': 'text-blue-600 bg-blue-50 border-blue-200',
  Open: 'text-amber-600 bg-amber-50 border-amber-200',
  Pending: 'text-violet-600 bg-violet-50 border-violet-200',
  Done: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  'To Do': 'text-slate-600 bg-slate-50 border-slate-200',
};

// Data Dummy untuk Lowongan Karyawan (Require Employee)
const jobVacancies = [
  { id: 1, position: 'Senior Logistics Coordinator', department: 'Logistik / CCR', quota: 2, deadline: '2026-05-30', status: 'Urgent' },
  { id: 2, position: 'Fullstack Web Developer', department: 'IT / SMKI', quota: 1, deadline: '2026-06-15', status: 'Open' },
  { id: 3, position: 'Tax & Accounting Specialist', department: 'Finance & Tax', quota: 1, deadline: '2026-06-10', status: 'Open' },
  { id: 4, position: 'Key Account Executive', department: 'Commercial / CRM', quota: 3, deadline: '2026-05-25', status: 'Urgent' },
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
        console.log("URL SUPABASE YANG AKTIF:", process.env.NEXT_PUBLIC_SUPABASE_URL);
        const { data, error: err } = await supabase
          .from('c1_company_sales_staging_rows')
          .select('*');

        console.log("CEK SEMUA DATA:", data);
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
        setError('Gagal memuat data: ' + (err.message || 'Kesalahan database'));
      } finally {
        setLoading(false);
      }
    }

    void fetchTopClients();
  }, []);

  const availableMonths = Array.from(
    new Set(rows.map((r) => r.period_month).filter((m): m is string => Boolean(m)))
  ).sort().reverse();

  // PERUBAHAN DI SINI: Filter baris data berdasarkan bulan yang dipilih
  const filteredRows = selectedMonth === 'all' 
    ? rows 
    : rows.filter((r) => r.period_month === selectedMonth); 

  function cleanCompanyName(name: string): string {
    if (!name) return 'Unknown Client';
    
    let clean = name.trim();
    
    // Hilangkan titik setelah PT / CV (contoh: "PT. YOSSAVA" -> "PT YOSSAVA")
    clean = clean.replace(/^(PT|CV|UD)\.\s*/i, '$1 ');

    // Ambil hanya nama perusahaan utamanya saja (potong jika ada pola angka resi/invoice seperti "816-0195...")
    // Mengambil kata dari awal sampai sebelum deretan angka transaksi
    const match = clean.match(/^(PT|CV|UD)?\s*([A-Za-z\s]+)/i);
    if (match && match[0].trim().length > 3) {
      clean = match[0].trim();
    }

    return clean;
  }

  const aggregatedMap = new Map<string, { client: string; revenue: number; orders: number }>();

  filteredRows.forEach((row) => {
    const rawName = row.customer_name ? String(row.customer_name).trim() : 'Unknown Client';
    const cleanedName = cleanCompanyName(rawName); // "PT YOSSAVA GLOBAL"
    const mapKey = cleanedName.toLowerCase();
    const rev = Number(row.revenue || 0);

    if (aggregatedMap.has(mapKey)) {
      const existing = aggregatedMap.get(mapKey)!;
      existing.revenue += rev;
      existing.orders += 1;
    } else {
      aggregatedMap.set(mapKey, {
        client: cleanedName, // Nama rapi tanpa nomor resi/invoice
        revenue: rev,
        orders: 1,
      });
    }
  });

  const top4Clients = Array.from(aggregatedMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 4);

  const chartData = top4Clients.map((item) => {
    // Nama pendek untuk sumbu X grafik (misal maksimal 12 karakter)
    const shortName = item.client.length > 12 
      ? item.client.substring(0, 12) + '...' 
      : item.client;

    return {
      client: shortName,      // Ditampilkan di sumbu X (terpotong rapi)
      fullName: item.client,  // Nama utuh untuk tooltip
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
  const trend = useSalesPerformanceTrend();
  const outstanding = useOutstandingPayments(5);
  const dashboardIssues = issues.slice(0, 5);
  const topClients = useTopPurchasingClients();
  const [totalEmployees, setTotalEmployees] = useState<number>(0);
  const [activeCustomers, setActiveCustomers] = useState<number>(0);
  const [dbIssues, setDbIssues] = useState<any[]>([]);
  const [issuesLoading, setIssuesLoading] = useState<boolean>(true);
  const urgentCount = dbIssues.filter(
    (item) => item.status === 'Urgent' || (item.priority && item.priority === 'Urgent')
  ).length;
  const [totalProfitVal, setTotalProfitVal] = useState<number>(0);
const [totalOutstandingVal, setTotalOutstandingVal] = useState<number>(0);

useEffect(() => {
    const getLocalDateString = () => {
      const now = new Date();
      return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    };

    const initialDate = getLocalDateString();

    const interval = setInterval(() => {
      const currentDate = getLocalDateString();
      if (currentDate !== initialDate) {
        clearInterval(interval);
        supabase.auth.signOut();
        window.location.href = "/login";
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);
  
useEffect(() => {
    async function fetchDashboardData() {
      try {
        const { count: empCount } = await supabase
          .from('d3_employee') 
          .select('*', { count: 'exact', head: true });
        if (empCount !== null) setTotalEmployees(empCount);

        const { count: custCount } = await supabase
          .from('a1_company_list') 
          .select('*', { count: 'exact', head: true });
        if (custCount !== null) setActiveCustomers(custCount);

        setIssuesLoading(true);
        const { data: issueData, error: issueErr } = await supabase
          .from('b1_issue_board') 
          .select('*')
          .limit(5);

        if (!issueErr && issueData && issueData.length > 0) {
          setDbIssues(issueData);
        } else {
          setDbIssues(issues.slice(0, 5));
        }

        const { data: profitData, error: profitError } = await supabase
          .from('b1_linechart')
          .select('total_profit');

        if (!profitError && profitData) {
          const sumProfit = profitData.reduce((acc, row) => acc + Number(row.total_profit || 0), 0);
          setTotalProfitVal(sumProfit);
        }

        const { data: outData, error: outError } = await supabase
          .from('c1_company_sales_staging_rows')
          .select('revenue');

        if (!outError && outData) {
          const sumOut = outData.reduce((acc, row) => acc + Number(row.revenue || 0), 0);
          setTotalOutstandingVal(sumOut * 0.25);
        }
      } catch (err) {
        console.error("Gagal mengambil data dashboard:", err);
        setDbIssues(issues.slice(0, 5));
      } finally {
        setIssuesLoading(false);
      }
    }

    void fetchDashboardData();
  }, []);
  
  
  return (
  <DashboardShell activePage="dashboard">
    {/* PEMBUNGKUS 5 KARTU (PASTIKAN GRID INI MEMBUNGKUS SELURUH 5 KARTU) */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
      
      {/* Kartu 1: Total Profit */}
      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 p-4 rounded-xl border border-emerald-200/60 shadow-sm flex flex-col justify-between">
        <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Total Profit</span>
        <div className="mt-2">
          <span className="text-xl sm:text-2xl font-extrabold text-emerald-900">
            {formatRupiah(totalProfitVal)}
          </span>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Akumulasi dari laporan sales</p>
        </div>
      </div>

      {/* Kartu 2: Outstanding Pay */}
      <div className="bg-gradient-to-br from-amber-50 to-amber-100/60 p-4 rounded-xl border border-amber-200/60 shadow-sm flex flex-col justify-between">
        <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">Outstanding Pay</span>
        <div className="mt-2">
          <span className="text-xl sm:text-2xl font-extrabold text-amber-900">
            {formatRupiah(totalOutstandingVal)}
          </span>
          <p className="text-[10px] text-amber-600 font-medium mt-0.5">Perlu follow-up penagihan</p>
        </div>
      </div>

      {/* Kartu 3: Urgent Issues */}
      <div className="bg-gradient-to-br from-rose-50 to-rose-100/60 p-4 rounded-xl border border-rose-200/60 shadow-sm flex flex-col justify-between">
        <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wide">Urgent Issues</span>
        <div className="mt-2">
          <span className="text-xl sm:text-2xl font-extrabold text-rose-900">
            {urgentCount} Issue
          </span>
          <p className="text-[10px] text-rose-600 font-medium mt-0.5">Membutuhkan tindakan cepat</p>
        </div>
      </div>

      {/* Kartu 4: Active Customers */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100/60 p-4 rounded-xl border border-blue-200/60 shadow-sm flex flex-col justify-between">
        <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">Active Customers</span>
        <div className="mt-2">
          <span className="text-xl sm:text-2xl font-extrabold text-blue-900">
            {activeCustomers} Klien
          </span>
          <p className="text-[10px] text-blue-600 font-medium mt-0.5">Logistik & Korporat Aktif</p>
        </div>
      </div>

      {/* Kartu 5: Total Employees */}
      <div className="bg-gradient-to-br from-purple-50 to-purple-100/60 p-4 rounded-xl border border-purple-200/60 shadow-sm flex flex-col justify-between">
        <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wide">Total Employees</span>
        <div className="mt-2">
          <span className="text-xl sm:text-2xl font-extrabold text-purple-900">
            {totalEmployees} Orang
          </span>
          <p className="text-[10px] text-purple-600 font-medium mt-0.5">Tersebar di seluruh cabang</p>
        </div>
      </div>

    </div>

      {/* KONTEN UTAMA: Setiap bagian diberi frame (bg-white / bg-[#E9EAF1] dengan border & shadow yang seragam dan ukuran diperbesar) */}
      <div className="space-y-6 pb-10">
        
        {/* 1. Sales Performance Trend Frame */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
          <SalesPerformanceTrend model={trend} />
        </div>

        {/* 2. Outstanding Payments Frame */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Outstanding Payments (IDR)</h3>
            <Link href="/dashboard/sales-performance" className="text-xs font-semibold text-violet-600 hover:underline">Lihat semua</Link>
          </div>
          <OutstandingPaymentsTable rows={outstanding.rows} tableLoading={outstanding.tableLoading} tableError={outstanding.tableError} />
        </div>

        {/* 3. ISSUE BOARD (Tanpa kotak abu-abu di dalamnya, tampil bersih polos) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                <Link href="/dashboard/issue-board" className="hover:text-violet-600">Issue Board</Link>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Daftar Pemantauan isu operasional departemen &amp; logistik</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left border-collapse">
              <thead>
                <tr className="bg-violet-50/70 border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3 font-semibold">Departemen</th>
                  <th className="py-3 px-3 font-semibold">Issue</th>
                  <th className="py-3 px-3 font-semibold">Date</th>
                  <th className="py-3 px-3 font-semibold">PIC</th>
                  <th className="py-3 px-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {issuesLoading ? (
                  <tr>
                    <td colSpan={5} className="py-4 px-3 text-center text-slate-400">Memuat data issue...</td>
                  </tr>
                ) : dbIssues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-3 font-medium">{issue.reporter_department || issue.department || '-'}</td>
                    <td className="py-4 px-3">{issue.title || '-'}</td>
                    <td className="py-4 px-3 whitespace-nowrap">
                      {issue.created_at ? issueDateFormatter.format(new Date(issue.created_at)) : '-'}
                    </td>
                    <td className="py-4 px-3 whitespace-nowrap">{issue.employee_id || issue.pic || '-'}</td>
                    <td className="py-4 px-3 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold border ${issueBadgeClasses[issue.status as IssueStatus] || 'text-slate-600 bg-slate-50 border-slate-200'}`}>
                        ● {issue.status || 'Open'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Top Purchasing Clients Frame (Grafik dan Leaderboard diperbesar drastis) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 id="top-purchasing-title" className="text-base font-bold text-slate-800">Top Purchasing Clients</h2>
              <p className="text-xs text-slate-500 mt-0.5">Analisis Pembelian terbesar berdasarkan pendapatan | Dalam Juta Rp | Volume pesanan</p>
            </div>
            {/* Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Periode:</span>
              <select
                value={topClients.selectedMonth}
                onChange={(e) => topClients.setSelectedMonth(e.target.value)}
                className="bg-white text-xs font-medium text-slate-700 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
              >
                <option value="all">Semua Bulan</option>
                {topClients.availableMonths.map((m) => (
                  <option key={m} value={m!}>
                    {new Date(m! + 'T00:00:00').toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {topClients.loading ? (
            <p className="text-sm text-slate-500 py-6">Memuat data top clients...</p>
          ) : topClients.error ? (
            <p className="text-sm text-rose-500 py-6">{topClients.error}</p>
          ) : topClients.chartData.length === 0 ? (
            <p className="text-sm text-slate-500 py-6">Tidak ada data transaksi pada periode ini.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 items-center">
              {/* TAMBAHKAN min-w-0 DI SINI */}
              <div className="min-w-0 w-full">
                <div className="h-80 w-full">
                  {/* TAMBAHKAN minWidth={0} DI RESPONSIVE CONTAINER */}
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={topClients.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }} barGap={8}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="client" tick={{ fontSize: 11, fill: '#334155' }} tickMargin={8} />
                      <YAxis tick={{ fontSize: 12, fill: '#334155' }} width={50} />
                      <Tooltip
                        formatter={(val: unknown, name: unknown, item: any) => [
                          name === 'revenue' ? `Rp ${String(val)}M` : `${String(val)} Pesanan`,
                          String(name) === 'revenue' ? 'Revenue' : 'Total Orders'
                        ]}
                        labelFormatter={(label, items) => {
                          // Mengambil fullName dari data payload saat di-hover
                          const currentData = items?.[0]?.payload;
                          return currentData ? currentData.fullName : label;
                        }}
                      />
                      <Bar dataKey="revenue" fill="#7C4FE8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="orders" fill="#2ED3CF" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 text-sm text-slate-700 font-medium mt-4">
                  <span><i className="inline-block w-3.5 h-3.5 rounded-sm bg-[#7C4FE8] mr-2 align-middle" />Revenue (IDR Juta)</span>
                  <span><i className="inline-block w-3.5 h-3.5 rounded-sm bg-[#2ED3CF] mr-2 align-middle" />Total Orders</span>
                </div>
              </div>

              {/* Leaderboard */}
              <div className="border-l border-slate-200 pl-4 lg:pl-6">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Rank Leaderboard</h3>
                <div className="space-y-2.5">
                  {topClients.chartData.map((item, idx) => (
                    <div key={`${item.client}-${idx}`} className="flex items-center gap-2.5 bg-slate-50 rounded-lg p-2.5 border border-slate-200 shadow-2xs">
                      <span className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700 shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 truncate" title={item.fullName}>{item.client}</div>
                        <div className="text-[11px] text-slate-500">{item.orders} Transaksi</div>
                      </div>
                      <span className="text-xs font-bold text-purple-700 whitespace-nowrap">
                        Rp {item.revenue >= 1000 ? `${(item.revenue / 1000).toFixed(1)}B` : `${item.revenue}M`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. Require Employee & Open Positions Frame (Diperbesar ukurannya) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Require Employee &amp; Open Positions</h2>
              <p className="text-xs text-slate-500 mt-0.5">Daftar kebutuhan posisi kosong / rekrutmen karyawan antar departemen</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[550px] text-left border-collapse rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600 border-b border-slate-200">
                  <th className="py-3.5 px-4 font-bold">Posisi Jabatan</th>
                  <th className="py-3.5 px-4 font-bold">Departemen</th>
                  <th className="py-3.5 px-4 font-bold">Kebutuhan (Quota)</th>
                  <th className="py-3.5 px-4 font-bold">Target Deadline</th>
                  <th className="py-3.5 px-4 font-bold">Prioritas</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-800 divide-y divide-slate-100">
                {jobVacancies.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{job.position}</td>
                    <td className="py-3.5 px-4 text-slate-700">{job.department}</td>
                    <td className="py-3.5 px-4 font-bold text-purple-700">{job.quota} Orang</td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">{job.deadline}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${
                        job.status === 'Urgent' ? 'text-rose-600 bg-rose-50 border-rose-200' : 'text-blue-600 bg-blue-50 border-blue-200'
                      }`}>
                        ● {job.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  ); 
}