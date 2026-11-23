# Pilihan bahasa Indonesia dan Inggris

Tombol EN / ID berada di topbar MID dan SMKI, dekat profil. Landing page tidak diubah.
Pilihan disimpan di browser. Jenis font dan desain halaman tetap mengikuti project.

## Yang diterjemahkan

- Menu, judul, tombol, status, departemen, dan label memakai kamus di `lib/i18n/messages.ts`.
- Field teks bebas yang ditandai `Text dynamic`, seperti judul/deskripsi issue, note,
  jabatan yang belum ada di kamus, dan deskripsi aktivitas, memakai Azure Translator.
- Hanya teks pada halaman yang sedang dirender yang diminta, bukan seluruh database.
- Nama orang/perusahaan, email, ID, nomor pekerjaan, IP, nilai form, dan nilai filter
  tetap mengikuti data asli. Nama yang ada di deskripsi diberi placeholder jika
  identitas tersebut tersedia pada record yang ditampilkan.
- Tanggal ditampilkan sesuai bahasa pilihan dengan zona waktu Jakarta.

Data sumber di Supabase tidak diperbarui. Tidak ada migration, perubahan RLS,
atau perubahan pada alur pendaftaran/login/logout. Panggilan Azure mengirim teks
yang hendak diterjemahkan ke Microsoft; jangan masukkan informasi rahasia ke teks tersebut.

## Mengaktifkan Azure Translator

1. Buat resource **Translator**, pilih paket **Free F0**, bukan S1.
2. Buka **Keys and Endpoint**. Isi `AZURE_TRANSLATOR_KEY` dan
   `AZURE_TRANSLATOR_REGION` di `.env.local`. Gunakan region yang tercantum di Azure,
   misalnya `southeastasia`, atau `global` untuk resource Global.
   Jangan menggunakan awalan `NEXT_PUBLIC_`.
3. Restart `npm run dev`. Untuk Vercel, isi environment yang sama, lalu redeploy.
4. Masuk sebagai pengguna, klik EN/ID, dan coba deskripsi issue.
5. Ikon informasi Azure tidak ditampilkan di topbar. Kuota dapat diperiksa melalui Azure Portal.

Contoh nama environment tersedia di `translation.env.example`, tanpa credential.
Azure belum dapat diuji langsung sebelum credential diisi. Jangan membagikan key di chat/Git.

## Kuota

F0 saat penulisan menyediakan 2 juta karakter per bulan. Tidak ada perubahan paket
berbayar otomatis dari kode ini. Kuota resmi ditegakkan oleh Azure, bukan penghitung
lokal Next.js. Cache mengurangi permintaan berulang tetapi tidak menjamin pemakaian
akan selalu di bawah kuota.

Untuk memeriksa metrik global melalui aplikasi, pengelola perlu mengisi empat
environment Azure Monitor yang opsional. Beri service principal hak **Monitoring Reader**
hanya pada resource Translator. Tidak perlu Contributor atau akses database.

Hanya `dellarosa@andima.co.id` dan `griselda@andima.co.id` yang dapat membaca
metrik pemakaian resource bersama. Endpoint `/api/translate/usage` memberi pengguna lain status konfigurasi saja; tidak ada popup kuota di UI.
Hasil dihitung dari `TextCharactersTranslated` bulan kalender UTC. Metrik dapat
terlambat dan bukan saldo penagihan resmi; F0 kadang tidak menyediakan metrik ini.
Jika kosong/ditolak/belum dikonfigurasi, endpoint menyatakan kuota belum diketahui,
bukan menganggap pemakaian nol. Pemeriksaan memakai akses read-only ke Azure Monitor.

## Ketika penerjemah tidak tersedia

Menu dari kamus tetap berganti bahasa. Untuk teks bebas, aplikasi menampilkan data
asli saat konfigurasi belum tersedia, jaringan bermasalah, provider menolak placeholder,
atau batas Azure tercapai. Sistem utama tidak diblokir. Gangguan jaringan sementara dicoba ulang maksimal tiga kali. Setelah masalah selesai,
koneksi kembali atau klik tombol bahasa akan melanjutkan permintaan terjemahan. Tidak ada terjemahan yang ditulis ke database.

Cache terjemahan di browser hanya ada dalam memori dan dibersihkan saat identitas
pengguna berubah. Cache server dibatasi jumlah dan umur serta dipisahkan per pengguna;
pada Vercel cache dapat hilang kapan saja antar-instance/restart. Pembatasan permintaan
server bersifat lokal per instance; batas kuota global tetap mengikuti Azure.

Referensi: https://azure.microsoft.com/en-us/pricing/details/translator/
https://learn.microsoft.com/en-us/azure/ai-services/translator/text-translation/reference/metrics
