# PISD-B

Halaman `/login` dan `/register` disalin dari proyek Andima-MID.

## Menjalankan

1. Jalankan `npm install`.
2. Buat `.env.local` di root proyek:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

3. Jalankan `npm run dev`, lalu buka `/login` atau `/register`.

Gunakan proyek Supabase dengan tabel dan konfigurasi autentikasi yang sesuai dengan kode register. File `.env.local` tidak disimpan di Git.

Folder dashboard belum termasuk dalam transfer ini; tujuan redirect setelah login perlu disediakan. Halaman menggunakan variabel font `--font-syne` dan `--font-montserrat` yang belum dikonfigurasi pada layout bawaan repo ini.
