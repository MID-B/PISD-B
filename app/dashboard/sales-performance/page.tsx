'use client';

import { useState } from 'react';
import DashboardShell from '../dashboard-shell';
import { OutstandingPaymentsTable, useOutstandingPayments } from '../outstanding-payments';
import SalesPerformanceTrend, { useSalesPerformanceTrend } from '../sales-performance-trend';

const ROWS_PER_PAGE = 15;

export default function SalesPerformance() {
  const trend = useSalesPerformanceTrend();
  const { rows, tableLoading, tableError, retry } = useOutstandingPayments();
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const pageStart = (page - 1) * ROWS_PER_PAGE;
  const visibleRows = rows.slice(pageStart, pageStart + ROWS_PER_PAGE);

  return (
    <DashboardShell activePage="sales-performance">
      <section aria-labelledby="sales-title" className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <SalesPerformanceTrend model={trend} />
        <section aria-labelledby="sales-details" className="border-t border-slate-100 mt-8 pt-6">
          <h3 id="sales-details" className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-4">Outstanding Payments (IDR)</h3>
          <OutstandingPaymentsTable rows={visibleRows} tableLoading={tableLoading} tableError={tableError} />
          {!tableLoading && !tableError && rows.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p role="status" className="text-xs text-slate-500">
                Menampilkan {pageStart + 1}–{pageStart + visibleRows.length} dari {rows.length} data
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
