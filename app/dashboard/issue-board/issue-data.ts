export type IssueStatus = 'To Do' | 'In Progress' | 'Open' | 'Pending' | 'Done';
export type IssuePriority = 'High' | 'Medium' | 'Low';

export type Issue = {
  id: string;
  ticket_code: string;
  reporter_department: string;
  title: string;
  employee_id: string;
  status: IssueStatus;
  priority: IssuePriority | null;
  due_date: string | null;
  created_at: string;
  source: 'HRMS' | 'CRM' | 'CCR';
  description: string;
  task: string;
};

export type IssueGroups = { hrms: Issue[]; crm: Issue[]; ccr: Issue[] };

export const issueDateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta',
});

// Four sample HRMS tickets matching the requested compact board; no live issue API is configured yet.
export const fallbackIssues: IssueGroups = {
  hrms: [
    {
      id: "HR-1001",
      ticket_code: "HRMS-2401",
      reporter_department: "Human Resource",
      title: "Data payroll karyawan bulan September belum terupdate di dashboard HRMS",
      employee_id: "EMP-1042",
      status: "In Progress",
      priority: null,
      due_date: null,
      created_at: "2026-09-27T08:15:00.000Z",
      source: "HRMS",
      description: "Perubahan data payroll bulan September belum tersinkron ke dashboard.",
      task: "Periksa proses sinkronisasi payroll",
    },
    {
      id: "HR-1002",
      ticket_code: "HRMS-2402",
      reporter_department: "Human Resource",
      title: "Pengajuan cuti tahunan belum muncul pada rekap tim",
      employee_id: "EMP-1184",
      status: "Pending",
      priority: null,
      due_date: null,
      created_at: "2026-09-29T09:30:00.000Z",
      source: "HRMS",
      description: "Pengajuan cuti sudah disetujui atasan tetapi belum tercatat pada rekap.",
      task: "Validasi status persetujuan cuti",
    },
    {
      id: "HR-1003",
      ticket_code: "HRMS-2403",
      reporter_department: "Human Resource",
      title: "Akun karyawan baru belum aktif setelah proses onboarding",
      employee_id: "EMP-1250",
      status: "Open",
      priority: null,
      due_date: null,
      created_at: "2026-09-30T07:45:00.000Z",
      source: "HRMS",
      description: "Karyawan baru belum dapat mengakses portal HRMS.",
      task: "Aktifkan akun dan verifikasi akses",
    },
    {
      id: "HR-1004",
      ticket_code: "HRMS-2404",
      reporter_department: "Human Resource",
      title: "Perbaikan format laporan kehadiran telah selesai",
      employee_id: "EMP-1091",
      status: "Done",
      priority: null,
      due_date: null,
      created_at: "2026-10-01T11:10:00.000Z",
      source: "HRMS",
      description: "Kolom total jam kerja sudah ditampilkan pada laporan.",
      task: "Perbarui format laporan kehadiran",
    },
  ],
  crm: [],
  ccr: [],
};

export const issues = [...fallbackIssues.hrms, ...fallbackIssues.crm, ...fallbackIssues.ccr];
