'use client';

export default function HistoryPagination({
  page,
  totalPages,
  onChange,
  label = 'Pagination riwayat akun',
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  label?: string;
}) {
  const safeTotalPages = Math.max(1, totalPages);
  const maxVisible = Math.min(5, safeTotalPages);
  const start = Math.max(
    1,
    Math.min(page - 1, safeTotalPages - maxVisible + 1)
  );
  const numbers = Array.from({ length: maxVisible }, (_, index) => start + index);

  return (
    <nav
      aria-label={label}
      className="inline-flex items-center gap-1 rounded-full border border-[#3B6FF5] bg-white px-2.5 py-1 shadow-2xs"
    >
      <button
        type="button"
        aria-label="Halaman sebelumnya"
        disabled={page <= 1}
        onClick={() => onChange(Math.max(1, page - 1))}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-[#2563eb] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-35 cursor-pointer"
      >
        &lsaquo;
      </button>

      {numbers.map((number) => {
        const isCurrent = number === page;
        return (
          <button
            key={number}
            type="button"
            aria-label={`Halaman ${number}`}
            aria-current={isCurrent ? 'page' : undefined}
            onClick={() => onChange(number)}
            className={
              isCurrent
                ? 'inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#2563eb] text-xs font-semibold text-white shadow-xs transition cursor-pointer'
                : 'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium text-slate-600 transition hover:bg-slate-100 cursor-pointer'
            }
          >
            {number}
          </button>
        );
      })}

      <button
        type="button"
        aria-label="Halaman berikutnya"
        disabled={page >= safeTotalPages}
        onClick={() => onChange(Math.min(safeTotalPages, page + 1))}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-[#2563eb] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-35 cursor-pointer"
      >
        &rsaquo;
      </button>
    </nav>
  );
}