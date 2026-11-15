import { fallbackIssues } from './issue-data';
import type { ViewIssue } from './board-model';

// Extra fictional records for previewing CCR/CRM filters, aging, and due-date states.
const additionalDummyIssues: ViewIssue[] = [
  {
    source: 'CCR', issue_code: 'CCR-2401', issue: 'Kontainer belum diterima sesuai jadwal pengiriman',
    description: 'Status penerimaan kontainer belum diperbarui meskipun jadwal pengiriman sudah terlewati.',
    note: 'Konfirmasi posisi kontainer dan jadwal pengiriman terbaru kepada tim operasional.',
    date: '2026-11-14T09:15:00+07:00', status: 'Open', priority: 'High', due_date: '2026-11-14',
    pic_id: 'EMP-2001', pic_name: 'Andi Pratama',
  },
  {
    source: 'CCR', issue_code: 'CCR-2402', issue: 'Keluhan pelanggan terkait kondisi barang',
    description: 'Pelanggan melaporkan kerusakan kemasan saat barang diterima.',
    note: 'Kumpulkan foto kondisi barang dan koordinasikan pemeriksaan dengan tim terkait.',
    date: '2026-11-10T10:30:00+07:00', status: 'In Progress', priority: 'High', due_date: '2026-11-16',
    pic_id: 'EMP-2002', pic_name: 'Rina Saputri',
  },
  {
    source: 'CCR', issue_code: 'CCR-2403', issue: 'Dokumen pengiriman pelanggan belum lengkap',
    description: 'Dokumen pendukung pengiriman masih menunggu konfirmasi dari pelanggan.',
    note: 'Hubungi pelanggan untuk melengkapi dokumen yang diperlukan.',
    date: '2026-11-01T13:45:00+07:00', status: 'Pending', priority: 'Medium', due_date: '2026-11-20',
    pic_id: 'EMP-2003', pic_name: 'Dewi Lestari',
  },
  {
    source: 'CCR', issue_code: 'CCR-2404', issue: 'Perbaikan alamat penerima pada dokumen pengiriman',
    description: 'Alamat penerima yang sebelumnya tidak sesuai sudah diperbaiki pada dokumen pengiriman.',
    note: 'Dokumen hasil perbaikan sudah dikirimkan kembali kepada pelanggan.',
    date: '2026-10-25T08:20:00+07:00', status: 'Done', priority: 'Low', due_date: '2026-11-10',
    pic_id: 'EMP-2004', pic_name: 'Agus Wirawan',
  },
  {
    source: 'CCR', issue_code: 'CCR-2405', issue: 'Permintaan pembaruan estimasi kedatangan barang',
    description: 'Pelanggan membutuhkan estimasi kedatangan terbaru untuk pengiriman yang masih berjalan.',
    note: 'Periksa jadwal armada dan siapkan pembaruan informasi untuk pelanggan.',
    date: '2026-10-08T14:10:00+07:00', status: 'To Do', priority: 'Medium', due_date: '2026-11-17',
    pic_id: 'EMP-2005', pic_name: 'Sari Permata',
  },
  {
    source: 'CRM', issue_code: 'CRM-2401', issue: 'Dokumen penawaran tidak dapat diunduh',
    description: 'File PDF penawaran belum dapat diunduh setelah pengguna menyimpan perubahan.',
    note: 'Tinjau hasil perbaikan proses pembuatan dokumen penawaran.',
    date: '2026-11-15T08:45:00+07:00', status: 'In Review', priority: 'High', due_date: '2026-11-18',
    pic_id: 'EMP-3001', pic_name: 'Made Arya',
  },
  {
    source: 'CRM', issue_code: 'CRM-2402', issue: 'Data pelanggan tercatat dua kali',
    description: 'Ditemukan dua entri pelanggan dengan informasi perusahaan yang sama.',
    note: 'Periksa kedua entri dan tentukan data pelanggan yang perlu dipertahankan.',
    date: '2026-11-08T11:00:00+07:00', status: 'Open', priority: 'Low', due_date: '2026-11-15',
    pic_id: 'EMP-3002', pic_name: 'Bayu Pratama',
  },
  {
    source: 'CRM', issue_code: 'CRM-2403', issue: 'Tahap peluang penjualan belum tersinkron',
    description: 'Perubahan tahap peluang penjualan belum tampil pada ringkasan aktivitas sales.',
    note: 'Periksa proses sinkronisasi status peluang dan lakukan verifikasi hasilnya.',
    date: '2026-11-03T15:30:00+07:00', status: 'In Progress', priority: 'Medium', due_date: '2026-11-13',
    pic_id: 'EMP-3003', pic_name: 'Putra Wijaya',
  },
  {
    source: 'CRM', issue_code: 'CRM-2404', issue: 'Rekap leads belum menampilkan data terbaru',
    description: 'Leads yang baru ditambahkan belum muncul pada rekap mingguan.',
    note: 'Menunggu konfirmasi kebutuhan sebelum menentukan prioritas penanganan.',
    date: '2026-10-20T09:40:00+07:00', status: 'Pending', priority: null, due_date: '2026-11-12',
    pic_id: 'EMP-3004', pic_name: 'Nadia Putri',
  },
  {
    source: 'CRM', issue_code: 'CRM-2405', issue: 'Pembaruan informasi kontak pelanggan selesai',
    description: 'Informasi kontak pelanggan sudah diperbarui dan diverifikasi oleh tim sales.',
    note: 'Hasil pembaruan sudah dikonfirmasi kepada PIC pelanggan.',
    date: '2026-10-05T10:10:00+07:00', status: 'Done', priority: 'Medium', due_date: '2026-10-31',
    pic_id: 'EMP-3005', pic_name: 'Fajar Nugroho',
  },
];

// Temporary source: retain the four original HRMS examples plus ten CCR/CRM examples.
// To connect live data later, replace this loader while keeping its ViewIssue[] output.
export async function loadBoardIssues(signal: AbortSignal): Promise<ViewIssue[]> {
  signal.throwIfAborted();
  const originalIssues = [...fallbackIssues.hrms, ...fallbackIssues.crm, ...fallbackIssues.ccr].map((issue) => ({
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
  return [...originalIssues, ...additionalDummyIssues.map((issue) => ({ ...issue }))];
}
