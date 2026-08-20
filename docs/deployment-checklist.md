# Orbita deployment checklist

Gunakan checklist ini setelah preview atau production URL tersedia.

## 1. Environment

- Jalankan `npm run check:env` pada environment yang memuat seluruh variabel deployment.
- Pastikan `DATABASE_URL` memakai koneksi Neon pooled dan hanya tersedia di server.
- Pastikan `CRON_SECRET`, `VAPID_PRIVATE_KEY`, dan `GEMINI_API_KEY` tidak memakai prefix `NEXT_PUBLIC_`.
- Tambahkan production dan preview origin yang dipakai ke `trusted_origins` Neon Auth.

## 2. Public routes dan PWA

- Jalankan `BASE_URL=https://alamat-deployment npm run smoke:public`.
- Buka DevTools Application dan pastikan manifest serta service worker aktif.
- Install Orbita, jalankan dari launcher, lalu putuskan jaringan dan buka route baru. Fallback offline harus tampil.
- Sambungkan jaringan kembali. Toast koneksi tersedia harus tampil.

## 3. Auth dan onboarding

- Daftar akun baru, masukkan OTP, lalu login.
- Pastikan pocket utama dan kategori awal dibuat satu kali.
- Logout, login kembali, dan pastikan onboarding tidak gagal atau membuat data ganda.
- Uji lupa password sampai tautan reset diterima.

## 4. Data pengguna

- Buat, urutkan, selesaikan, undo, dan hapus task.
- Buat agenda waktu tunggal dan rentang, lalu tambah, edit, serta hapus reminder custom.
- Buat pocket, kategori, pemasukan, dan pengeluaran. Periksa saldo, filter, grouping, dan grafik.
- Pastikan data akun kedua tidak dapat terbaca oleh akun pertama.

## 5. AI dan notifikasi

- Kirim pertanyaan kontekstual dan permintaan di luar scope.
- Buat beberapa draft aksi, pilih sebagian, konfirmasi, lalu retry item yang gagal.
- Aktifkan push, buat task atau reminder jatuh tempo, dan panggil cron dengan bearer secret.
- Pastikan notifikasi in-app dan push hanya dikirim sekali.
