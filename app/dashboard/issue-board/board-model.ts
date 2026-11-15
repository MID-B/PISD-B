import type { UniversalIssue } from './issue-data';

export type ViewIssue = UniversalIssue;
export const PAGE_SIZE = 5;
export const STATUSES = [
  { name: 'OPEN', label: 'Open', color: '#F59E0B', background: '#FFFBEB', cardText: '#92400E' },
  { name: 'IN PROGRESS', label: 'In Progress', color: '#3981FF', background: '#EFF6FF', cardText: '#1E40AF' },
  { name: 'IN REVIEW', label: 'In Review', color: '#06B6D4', background: '#ECFEFF', cardText: '#155E75' },
  { name: 'PENDING', label: 'Pending', color: '#9560FF', background: '#F5F0FF', cardText: '#6B21A8' },
  { name: 'DONE', label: 'Done', color: '#10B981', background: '#ECFDF5', cardText: '#065F46' },
  { name: 'TO DO', label: 'To Do', color: '#77808F', background: '#F3F4F6', cardText: '#374151' },
] as const;
export const PRIORITIES = [
  { key: 'HIGH', label: 'High', color: '#ef4444' },
  { key: 'MEDIUM', label: 'Medium', color: '#f59e0b' },
  { key: 'LOW', label: 'Low', color: '#3981ff' },
  { key: 'unset', label: 'Undetermined', color: '#94a3b8' },
] as const;
const DAY = 86_400_000;
const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' });
const dateFormatter = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', year: 'numeric', month: 'short', day: '2-digit' });
const timeFormatter = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export const normalizeStatus = (value: string | null) => value?.trim().toUpperCase().replace(/[_\s]+/g, ' ') || '';
export const sourceKey = (value: string | null) => value?.trim().toUpperCase() || 'UNKNOWN';
export function sourceColor(value: string | null) {
  const source = sourceKey(value);
  return ({ CCR: '#3981ff', CRM: '#06b6d4', HRMS: '#8b83f6' } as Record<string, string>)[source] || '#64748b';
}
export function priorityKey(value: string | null) {
  const key = normalizeStatus(value);
  return ['', '-', 'UNDETERMINED', 'UNSPECIFIED', 'BELUM DITENTUKAN'].includes(key) ? 'unset' : key;
}
export function statusStyle(value: string | null) {
  return STATUSES.find((status) => status.name === normalizeStatus(value))
    ?? { name: normalizeStatus(value), label: value?.trim() || 'Unknown', color: '#77808F', background: '#F3F4F6', cardText: '#374151' };
}
export function priorityStyle(value: string | null) {
  return PRIORITIES.find((priority) => priority.key === priorityKey(value))
    ?? { key: priorityKey(value), label: value?.trim() || 'Undetermined', color: '#94a3b8' };
}
export function issueTime(value: string | null) {
  if (!value) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const timestamp = Date.parse(dateOnly ? `${value}T00:00:00+07:00` : value);
  if (!Number.isFinite(timestamp) || (dateOnly && dayFormatter.format(new Date(timestamp)) !== value)) return null;
  return timestamp;
}
export function issueDay(value: string | null) {
  const timestamp = issueTime(value);
  return timestamp === null ? '' : dayFormatter.format(new Date(timestamp));
}
export const currentIssueDay = () => dayFormatter.format(new Date());
export function formatIssueDate(value: string | null, includeTime = false) {
  const timestamp = issueTime(value);
  if (timestamp === null) return '-';
  const date = new Date(timestamp);
  const hasTime = includeTime && !/^\d{4}-\d{2}-\d{2}$/.test(value!);
  return dateFormatter.format(date) + (hasTime ? `, ${timeFormatter.format(date)} WIB` : '');
}
export type BoardFilters = { source: string; status: string; priority: string; start: string; end: string };
export function boardDateError({ start, end }: Pick<BoardFilters, 'start' | 'end'>) {
  if (!start && !end) return '';
  if (!start || !end) return 'Lengkapi tanggal mulai dan tanggal akhir.';
  if (issueDay(start) !== start || issueDay(end) !== end) return 'Tanggal tidak valid.';
  return start > end ? 'Tanggal akhir harus sama atau setelah tanggal mulai.' : '';
}
export function filterBoard(issues: ViewIssue[], filters: BoardFilters) {
  if (boardDateError(filters)) return [];
  return issues.filter((issue) => (!filters.source || sourceKey(issue.source) === filters.source)
    && (!filters.status || normalizeStatus(issue.status) === filters.status)
    && (!filters.priority || priorityKey(issue.priority) === filters.priority)
    && (!filters.start || Boolean(issueDay(issue.date) && issueDay(issue.date) >= filters.start && issueDay(issue.date) <= filters.end)));
}
export function searchBoard(issues: ViewIssue[], search: string) {
  const term = search.trim().toLocaleLowerCase('id-ID');
  return issues.filter((issue) => !term || [issue.issue_code, issue.issue]
    .some((value) => value?.toLocaleLowerCase('id-ID').includes(term)));
}
export type SortColumn = 'issue_code' | 'source' | 'issue' | 'pic_name' | 'date' | 'priority' | 'due_date' | 'status';
export type BoardSort = { column: SortColumn; ascending: boolean };
export function sortBoard(issues: ViewIssue[], sort: BoardSort) {
  return [...issues].sort((a, b) => {
    let comparison: number;
    if (sort.column === 'date' || sort.column === 'due_date') {
      const first = issueTime(a[sort.column]), second = issueTime(b[sort.column]);
      if (first === null || second === null) return first === second ? 0 : first === null ? 1 : -1;
      comparison = first - second;
    } else {
      comparison = (a[sort.column] ?? '').localeCompare(b[sort.column] ?? '', 'id', { sensitivity: 'base', numeric: true });
    }
    return (sort.ascending ? comparison : -comparison) || `${a.source}:${a.issue_code}`.localeCompare(`${b.source}:${b.issue_code}`);
  });
}
const percent = (count: number, total: number) => total ? count / total * 100 : 0;
function dayDistance(start: string, end: string) {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY);
}
export function summarizeBoard(issues: ViewIssue[], today: string) {
  const statuses = STATUSES.map((status) => ({ ...status, count: issues.filter((issue) => normalizeStatus(issue.status) === status.name).length }));
  const sourceCounts = new Map<string, number>();
  for (const issue of issues) { const source = sourceKey(issue.source); sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1); }
  const sources = [...sourceCounts].sort(([a], [b]) => a.localeCompare(b)).map(([label, count]) => ({ label, count, color: sourceColor(label) }));
  const priorities = [...PRIORITIES.map((priority) => ({ ...priority, count: issues.filter((issue) => priorityKey(issue.priority) === priority.key).length }))];
  const otherPriorities = issues.filter((issue) => !PRIORITIES.some((priority) => priority.key === priorityKey(issue.priority))).length;
  const unresolved = issues.filter((issue) => normalizeStatus(issue.status) !== 'DONE');
  const aging = [
    { label: '0–7 Days', color: '#60a5fa', count: 0 },
    { label: '8–14 Days', color: '#fbbf24', count: 0 },
    { label: '15–30 Days', color: '#fb923c', count: 0 },
    { label: 'More than 30 Days', color: '#f87171', count: 0 },
  ];
  let unknownReceived = 0, futureReceived = 0, onTrack = 0, dueSoon = 0, overdue = 0, noDueDate = 0;
  for (const issue of unresolved) {
    const received = issueDay(issue.date);
    if (!received) unknownReceived++;
    else {
      const days = dayDistance(received, today);
      if (days < 0) futureReceived++;
      else aging[days <= 7 ? 0 : days <= 14 ? 1 : days <= 30 ? 2 : 3].count++;
    }
    const due = issueDay(issue.due_date);
    if (!due) noDueDate++;
    else {
      const days = dayDistance(today, due);
      if (days < 0) overdue++;
      else if (days <= 2) dueSoon++;
      else onTrack++;
    }
  }
  const datedCount = onTrack + dueSoon + overdue;
  return { total: issues.length, statuses, sources, priorities, otherPriorities, unresolved: unresolved.length,
    unknownStatus: issues.length - statuses.reduce((sum, status) => sum + status.count, 0), aging, unknownReceived, futureReceived,
    onTrack, dueSoon, overdue, noDueDate, datedCount, onTrackPercent: datedCount ? percent(onTrack, datedCount) : null };
}
