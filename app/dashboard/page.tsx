'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Building2, ChartNoAxesCombined, LogOut } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

type DashboardShellProps = {
  activePage: 'dashboard' | 'sales-performance';
  headerActions?: ReactNode;
  children: ReactNode;
};

const navigation = [
  { href: '/dashboard', label: 'Dashboard', key: 'dashboard', icon: Building2 },
  { href: '/dashboard/sales-performance', label: 'Sales Performance', key: 'sales-performance', icon: ChartNoAxesCombined },
];

function DashboardShell({ activePage, headerActions, children }: DashboardShellProps) {
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#F4F5F9] font-sans">
      <aside className="w-[148px] flex flex-col justify-between px-3 py-3 flex-shrink-0 text-white bg-[#102748]">
        <div>
          {/* Brand: logo di kiri + nama perusahaan di kanan */}
          <div className="flex items-center gap-2 px-0.5 mb-7">
            <div className="w-9 h-9 shrink-0 flex items-center justify-center overflow-hidden">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-ANDIMA-wzx4gpZx20EFE5IYcH3jqabixELIo3.png"
                alt="Logo ANDIMA"
                width={400}
                height={246}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0 leading-none">
              <h4 className="text-[14px] font-extrabold tracking-tight text-white">ANDIMA</h4>
              <p className="mt-1.5 text-[8px] text-slate-300 whitespace-nowrap">Logistics Suite</p>
            </div>
          </div>

          <nav className="space-y-2" aria-label="Main navigation">
            {navigation.map(({ href, label, key, icon: Icon }) => (
              <Link
                key={key}
                href={href}
                aria-label={label}
                title={label}
                aria-current={activePage === key ? 'page' : undefined}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[10px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 ${
                  activePage === key
                    ? 'bg-[#075EDB] text-white shadow-sm'
                    : 'text-slate-300 hover:bg-[#18355D] hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Logout - tombol outline merah seperti referensi */}
        <div className="pt-4">
          <Link
            href="/logout"
            aria-label="Logout"
            title="Logout"
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-full border border-[#F43F5E] text-[#FF4D6D] text-[9px] font-medium hover:bg-[#F43F5E]/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400"
          >
            <LogOut className="w-3 h-3" />
            <span>Logout</span>
          </Link>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="px-4 md:px-8 py-4 flex justify-between items-center gap-3 text-white flex-shrink-0 bg-[#111827]">
          <div>
            <h1 className="text-xl font-bold tracking-wide">ANDIMA MID</h1>
            <p className="text-xs text-slate-400">{activePage === 'dashboard' ? 'Dashboard Executive Overview' : 'Sales Performance'}</p>
          </div>
          {headerActions}
        </header>
        <main className="p-4 md:p-6 space-y-6">{children}</main>
      </div>
    </div>
  );
}

type SalesPoint = { month: string; CCR: number; HRM: number; CRM: number; MID: number };

const series = [
  { key: 'CCR', color: '#06B6D4' },
  { key: 'HRM', color: '#7C3AED' },
  { key: 'CRM', color: '#EC4899' },
  { key: 'MID', color: '#F59E0B' },
] as const;

function SalesLegend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs font-medium" aria-label="Chart legend">
      {series.map(({ key, color }) => (
        <div key={key} className="flex items-center gap-1.5 text-slate-600">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
          <span>{key}</span>
        </div>
      ))}
    </div>
  );
}

function SalesTrendChart({ data, currency = false }: { data: SalesPoint[]; currency?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: currency ? 0 : -10, bottom: 0 }} accessibilityLayer>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} tickMargin={8} />
        <YAxis width={currency ? 74 : 60} tick={{ fontSize: 12, fill: '#64748B' }}
          tickFormatter={currency ? (value: number) => `Rp${value}M` : undefined} />
        <Tooltip formatter={currency ? (value, name) => [`Rp ${Number(value).toLocaleString('id-ID')} juta`, name] : undefined} />
        {series.map(({ key, color }) => (
          <Line key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// Sample reports until sales data is connected to an API. Amounts are in million IDR.
const reports = [
  { CCR: 30, HRM: 20, CRM: 15, MID: 10, month: 'Jan 2026' },
  { CCR: 40, HRM: 25, CRM: 22, MID: 12, month: 'Feb 2026' },
  { CCR: 35, HRM: 30, CRM: 28, MID: 15, month: 'Mar 2026' },
  { CCR: 50, HRM: 35, CRM: 32, MID: 18, month: 'Apr 2026' },
  { CCR: 45, HRM: 40, CRM: 38, MID: 22, month: 'Mei 2026' },
  { CCR: 60, HRM: 48, CRM: 42, MID: 25, month: 'Jun 2026' },
  { month: 'Jul 2026', CCR: 68, HRM: 58, CRM: 50, MID: 27 },
];

const details = [
  { period: 'Jul 2026', issue: 'Outstanding Payment', customer: 'PT CEVA AIR OCEAN', job: 'B1/2608/3801', amount: 316.35, dueDate: '01 Sep 2026', status: 'Overdue', source: 'CCR' },
  { period: 'Mar 2026', issue: 'Sales Report', customer: 'Maju Bersama', job: 'MB/2603/1019', amount: 125, dueDate: '31 Mar 2026', status: 'Completed', source: 'CRM' },
];

export default function SalesPerformance() {
  const [period, setPeriod] = useState('3');
  const data = reports.slice(-Number(period));
  const rows = details.filter((row) => data.some((point) => point.month === row.period));
  const total = (point: typeof reports[number]) => point.CCR + point.HRM + point.CRM + point.MID;
  const growth = ((total(data[data.length - 1]) - total(data[0])) / total(data[0]) * 100).toLocaleString('id-ID', { maximumFractionDigits: 1 });
  const range = `${data[0].month} – ${data[data.length - 1].month}`;

  return (
    <DashboardShell activePage="sales-performance">
      <section aria-labelledby="sales-title" className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h2 id="sales-title" className="font-bold text-slate-800 text-base">Sales Performance Trend</h2>
            <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-wide">Perbandingan total profit company sales report periode {range}.</p>
          </div>
          <select aria-label="Sales report period" value={period} onChange={(event) => setPeriod(event.target.value)}
            className="self-start bg-white text-slate-700 text-xs font-medium px-3 py-2 rounded-full border border-purple-200 focus:outline-2 focus:outline-purple-500 cursor-pointer">
            <option value="3">Last 3 Months</option>
            <option value="6">Last 6 Months</option>
            <option value="7">YTD 2026</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mt-6 mb-4">
          <span className="text-[11px] text-slate-400">Profit (dalam juta rupiah) · Data contoh</span>
          <SalesLegend />
        </div>
        <div className="h-64 sm:h-80 my-2" role="group" aria-label={`Sales performance chart, ${range}`}>
          <SalesTrendChart data={data} currency />
        </div>
        <div className="border-t border-slate-100 pt-3 mt-5" aria-live="polite">
          <h3 className="text-xs font-semibold text-slate-700">Description</h3>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
            Total profit CCR, HRM, CRM &amp; MID meningkat {growth}% selama periode {range}.
          </p>
        </div>

        <section aria-labelledby="sales-details" className="border-t border-slate-100 mt-8 pt-6">
          <h3 id="sales-details" className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-4">Detailed Sales Data (in millions)</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left border-collapse">
              <thead>
                <tr className="bg-violet-50/70 border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                  {['Issue', 'Customer', 'Job Number', 'Amount', 'Due Date', 'Status/Source'].map((heading) => (
                    <th key={heading} scope="col" className="py-3 px-3 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {rows.map((row) => (
                  <tr key={row.job} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-3 font-medium">{row.issue}</td>
                    <td className="py-4 px-3">{row.customer}</td>
                    <td className="py-4 px-3 whitespace-nowrap">{row.job}</td>
                    <td className="py-4 px-3 whitespace-nowrap tabular-nums">Rp{row.amount.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>
                    <td className="py-4 px-3 whitespace-nowrap">{row.dueDate}</td>
                    <td className={`py-4 px-3 whitespace-nowrap font-semibold ${row.status === 'Overdue' ? 'text-rose-500' : 'text-emerald-600'}`}>{row.status} / {row.source}</td>
                  </tr>
                ))}
                {Array.from({ length: Math.max(0, 3 - rows.length) }, (_, index) => (
                  <tr key={`placeholder-${index}`} aria-hidden="true">
                    {Array.from({ length: 6 }, (_, column) => <td key={column} className={`py-3 px-3 ${column === 5 ? 'text-violet-400' : 'text-slate-400'}`}>–</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Issue Board - mengikuti referensi */}
        <section aria-labelledby="issue-board-title" className="mt-6 bg-[#E9EAF1] rounded-xl p-4 sm:p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 id="issue-board-title" className="text-sm font-bold text-slate-700">Issue Board</h2>
              <p className="text-[8px] text-slate-400 mt-0.5">Daftar Pemantauan isu operasional departemen &amp; logistik</p>
            </div>
            <span className="text-cyan-400 text-[8px]">✦</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left border-collapse">
              <thead>
                <tr className="bg-white text-[7px] uppercase tracking-wide text-slate-500">
                  {['Client', 'Issue', 'Date', 'PIC', 'Status'].map((heading) => (
                    <th key={heading} className="py-2 px-3 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-[8px] text-slate-700">
                {[
                  ['Maju Bersama', 'Send quotation update', '16 Sep 2026', 'Yemina', 'Completed'],
                  ['Sinar Logistik', 'Cargo Logistic not found', '17 Sep 2026', 'Khoirul', 'In Progress'],
                  ['Makmur Jaya', 'Wrong invoice', '21 Sep 2026', 'Juan', 'In Progress'],
                  ['Sumber Rejeki', 'Delivery late', '24 Sep 2026', 'Advent', 'Completed'],
                  ['Brahma Surya', 'Delivery late', '29 Sep 2026', 'Vieri', 'In Progress'],
                ].map(([client, issue, date, pic, status]) => (
                  <tr key={`${client}-${date}`} className="border-b border-slate-300/70">
                    <td className="py-2 px-3">
                      <div className="font-semibold">{client}</div>
                      <div className="text-[6px] text-slate-400">Logistic ID: LS-••••</div>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">{issue}</td>
                    <td className="py-2 px-3 whitespace-nowrap">{date}</td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-[#C7D8E2] flex items-center justify-center text-[6px] text-slate-600">{pic.charAt(0)}</span>{pic}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[6px] font-semibold border ${status === 'Completed' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-blue-600 bg-blue-50 border-blue-200'}`}>
                        <span className="mr-1">●</span>{status}
                      </span>
                    </td>
                  </tr>
                ))}
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
