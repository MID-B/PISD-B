'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import Pagination from '@/components/pagination';
import DashboardShell from '../dashboard-shell';
import { OutstandingPaymentsTable, useOutstandingPayments, type OutstandingSort, type OutstandingSortColumn } from '../outstanding-payments';
import SalesPerformanceTrend, { useSalesPerformanceTrend } from '../sales-performance-trend';
import { compactRupiah, matchesOutstandingSearch, summarizeSales } from './summary';

const ROWS_PER_PAGE = 5;
const panelClass = 'rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs sm:p-3.5';
const summaryCardClass = 'rounded-2xl border bg-gradient-to-br p-3 shadow-xs sm:p-3.5';

export default function SalesPerformance() {
  const trend = useSalesPerformanceTrend();
  const { rows, tableLoading, tableError, retry } = useOutstandingPayments();
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<OutstandingSort>(null);
  const [showTable, setShowTable] = useState(false);
  const tableRef = useRef<HTMLElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const summary = summarizeSales(trend.selected, rows);

  useEffect(() => {
    if (showTable) tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [showTable]);

  const profitValue = (value: number | null) => trend.chartLoading ? 'Memuat...' : trend.chartError || !trend.selected.length ? '—' : compactRupiah(value);
  const outstandingValue = (value: number | null) => tableLoading ? 'Memuat...' : tableError ? '—' : compactRupiah(value);
  const marginLabel = trend.chartLoading ? 'Memuat...' : trend.chartError || summary.margin === null ? '—' : `${summary.margin.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`;
  const marginAvailable = !trend.chartLoading && !trend.chartError && summary.margin !== null;
  const marginFill = marginAvailable ? Math.min(100, Math.max(0, summary.margin ?? 0)) : 0;
  const maximumAging = Math.max(1, ...summary.aging.map((bucket) => Math.max(0, bucket.amount ?? 0)));
  const maximumCustomer = Math.max(1, ...summary.customers.map((customer) => Math.max(0, customer.amount)));

  function handleSort(column: OutstandingSortColumn) {
    setSort((previous) => previous?.column !== column
      ? { column, direction: 'ascending' }
      : previous.direction === 'ascending'
        ? { column, direction: 'descending' }
        : null);
    setCurrentPage(1);
  }

  const searchQuery = search.trim().toLowerCase();
  const filteredRows = rows.filter((row) => matchesOutstandingSearch(row, search));
  const sortedRows = sort ? [...filteredRows].sort((a, b) => {
    const comparison = (a[sort.column] ?? '').localeCompare(b[sort.column] ?? '', 'id', { sensitivity: 'base' });
    return sort.direction === 'ascending' ? comparison : -comparison;
  }) : filteredRows;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const pageStart = (page - 1) * ROWS_PER_PAGE;
  const visibleRows = sortedRows.slice(pageStart, pageStart + ROWS_PER_PAGE);

  return (
    <DashboardShell activePage="sales-performance">
      <div className="space-y-4">
        <div aria-label="Sales Performance overview" className={`grid gap-3 lg:min-h-[calc(100dvh-104px)] ${trend.period === 'range' ? 'lg:grid-rows-[auto_minmax(300px,1fr)_auto]' : 'lg:grid-rows-[auto_minmax(260px,1fr)_auto]'}`}>
        <section aria-label="Ringkasan Sales Performance" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className={`${summaryCardClass} from-emerald-50 to-emerald-100/60 border-emerald-200/60`}>
            <p className="text-xs font-bold text-emerald-700">Total Profit</p>
            <p className="mt-1 text-xl font-extrabold text-emerald-900">{profitValue(summary.profit)}</p>
            <p className={`mt-1 text-[11px] ${trend.growth !== null && trend.growth < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{!trend.chartLoading && !trend.chartError && trend.growth !== null ? `${trend.growth > 0 ? '+' : ''}${trend.growth.toLocaleString('id-ID', { maximumFractionDigits: 1 })}% selama periode terpilih` : trend.range}</p>
          </div>
          <div className={`${summaryCardClass} from-blue-50 to-blue-100/60 border-blue-200/60`}>
            <p className="text-xs font-bold text-blue-700">Profit Margin</p>
            <p className="mt-1 text-xl font-extrabold text-blue-900">{marginLabel}</p>
            <p className="mt-1 text-[11px] text-blue-700">Profit terhadap total revenue</p>
          </div>
          <div className={`${summaryCardClass} from-amber-50 to-amber-100/60 border-amber-200/60`}>
            <p className="text-xs font-bold text-amber-700">Total Outstanding</p>
            <p className="mt-1 text-xl font-extrabold text-amber-900">{outstandingValue(summary.outstanding)}</p>
            <p className="mt-1 text-[11px] text-amber-700">{tableLoading ? 'Memuat data tagihan...' : tableError ? 'Data belum dapat ditampilkan' : `${summary.count.toLocaleString('id-ID')} data tagihan`}</p>
          </div>
          <div className={`${summaryCardClass} from-rose-50 to-rose-100/60 border-rose-200/60`}>
            <p className="text-xs font-bold text-rose-700">Overdue / CCR</p>
            <p className="mt-1 text-xl font-extrabold text-rose-900">{outstandingValue(summary.overdue)}</p>
            <p className="mt-1 text-[11px] text-rose-600">{!tableLoading && !tableError ? `${summary.overdueCount.toLocaleString('id-ID')} data tagihan` : '—'}</p>
          </div>
        </section>

        <div className="grid min-h-0 items-stretch gap-3 lg:grid-cols-[2fr_1fr]">
          <SalesPerformanceTrend model={trend} compact={false} fitHeight />
          <section aria-labelledby="margin-title" className={`${panelClass} flex flex-col`}>
            <h2 id="margin-title" className="text-base font-bold text-slate-800">Profit Margin</h2>
            <p className="mt-1 text-[11px] text-slate-500">{trend.range}</p>
            <div className="flex min-h-[120px] flex-1 flex-col items-center gap-1 py-2 text-center" aria-live="polite">
              <div className="relative min-h-[72px] w-full flex-1">
                <svg role="img" aria-label={`Profit margin: ${marginLabel}`} viewBox="0 0 260 150" className="absolute inset-0 m-auto h-full w-full max-w-[300px]">
                  <path d="M 20 130 A 110 110 0 0 1 240 130" fill="none" stroke="#f1f5f9" strokeWidth="24" />
                  {marginFill > 0 && <path d="M 20 130 A 110 110 0 0 1 240 130" fill="none" stroke="#06b6d4" strokeWidth="24" pathLength="100" strokeDasharray={`${marginFill} 100`} />}
                  <text x="130" y="127" textAnchor="middle" fill={summary.margin !== null && summary.margin < 0 ? '#e11d48' : '#0f172a'} fontSize={trend.chartLoading ? '22' : '36'} fontWeight="800" fontFamily="inherit">{marginLabel}</text>
                </svg>
              </div>
              <p className="text-[11px] text-slate-500">{trend.rangeError || (!trend.chartLoading && !trend.chartError && summary.margin === null ? 'Margin belum dapat dihitung. Data profit/revenue harus lengkap dan revenue lebih dari nol.' : 'Total profit ÷ total revenue × 100%')}</p>
            </div>
            <dl className="shrink-0 space-y-2 border-t border-slate-100 pt-3 text-xs"><div className="flex flex-wrap justify-between gap-2"><dt className="text-slate-500">Total Profit</dt><dd className="font-semibold text-slate-800">{profitValue(summary.profit)}</dd></div><div className="flex flex-wrap justify-between gap-2"><dt className="text-slate-500">Total Revenue</dt><dd className="font-semibold text-slate-800">{profitValue(summary.revenue)}</dd></div></dl>
          </section>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <section aria-labelledby="aging-title" className={panelClass}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 id="aging-title" className="text-base font-bold text-slate-800">Aging Outstanding Payment</h2><p className="mt-1 text-[11px] text-slate-500">Total {outstandingValue(summary.outstanding)}{!tableLoading && !tableError ? ` · ${summary.count.toLocaleString('id-ID')} data tagihan` : ''}</p></div>
              <button ref={openButtonRef} type="button" aria-expanded={showTable} aria-controls="outstanding-details" onClick={() => { if (showTable) tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); else setShowTable(true); }} className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">Lihat tabel outstanding<ChevronDown aria-hidden="true" className="h-4 w-4" /></button>
            </div>
            <p className="mt-2 text-[10px] text-slate-400">Berdasarkan jumlah hari keterlambatan pada data outstanding.</p>
            {tableLoading ? <p role="status" className="py-8 text-xs text-slate-500">Memuat outstanding...</p> : tableError ? <p role="alert" className="py-6 text-xs text-red-600">{tableError} <button type="button" onClick={retry} className="cursor-pointer underline">Coba lagi</button></p> : !rows.length ? <p className="py-8 text-xs text-slate-500">Belum ada data outstanding.</p> : <ul className="mt-2 space-y-1.5">{summary.aging.map((bucket) => <li key={bucket.label} className="grid grid-cols-[110px_minmax(0,1fr)_90px] items-center gap-3 text-[11px]">
              <span className="text-slate-600">{bucket.label}</span><div className="h-3 overflow-hidden rounded bg-slate-100"><div className={`h-full rounded ${bucket.color}`} style={{ width: `${Math.max(0, bucket.amount ?? 0) / maximumAging * 100}%` }} /></div><span className="text-right font-semibold text-slate-800">{compactRupiah(bucket.amount)}</span>
            </li>)}</ul>}
          </section>
          <section aria-labelledby="customers-title" className={panelClass}>
            <h2 id="customers-title" className="text-base font-bold text-slate-800">Top 5 Customer — Outstanding</h2>
            <p className="mt-1 text-[11px] text-slate-500">Customer dengan total outstanding terbesar</p>
            {tableLoading ? <p role="status" className="py-8 text-xs text-slate-500">Memuat customer...</p> : tableError ? <p className="py-8 text-xs text-slate-500">Data customer belum dapat ditampilkan.</p> : !summary.customers.length ? <p className="py-8 text-xs text-slate-500">Belum ada data customer.</p> : <ol className="mt-2 space-y-1.5">{summary.customers.map((customer) => <li key={customer.name} className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_80px] items-center gap-3 text-[11px]">
              <span className="break-words text-slate-600">{customer.name}</span><div className="h-3 overflow-hidden rounded bg-slate-100"><div className="h-full rounded bg-blue-600" style={{ width: `${Math.max(0, customer.amount) / maximumCustomer * 100}%` }} /></div><span className="text-right font-semibold text-slate-800">{compactRupiah(customer.amount)}</span>
            </li>)}</ol>}
          </section>
        </div>
        </div>

        {showTable && <section ref={tableRef} id="outstanding-details" aria-labelledby="sales-details" className={`${panelClass} scroll-mt-4`}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h3 id="sales-details" className="text-lg font-bold text-slate-800 uppercase tracking-wide">Outstanding Payment Information</h3>
            <button type="button" aria-label="Tutup tabel" title="Tutup tabel" onClick={() => { setShowTable(false); openButtonRef.current?.focus({ preventScroll: true }); openButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }} className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"><X aria-hidden="true" className="h-4 w-4" /></button>
          </div>
            <div className="relative mb-5 w-full max-w-[460px]">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                aria-label="Cari outstanding payment berdasarkan job number atau due date"
                placeholder="Search Job Number / Due Date..."
                value={search}
                onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }}
                className="h-9 w-full rounded-lg bg-slate-100 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500"
              />
            </div>
          <OutstandingPaymentsTable rows={visibleRows} tableLoading={tableLoading} tableError={tableError} emptyMessage={searchQuery ? 'Tidak ada outstanding payment yang cocok dengan pencarian.' : undefined} sort={sort} onSort={handleSort} />
          {!tableLoading && !tableError && filteredRows.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p role="status" className="text-xs text-slate-500">
                Menampilkan {pageStart + 1}–{pageStart + visibleRows.length} dari {filteredRows.length} data
              </p>
              <Pagination compact label="Pagination Outstanding Payments" page={page} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        {tableError && <button type="button" onClick={() => { setCurrentPage(1); retry(); }} className="mt-4 text-sm text-blue-600 cursor-pointer">Coba lagi</button>}
        </section>}
      </div>
    </DashboardShell>
  );
}
