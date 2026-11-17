'use client';

export default function HistoryPagination({ page, totalPages, onChange, label = 'Pagination riwayat akun' }: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  label?: string;
}) {
  const start = Math.max(1, Math.min(page - 1, totalPages - 4));
  const numbers = Array.from({ length: Math.min(5, totalPages) }, (_, index) => start + index);
  const buttonClass = 'inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 cursor-pointer hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-40';
  return <nav aria-label={label} className="flex items-center gap-1.5">
    <button type="button" aria-label="Halaman sebelumnya" disabled={page <= 1} onClick={() => onChange(page - 1)} className={buttonClass}>&lsaquo;</button>
    {numbers.map((number) => <button key={number} type="button" aria-label={`Halaman ${number}`} aria-current={number === page ? 'page' : undefined} onClick={() => onChange(number)} className={number === page ? 'inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-blue-600 bg-blue-600 px-2 text-xs font-semibold text-white cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500' : buttonClass}>{number}</button>)}
    <button type="button" aria-label="Halaman berikutnya" disabled={page >= totalPages} onClick={() => onChange(page + 1)} className={buttonClass}>&rsaquo;</button>
  </nav>;
}
