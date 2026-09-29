'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Building2, ChartNoAxesCombined, ChevronRight, LogOut } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

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
      <aside className="w-20 md:w-64 flex flex-col justify-between p-3 md:p-4 flex-shrink-0 text-white bg-[#0B0F19]">
        <div>
          <div className="flex items-center justify-center md:justify-start gap-3 md:p-3 mb-6 bg-slate-900/60 rounded-xl">
            <div className="w-12 h-12 shrink-0 rounded-full flex items-center justify-center font-bold text-lg bg-indigo-600 text-white">AN</div>
            <div className="hidden md:block">
              <h4 className="font-semibold text-sm leading-tight">ANDIMA</h4>
              <p className="text-xs text-slate-400">Director of Board</p>
              <p className="text-[10px] text-slate-500">Username</p>
            </div>
            <ChevronRight className="hidden md:block w-4 h-4 ml-auto text-slate-500" />
          </div>
          <nav className="space-y-2" aria-label="Main navigation">
            {navigation.map(({ href, label, key, icon: Icon }) => (
              <Link key={key} href={href} aria-label={label} title={label}
                aria-current={activePage === key ? 'page' : undefined}
                className={`w-full flex items-center justify-center md:justify-start gap-3 px-3 md:px-4 py-3 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 ${activePage === key ? 'bg-[#7C3AED] text-white shadow-lg shadow-purple-900/40' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                <Icon className="w-5 h-5 shrink-0" />
                <span className="hidden md:inline">{label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="border-t border-slate-800 pt-4 flex items-center justify-center md:justify-between px-2 text-slate-400 text-sm">
          <div className="hidden md:flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-xs">N</div>
            <span>Logout</span>
          </div>
          <LogOut className="w-4 h-4 text-rose-500" />
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
      </section>
    </DashboardShell>
  );
}
