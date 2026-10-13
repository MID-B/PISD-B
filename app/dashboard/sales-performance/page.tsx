'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import DashboardShell from '../dashboard-shell';
import { OutstandingPaymentsTable, useOutstandingPayments, type OutstandingSort, type OutstandingSortColumn } from '../outstanding-payments';
import SalesPerformanceTrend, { useSalesPerformanceTrend } from '../sales-performance-trend';

const ROWS_PER_PAGE = 15;

export default function SalesPerformance() {
  const trend = useSalesPerformanceTrend();
  const { rows, tableLoading, tableError, retry } = useOutstandingPayments();
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<OutstandingSort>(null);

  function handleSort(column: OutstandingSortColumn) {
    setSort((previous) => previous?.column !== column
      ? { column, direction: 'ascending' }
      : previous.direction === 'ascending'
        ? { column, direction: 'descending' }
        : null);
    setCurrentPage(1);
  }

  const searchQuery = search.trim().toLowerCase();
  const filteredRows = rows.filter((row) =>
    [row.customer, row.job_number, row.status, row.source].some((value) =>
      value?.toLowerCase().includes(searchQuery),
    ) || !searchQuery,
  );
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
      <section aria-labelledby="sales-title" className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <SalesPerformanceTrend model={trend} />
        <section aria-labelledby="sales-details" className="border-t border-slate-100 mt-8 pt-6">
          <div className="mb-6 w-full max-w-[460px]">
            <h3 id="sales-details" className="text-lg font-bold text-slate-800 uppercase tracking-wide">Outstanding Payment Information</h3>
            <div className="relative mt-2 w-full">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                aria-label="Cari outstanding payment berdasarkan customer, job number, status, atau source"
                placeholder="Search..."
                value={search}
                onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }}
                className="h-9 w-full rounded-lg bg-slate-100 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500"
              />
            </div>
          </div>
          <OutstandingPaymentsTable rows={visibleRows} tableLoading={tableLoading} tableError={tableError} emptyMessage={searchQuery ? 'Tidak ada outstanding payment yang cocok dengan pencarian.' : undefined} sort={sort} onSort={handleSort} />
          {!tableLoading && !tableError && filteredRows.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p role="status" className="text-xs text-slate-500">
                Menampilkan {pageStart + 1}–{pageStart + visibleRows.length} dari {filteredRows.length} data
              </p>
              <nav aria-label="Pagination Outstanding Payments" className="flex flex-wrap items-center gap-3 text-xs">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setCurrentPage(page - 1)}
                  className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-purple-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sebelumnya
                </button>
                <span className="text-slate-500">Halaman {page} dari {totalPages}</span>
                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() => setCurrentPage(page + 1)}
                  className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-purple-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Berikutnya
                </button>
              </nav>
            </div>
          )}
        </section>
        {tableError && <button type="button" onClick={() => { setCurrentPage(1); retry(); }} className="mt-4 text-sm text-blue-600 cursor-pointer">Coba lagi</button>}
      </section>
    </DashboardShell>
  );
}
