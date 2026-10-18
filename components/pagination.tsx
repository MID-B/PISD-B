'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, onPageChange, label }: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  label: string;
}) {
  const start = Math.max(1, Math.min(page - 1, totalPages - 2));
  const pages = Array.from({ length: Math.min(3, totalPages) }, (_, index) => start + index);
  const buttonClass = 'inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={buttonClass}>
        <ChevronLeft aria-hidden="true" className="h-4 w-4" />Previous
      </button>
      {pages.map((number) => (
        <button
          key={number}
          type="button"
          aria-label={`Halaman ${number}`}
          aria-current={number === page ? 'page' : undefined}
          onClick={() => onPageChange(number)}
          className={`inline-flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-xl border px-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${number === page ? 'border-blue-600 bg-blue-600 font-semibold text-white shadow-[0_4px_12px_rgba(37,99,235,0.25)]' : 'border-slate-300 bg-white font-medium text-slate-900 hover:bg-slate-50'}`}
        >{number}</button>
      ))}
      <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className={buttonClass}>
        Next<ChevronRight aria-hidden="true" className="h-4 w-4" />
      </button>
    </nav>
  );
}
