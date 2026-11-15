import { fallbackIssues } from './issue-data';
import type { ViewIssue } from './board-model';

// Temporary source: reuse the original four HRMS examples without querying Supabase.
// To connect live data later, replace this loader while keeping its ViewIssue[] output.
export async function loadBoardIssues(signal: AbortSignal): Promise<ViewIssue[]> {
  signal.throwIfAborted();
  return [...fallbackIssues.hrms, ...fallbackIssues.crm, ...fallbackIssues.ccr].map((issue) => ({
    source: issue.source,
    issue_code: issue.ticket_code,
    issue: issue.title,
    description: issue.description,
    note: issue.task,
    date: issue.created_at,
    status: issue.status,
    priority: issue.priority,
    due_date: issue.due_date,
    pic_id: issue.employee_id,
    pic_name: null,
  }));
}
