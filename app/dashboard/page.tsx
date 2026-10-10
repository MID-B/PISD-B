'use client';

import Link from 'next/link';
import DashboardShell from './dashboard-shell';
import { OutstandingPaymentsTable, useOutstandingPayments } from './outstanding-payments';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import SalesPerformanceTrend, { useSalesPerformanceTrend } from './sales-performance-trend';
import { issues, issueDateFormatter, type IssueStatus } from './issue-board/issue-data';

const issueBadgeClasses: Record<IssueStatus, string> = {
  'In Progress': 'text-blue-600 bg-blue-50 border-blue-200',
  Open: 'text-amber-600 bg-amber-50 border-amber-200',
  Pending: 'text-violet-600 bg-violet-50 border-violet-200',
  Done: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  'To Do': 'text-slate-600 bg-slate-50 border-slate-200',
};

export default function SalesPerformance() {
  const trend = useSalesPerformanceTrend();
  const outstanding = useOutstandingPayments(5);
  const dashboardIssues = issues.slice(0, 5);

  return (
    <DashboardShell activePage="dashboard">
      <section aria-labelledby="sales-title" className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <SalesPerformanceTrend model={trend} />

        <section aria-labelledby="sales-details" className="border-t border-slate-100 mt-8 pt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 id="sales-details" className="text-xs font-bold text-slate-700 uppercase tracking-wide">Outstanding Payments (IDR)</h3>
            <Link href="/dashboard/sales-performance" className="text-xs font-semibold text-violet-600 hover:underline focus-visible:outline-2 focus-visible:outline-purple-500">Lihat semua</Link>
          </div>
          <OutstandingPaymentsTable rows={outstanding.rows} tableLoading={outstanding.tableLoading} tableError={outstanding.tableError} />
          {!outstanding.tableLoading && !outstanding.tableError && outstanding.rows.length > 0 && (
            <p className="mt-3 text-xs text-slate-500">Menampilkan {outstanding.rows.length} dari {outstanding.total} data, diurutkan berdasarkan jatuh tempo terdekat.</p>
          )}
          {outstanding.tableError && <button type="button" onClick={outstanding.retry} className="mt-4 cursor-pointer text-sm text-blue-600">Coba lagi</button>}
        </section>

        {/* Issue Board - mengikuti referensi */}
        <section aria-labelledby="issue-board-title" className="mt-6 bg-[#E9EAF1] rounded-xl p-4 sm:p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 id="issue-board-title" className="text-sm font-bold text-slate-700"><Link href="/dashboard/issue-board" className="rounded focus-visible:outline-2 focus-visible:outline-blue-500">Issue Board</Link></h2>
              <p className="text-[8px] text-slate-400 mt-0.5">Daftar Pemantauan isu operasional departemen &amp; logistik</p>
            </div>
            <span className="text-cyan-400 text-[8px]">✦</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left border-collapse">
              <thead>
                <tr className="bg-white text-[7px] uppercase tracking-wide text-slate-500">
                  {['Departemen', 'Issue', 'Date', 'PIC', 'Status'].map((heading) => (
                    <th key={heading} scope="col" className="py-2 px-3 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-[8px] text-slate-700">
                {dashboardIssues.map((issue) => (
                  <tr key={issue.id} className="border-b border-slate-300/70">
                    <td className="py-2 px-3">
                      <div className="font-semibold">{issue.reporter_department}</div>
                      <div className="text-[6px] text-slate-400">{issue.ticket_code} / {issue.source}</div>
                    </td>
                    <td className="py-2 px-3"><span className="block max-w-80 truncate" title={issue.title}>{issue.title}</span></td>
                    <td className="py-2 px-3 whitespace-nowrap">{issueDateFormatter.format(new Date(issue.created_at))}</td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-[#C7D8E2] flex items-center justify-center text-[6px] text-slate-600">{issue.employee_id.charAt(0)}</span>{issue.employee_id}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[6px] font-semibold border ${issueBadgeClasses[issue.status]}`}>
                        <span className="mr-1">●</span>{issue.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {dashboardIssues.length === 0 && <tr><td colSpan={5} className="py-4 px-3 text-center text-slate-500">Belum ada issue.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {/* Top Purchasing Clients - mengikuti referensi */}
        <section aria-labelledby="top-purchasing-title" className="mt-6 bg-[#E9EAF1] rounded-xl p-4 sm:p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 id="top-purchasing-title" className="text-sm font-bold text-slate-700">Top Purchasing Clients</h2>
              <p className="text-[8px] text-slate-400 mt-1">Analisis Pembelian terbesar berdasarkan pendapatan | Dalam Juta Rp | Volume pesanan</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_135px] gap-4">
            <div className="min-w-0">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { client: 'Maju Bersama', revenue: 500, orders: 300 },
                    { client: 'Sinar Logistik', revenue: 400, orders: 270 },
                    { client: 'Makmur Jaya', revenue: 320, orders: 220 },
                    { client: 'Trijaya Abadi', revenue: 350, orders: 180 },
                  ]} margin={{ top: 10, right: 10, left: 0, bottom: 5 }} barGap={2}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#D5D8E1" vertical={false} />
                    <XAxis dataKey="client" tick={{ fontSize: 6, fill: '#64748B' }} tickMargin={6} />
                    <YAxis tick={{ fontSize: 7, fill: '#64748B' }} width={28} />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#7C4FE8" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="orders" fill="#2ED3CF" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 text-[7px] text-slate-500 mt-1">
                <span><i className="inline-block w-2 h-2 rounded-sm bg-[#7C4FE8] mr-1" />Revenue (IDR)</span>
                <span><i className="inline-block w-2 h-2 rounded-sm bg-[#2ED3CF] mr-1" />Total Orders</span>
              </div>
            </div>

            <div className="border-l border-slate-300 pl-3">
              <h3 className="text-[8px] font-semibold text-slate-600 mb-2">Rank Leaderboard</h3>
              <div className="space-y-1.5">
                {[
                  ['1', 'Maju Bersama', 'Rp. 450M'],
                  ['2', 'Sinar Logistik', 'Rp. 350M'],
                  ['3', 'Karya Mandiri', 'Rp. 290M'],
                  ['4', 'Trijaya Abadi', 'Rp. 250M'],
                ].map(([rank, name, value]) => (
                  <div key={rank} className="flex items-center gap-1.5 bg-white rounded px-1.5 py-1">
                    <span className="w-4 h-4 rounded-full bg-[#D9E2EA] flex items-center justify-center text-[7px] font-bold text-slate-600">{rank}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[7px] font-semibold text-slate-600 truncate">{name}</div>
                      <div className="text-[5px] text-slate-400">Top sales client</div>
                    </div>
                    <span className="text-[6px] font-semibold text-slate-500 whitespace-nowrap">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </section>
    </DashboardShell>
  );
}
