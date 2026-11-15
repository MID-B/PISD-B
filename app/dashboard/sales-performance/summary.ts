import type { useOutstandingPayments } from '../outstanding-payments';

type OutstandingRow = ReturnType<typeof useOutstandingPayments>['rows'][number];
type Report = { total_profit: number | null; total_revenue: number | null };

export function matchesOutstandingSearch(row: Pick<OutstandingRow, 'job_number' | 'due_date'>, search: string) {
  const normalize = (value: string) => value.trim().toLocaleLowerCase('id-ID').replace(/\s+/g, ' ');
  const term = normalize(search);
  if (!term || normalize(row.job_number ?? '').includes(term)) return true;
  if (!row.due_date) return false;
  const dates = [row.due_date];
  const date = new Date(`${row.due_date}T00:00:00+07:00`);
  if (Number.isFinite(date.getTime())) {
    const [year, month, day] = row.due_date.split('-');
    dates.push(`${day}/${month}/${year}`, `${Number(day)}/${Number(month)}/${year}`,
      date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }));
  }
  const normalizeDate = (value: string) => normalize(value).replace(/[./-]/g, ' ').replace(/\b0+(?=\d)/g, '').replace(/\s+/g, ' ').trim();
  const dateTerm = normalizeDate(term);
  return Boolean(dateTerm) && dates.some((value) => normalizeDate(value).includes(dateTerm));
}

function total(values: (number | null)[]) {
  const available = values.filter((value): value is number => value !== null && Number.isFinite(Number(value)));
  return available.length ? available.reduce((sum, value) => sum + Number(value), 0) : values.length ? null : 0;
}

export function summarizeSales(reports: Report[], rows: OutstandingRow[]) {
  // A partial total must not be presented as a complete period or used for a margin.
  const completeTotal = (values: (number | null)[]) => values.some((value) => value == null || !Number.isFinite(Number(value))) ? null : total(values);
  const profit = completeTotal(reports.map((row) => row.total_profit));
  const revenue = completeTotal(reports.map((row) => row.total_revenue));
  const outstanding = total(rows.map((row) => row.outstanding_amount));
  const overdueRows = rows.filter((row) => row.status?.trim().toUpperCase() === 'OVERDUE' && row.source?.trim().toUpperCase() === 'CCR');
  const aging = [
    { label: '0–30 hari', color: 'bg-emerald-500', matches: (days: number) => days >= 0 && days <= 30 },
    { label: '31–60 hari', color: 'bg-yellow-500', matches: (days: number) => days > 30 && days <= 60 },
    { label: '61–90 hari', color: 'bg-orange-400', matches: (days: number) => days > 60 && days <= 90 },
    { label: '> 90 hari', color: 'bg-red-500', matches: (days: number) => days > 90 },
    { label: 'Belum jatuh tempo', color: 'bg-cyan-500', matches: (days: number) => days < 0 },
    { label: 'Umur belum tersedia', color: 'bg-slate-400', matches: () => false },
  ].map((bucket, index) => {
    const members = rows.filter((row) => {
      const days = row.overdue_by === null ? null : Number(row.overdue_by);
      return days === null || !Number.isFinite(days) ? index === 5 : bucket.matches(days);
    });
    return { label: bucket.label, color: bucket.color, count: members.length, amount: total(members.map((row) => row.outstanding_amount)) };
  }).filter((bucket, index) => index < 4 || bucket.count > 0);
  const customers = new Map<string, { name: string; amount: number }>();
  for (const row of rows) {
    // Keep source names intact; merge only differences in case and whitespace.
    const name = row.customer?.trim() || 'Customer belum tersedia';
    const key = name.replace(/\s+/g, ' ').toLocaleLowerCase('id-ID');
    const amount = row.outstanding_amount === null ? null : Number(row.outstanding_amount);
    if (amount === null || !Number.isFinite(amount)) continue;
    const customer = customers.get(key) ?? { name, amount: 0 };
    customer.amount += amount;
    customers.set(key, customer);
  }
  return {
    profit, revenue, margin: profit !== null && revenue !== null && revenue > 0 ? profit / revenue * 100 : null,
    outstanding, count: rows.length, overdue: total(overdueRows.map((row) => row.outstanding_amount)), overdueCount: overdueRows.length,
    aging, customers: [...customers.values()].sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name)).slice(0, 5),
  };
}

export function compactRupiah(value: number | null) {
  if (value === null) return '—';
  const amount = Math.abs(value);
  const divisor = amount >= 1_000_000_000 ? 1_000_000_000 : amount >= 1_000_000 ? 1_000_000 : 1;
  const suffix = divisor === 1_000_000_000 ? ' M' : divisor === 1_000_000 ? ' jt' : '';
  return `Rp ${(value / divisor).toLocaleString('id-ID', { maximumFractionDigits: divisor === 1 ? 2 : 1 })}${suffix}`;
}
