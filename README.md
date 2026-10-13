# Andima-MID

## Struktur folder

```text
app/                   Halaman, layout, dan endpoint Next.js
  api/activity/        Endpoint pencatatan aktivitas
  dashboard/           Halaman MID
  login/               Halaman login
  register/            Halaman registrasi
  smki/dashboard/      Halaman SMKI
components/            Komponen bersama untuk beberapa area aplikasi
lib/                   Konfigurasi client dan helper umum
query/                 Helper pengambilan dan pencatatan data Supabase
public/                Aset statis aplikasi
supabase/migrations/   SQL migration yang dijalankan manual
tests/unit/            Pengujian dengan mock, tanpa database produksi
```

`.next/` dan `node_modules/` dibuat otomatis oleh Next.js dan npm.
`.env.local` berisi konfigurasi lokal dan tidak disimpan ke Git.

## Pengujian Log Activity

```bash
npm run test:activity
```
