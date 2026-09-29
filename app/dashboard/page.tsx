'use client';

import React, { useState } from 'react';
import { 
  ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line
} from 'recharts';
import { 
  Building2, LogOut, Search, Filter, ChevronRight 
} from 'lucide-react';

// Color Palette dari Sampel Gambar
const COLORS = {
  bgApp: '#F4F5F9',
  bgSidebar: '#0B0F19',
  bgHeader: '#111827',
  bgCard: '#FFFFFF',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  accentPurple: '#7C3AED',
  accentCyan: '#06B6D4',
  accentPink: '#EC4899',
  accentYellow: '#F59E0B',
  statusCompletedBg: '#DCFCE7',
  statusCompletedText: '#15803D',
  statusProgressBg: '#EFF6FF',
  statusProgressText: '#1D4ED8',
};

// Data Dummy Line Chart untuk Sales Performance
const lineData = [
  { month: 'Jan', CCR: 30, HRM: 20, CRM: 15, MID: 10 },
  { month: 'Feb', CCR: 40, HRM: 25, CRM: 22, MID: 12 },
  { month: 'Mar', CCR: 35, HRM: 30, CRM: 28, MID: 15 },
  { month: 'Apr', CCR: 50, HRM: 35, CRM: 32, MID: 18 },
  { month: 'May', CCR: 45, HRM: 40, CRM: 38, MID: 22 },
  { month: 'Jun', CCR: 60, HRM: 48, CRM: 42, MID: 25 },
];

const initialIssues = [
  { id: 'MB-1019', dept: 'Maju Bersama', issue: 'Send quotation update', date: '16 Sep 2026', pic: 'Yamina', status: 'Completed' },
  { id: 'MB-1019', dept: 'Maju Bersama', issue: 'Send quotation update', date: '16 Sep 2026 (Tomorrow)', pic: 'Yamina', status: 'Completed' },
  { id: 'SL-1022', dept: 'Sinar Logistik', issue: 'Confirm complaint resolution', date: '17 Sep 2026', pic: 'Khoirul', status: 'In Progress' },
  { id: 'TA-9903', dept: 'Trisakti Abadi', issue: 'Follow up quotation discussion', date: '19 Sep 2026', pic: 'Naila', status: 'Completed' },
  { id: 'KM-5520', dept: 'Karya Mandiri', issue: 'Confirm document completion', date: '19 Sep 2026', pic: 'Natalia P', status: 'In Progress' },
];

const topClientsData = [
  { name: 'Maju Bersama', revenue: 450, orders: 120 },
  { name: 'Sinar Logistik', revenue: 380, orders: 98 },
  { name: 'Trisakti Abadi', revenue: 290, orders: 75 },
  { name: 'Karya Mandiri', revenue: 210, orders: 60 },
  { name: 'Indo Trans', revenue: 160, orders: 42 },
];

export default function Dashboard() {
  const [issues, setIssues] = useState(initialIssues);
  const [selectedPeriod, setSelectedPeriod] = useState('Q3 2026');

  const toggleStatus = (index: number) => {
    const updated = [...issues];
    updated[index].status = updated[index].status === 'Completed' ? 'In Progress' : 'Completed';
    setIssues(updated);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans" style={{ backgroundColor: COLORS.bgApp }}>
      
      {/* 1. SIDEBAR KIRI */}
      <aside className="w-64 flex flex-col justify-between p-4 flex-shrink-0 text-white" style={{ backgroundColor: COLORS.bgSidebar }}>
        <div>
          {/* User Profile Info */}
          <div className="flex items-center gap-3 p-3 mb-6 bg-slate-900/60 rounded-xl">
            <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg bg-indigo-600 text-white">
              AN
            </div>
            <div>
              <h4 className="font-semibold text-sm leading-tight">ANDIMA</h4>
              <p className="text-xs text-slate-400">Director of Board</p>
              <p className="text-[10px] text-slate-500">Username</p>
            </div>
            <ChevronRight className="w-4 h-4 ml-auto text-slate-500" />
          </div>

          {/* Navigation - Cuma Dashboard */}
          <nav className="space-y-1">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white shadow-lg shadow-purple-900/40 cursor-pointer"
                    style={{ backgroundColor: COLORS.accentPurple }}>
              <Building2 className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
          </nav>
        </div>

        {/* Footer Logout */}
        <div className="border-t border-slate-800 pt-4 flex items-center justify-between px-2 text-slate-400 text-sm hover:text-white cursor-pointer transition">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-xs">N</div>
            <span>Logout</span>
          </div>
          <LogOut className="w-4 h-4 text-rose-500" />
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* 2. TOP BAR HEADER */}
        <header className="px-8 py-4 flex justify-between items-center text-white flex-shrink-0" style={{ backgroundColor: COLORS.bgHeader }}>
          <div>
            <h1 className="text-xl font-bold tracking-wide">ANDIMA MID</h1>
            <p className="text-xs text-slate-400">Dashboard Executive Overview</p>
          </div>
          
          <div className="flex items-center gap-3">
            <select 
              value={selectedPeriod} 
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-slate-800 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700 outline-none cursor-pointer"
            >
              <option>Q1 2026</option>
              <option>Q2 2026</option>
              <option>Q3 2026</option>
              <option>YTD 2026</option>
            </select>
          </div>
        </header>

        {/* DASHBOARD BODY CONTENT */}
        <main className="p-6 space-y-6">
          
          {/* Executive KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Revenue</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-slate-800">Rp 1.49 B</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">+12.5%</span>
              </div>
            </div>
            
            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Clients</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-slate-800">128</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">+4 Client</span>
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Issue Resolution</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-slate-800">94.2%</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">SLA Met</span>
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Top Client Share</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-slate-800">30.2%</span>
                <span className="text-xs text-slate-500">Maju Bersama</span>
              </div>
            </div>
          </div>

          {/* SALES PERFORMANCE TREND (FULL WIDTH LINE CHART) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Sales Performance Trend</h3>
                <p className="text-[11px] text-slate-400">Last Update by CRM — September 27, 2026 - 23:14 PM</p>
              </div>
              <div className="flex gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.accentCyan }}></span>
                  <span>CCR</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.accentPurple }}></span>
                  <span>HRM</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.accentPink }}></span>
                  <span>CRM</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.accentYellow }}></span>
                  <span>MID</span>
                </div>
              </div>
            </div>
            
            <div className="h-64 my-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748B' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="CCR" stroke={COLORS.accentCyan} strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="HRM" stroke={COLORS.accentPurple} strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="CRM" stroke={COLORS.accentPink} strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="MID" stroke={COLORS.accentYellow} strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="border-t border-slate-100 pt-3 mt-2">
              <h4 className="text-xs font-semibold text-slate-700">Description</h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Performa Departemen CRM & CCR menunjukkan tren peningkatan terkuat selama semester pertama tahun ini.
              </p>
            </div>
          </div>

          {/* ISSUE BOARD TABLE */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Issue Board</h3>
                <p className="text-xs text-slate-400">Daftar pemantauan isu operasional departemen & logistik</p>
              </div>
              <div className="flex gap-2">
                <button className="p-1.5 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg cursor-pointer">
                  <Filter className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg cursor-pointer">
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    <th className="py-3 px-6">Departemen / Klien</th>
                    <th className="py-3 px-6">Issue</th>
                    <th className="py-3 px-6">Date</th>
                    <th className="py-3 px-6">PIC</th>
                    <th className="py-3 px-6 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {issues.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-semibold text-slate-800">
                        {row.dept}
                        <span className="block text-[10px] font-normal text-slate-400 mt-0.5">
                          Logistics ID: {row.id}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-600 max-w-xs">{row.issue}</td>
                      <td className="py-4 px-6 text-slate-500 whitespace-nowrap">{row.date}</td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                            {row.pic.charAt(0)}
                          </div>
                          <span className="text-slate-600">{row.pic}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        <button
                          onClick={() => toggleStatus(idx)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer"
                          style={{
                            backgroundColor: row.status === 'Completed' ? COLORS.statusCompletedBg : COLORS.statusProgressBg,
                            color: row.status === 'Completed' ? COLORS.statusCompletedText : COLORS.statusProgressText,
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{
                            backgroundColor: row.status === 'Completed' ? COLORS.statusCompletedText : COLORS.statusProgressText
                          }}></span>
                          {row.status}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* TOP PURCHASING CLIENTS SECTION */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-2">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Top Purchasing Clients</h3>
                <p className="text-xs text-slate-400">Analisis pembelian terbesar berdasarkan pendapatan (dalam Juta Rp) & volume pesanan</p>
              </div>
              <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-3 py-1 rounded-full self-start">
                Executive Insights
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Bar Chart Grafik Klien Paling Banyak Beli */}
              <div className="lg:col-span-8 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topClientsData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue (Mio IDR)" fill={COLORS.accentPurple} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="orders" name="Total Orders" fill={COLORS.accentCyan} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Rincian Klien Terbaik */}
              <div className="lg:col-span-4 space-y-3 border-l border-slate-100 pl-0 lg:pl-6">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Rank Leaderboard</h4>
                {topClientsData.map((client, index) => (
                  <div key={client.name} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{client.name}</p>
                        <p className="text-[10px] text-slate-400">{client.orders} Total Orders</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-700">
                      Rp {client.revenue} M
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </main>
      </div>

    </div>
  );
}