'use client';

import { Text, LanguageInput } from '@/components/language';
import { useEffect, useRef, useState } from 'react';
import { Table2, Search, X } from 'lucide-react';
import HistoryPagination from '@/components/history-pagination';
import DashboardShell from '../dashboard-shell';
import { OutstandingPaymentsTable, useOutstandingPayments, type OutstandingSort, type OutstandingSortColumn } from '../outstanding-payments';
import SalesPerformanceTrend, { useSalesPerformanceTrend } from '../sales-performance-trend';
import { compactRupiah, matchesOutstandingSearch, summarizeSales } from './summary';

const ROWS_PER_PAGE = 5;
const panelClass = 'min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs';
const summaryCardClass = 'flex flex-col justify-between rounded-xl border p-3.5';

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
        <div aria-label="Sales Performance overview" className="space-y-4">
        <section aria-label="Ringkasan Sales Performance" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className={`${summaryCardClass} bg-emerald-50 border-emerald-200/60`}>
            <p className="text-sm font-bold text-emerald-700"><Text>Total Profit</Text></p>
            <p className="my-1 text-[28px] font-medium leading-tight tabular-nums text-emerald-900">{profitValue(summary.profit)}</p>
            <p className={`mt-1 text-xs ${trend.growth !== null && trend.growth < 0 ? 'text-rose-600' : 'text-emerald-600'}`}><Text dynamic>{!trend.chartLoading && !trend.chartError && trend.growth !== null ? `${trend.growth > 0 ? '+' : ''}${trend.growth.toLocaleString('id-ID', { maximumFractionDigits: 1 })}% selama periode terpilih` : trend.range}</Text></p>
          </div>
          <div className={`${summaryCardClass} bg-blue-50 border-blue-200/60`}>
            <p className="text-sm font-bold text-blue-700"><Text>Profit Margin</Text></p>
            <p className="my-1 text-[28px] font-medium leading-tight tabular-nums text-blue-900">{marginLabel}</p>
            <p className="mt-1 text-xs text-blue-700"><Text>Profit terhadap total revenue</Text></p>
          </div>
          <div className={`${summaryCardClass} bg-amber-50 border-amber-200/60`}>
            <p className="text-sm font-bold text-amber-700"><Text>Total Outstanding</Text></p>
            <p className="my-1 text-[28px] font-medium leading-tight tabular-nums text-amber-900">{outstandingValue(summary.outstanding)}</p>
            <p className="mt-1 text-xs text-amber-700"><Text dynamic>{tableLoading ? 'Memuat data tagihan...' : tableError ? 'Data belum dapat ditampilkan' : `${summary.count.toLocaleString('id-ID')} data tagihan`}</Text></p>
          </div>
          <div className={`${summaryCardClass} bg-rose-50 border-rose-200/60`}>
            <p className="text-sm font-bold text-rose-700"><Text>Overdue / CCR</Text></p>
            <p className="my-1 text-[28px] font-medium leading-tight tabular-nums text-rose-900">{outstandingValue(summary.overdue)}</p>
            <p className="mt-1 text-xs text-rose-600"><Text dynamic>{!tableLoading && !tableError ? `${summary.overdueCount.toLocaleString('id-ID')} data tagihan` : '—'}</Text></p>
          </div>
        </section>

        <div className="grid min-h-0 items-stretch gap-4 lg:grid-cols-[2fr_1fr]">
          <SalesPerformanceTrend model={trend} compact={false} fitHeight />
          <section aria-labelledby="margin-title" className={`${panelClass} flex flex-col`}>
            <h2 id="margin-title" className="text-base font-bold text-slate-800"><Text>Profit Margin</Text></h2>
            <p className="mt-1 text-sm text-slate-500"><Text>{trend.range}</Text></p>
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-4 text-center" aria-live="polite">
              <div className="relative h-48 w-full shrink-0">
                <svg role="img" aria-label={`Profit margin: ${marginLabel}`} viewBox="0 0 260 150" className="absolute inset-0 m-auto h-full w-full max-w-[300px]">
                  <path d="M 20 130 A 110 110 0 0 1 240 130" fill="none" stroke="#f1f5f9" strokeWidth="24" />
                  {marginFill > 0 && <path d="M 20 130 A 110 110 0 0 1 240 130" fill="none" stroke="#06b6d4" strokeWidth="24" pathLength="100" strokeDasharray={`${marginFill} 100`} />}
                  <text x="130" y="127" textAnchor="middle" fill={summary.margin !== null && summary.margin < 0 ? '#e11d48' : '#334155'} fontSize={trend.chartLoading ? '22' : '36'} fontWeight="500" fontFamily="inherit">{marginLabel}</text>
                </svg>
              </div>
              <p className="text-sm text-slate-500">{trend.rangeError || (!trend.chartLoading && !trend.chartError && summary.margin === null ? 'Margin belum dapat dihitung. Data profit/revenue harus lengkap dan revenue lebih dari nol.' : 'Total profit ÷ total revenue × 100%')}</p>
            </div>
            <dl className="shrink-0 space-y-2 border-t border-slate-100 pt-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><dt className="text-slate-500"><Text>Total Profit</Text></dt><dd className="font-normal text-slate-700">{profitValue(summary.profit)}</dd></div><div className="flex flex-wrap justify-between gap-2"><dt className="text-slate-500"><Text>Total Revenue</Text></dt><dd className="font-normal text-slate-700">{profitValue(summary.revenue)}</dd></div></dl>
          </section>
        </div>

        <div className="grid items-stretch gap-4 xl:grid-cols-2">
          <section aria-labelledby="aging-title" className={panelClass}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 id="aging-title" className="text-base font-bold text-slate-800"><Text>Aging Outstanding Payment</Text></h2><p className="mt-1 text-sm text-slate-500"><Text>Total </Text>{outstandingValue(summary.outstanding)}<Text dynamic>{!tableLoading && !tableError ? ` · ${summary.count.toLocaleString('id-ID')} data tagihan` : ''}</Text></p></div>
              <button ref={openButtonRef} type="button" aria-expanded={showTable} aria-controls="outstanding-details" onClick={() => { if (showTable) tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); else setShowTable(true); }} className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-[#3B6FF5] px-4 text-sm font-normal text-white shadow-2xs transition-colors hover:bg-[#315be0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"><Table2 aria-hidden="true" className="h-4 w-4" /><Text>Lihat tabel outstanding</Text></button>
            </div>
            {tableLoading ? <p role="status" className="py-8 text-xs text-slate-500"><Text>Memuat outstanding...</Text></p> : tableError ? <p role="alert" className="py-6 text-xs text-red-600"><Text dynamic>{tableError}</Text> <button type="button" onClick={retry} className="cursor-pointer underline"><Text>Coba lagi</Text></button></p> : !rows.length ? <p className="py-8 text-xs text-slate-500"><Text>Belum ada data outstanding.</Text></p> : <ul className="mt-4 space-y-4">{summary.aging.map((bucket) => <li key={bucket.label} className="grid grid-cols-[100px_minmax(0,1fr)_90px] items-center gap-3 text-sm">
              <span className="text-slate-600"><Text dynamic>{bucket.label}</Text></span><div className="h-6 overflow-hidden rounded bg-slate-100"><div className={`h-full rounded ${bucket.color}`} style={{ width: `${Math.max(0, bucket.amount ?? 0) / maximumAging * 100}%` }} /></div><span className="text-right font-normal text-slate-700">{compactRupiah(bucket.amount)}</span>
            </li>)}</ul>}
          </section>
          <section aria-labelledby="customers-title" className={panelClass}>
            <h2 id="customers-title" className="text-base font-bold text-slate-800"><Text>Top 5 Customer — Outstanding</Text></h2>
            {tableLoading ? <p role="status" className="py-8 text-xs text-slate-500"><Text>Memuat customer...</Text></p> : tableError ? <p className="py-8 text-xs text-slate-500"><Text>Data customer belum dapat ditampilkan.</Text></p> : !summary.customers.length ? <p className="py-8 text-xs text-slate-500"><Text>Belum ada data customer.</Text></p> : <ol className="mt-4 space-y-4">{summary.customers.map((customer) => <li key={customer.name} className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_80px] items-center gap-3 text-sm">
              <span className="break-words text-slate-600">{customer.name}</span><div className="h-6 overflow-hidden rounded bg-slate-100"><div className="h-full rounded bg-blue-600" style={{ width: `${Math.max(0, customer.amount) / maximumCustomer * 100}%` }} /></div><span className="text-right font-normal text-slate-700">{compactRupiah(customer.amount)}</span>
            </li>)}</ol>}
          </section>
        </div>
        </div>

        {showTable && <section ref={tableRef} id="outstanding-details" aria-labelledby="sales-details" className={`${panelClass} scroll-mt-4`}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h3 id="sales-details" className="text-lg font-bold text-slate-800 uppercase tracking-wide"><Text>Outstanding Payment Information</Text></h3>
            <button type="button" aria-label="Tutup tabel" title="Tutup tabel" onClick={() => { setShowTable(false); openButtonRef.current?.focus({ preventScroll: true }); openButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }} className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"><X aria-hidden="true" className="h-4 w-4" /></button>
          </div>
            <div className="relative mb-5 w-full max-w-[460px]">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <LanguageInput
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
                <Text>Menampilkan </Text>{pageStart + 1}–{pageStart + visibleRows.length} <Text>dari </Text>{filteredRows.length} <Text>data
              </Text></p>
              <HistoryPagination label="Pagination Outstanding Payments" page={page} totalPages={totalPages} onChange={setCurrentPage} />
            </div>
          )}
        {tableError && <button type="button" onClick={() => { setCurrentPage(1); retry(); }} className="mt-4 text-sm text-blue-600 cursor-pointer"><Text>Coba lagi</Text></button>}
        </section>}
      </div>
    </DashboardShell>
  );
}
