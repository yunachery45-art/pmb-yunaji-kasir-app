# Sistem Kasir PMB Bidan Yunaji Sri Rejeki — Blueprint Terkunci

Status: **LOCKED / ACUAN UTAMA**

Dokumen ini menjadi acuan sebelum pengembangan fitur berikutnya. Perubahan dilakukan satu per satu, diuji, lalu baru dilanjutkan ke tahap berikutnya.

## 1. Prinsip Utama
- Aplikasi web responsif untuk HP dan laptop.
- Laman awal, Laman PJ Kasir/Staff, dan Laman Admin mengikuti mockup yang telah disepakati.
- Sistem harus dinamis dan sebisa mungkin tidak memerlukan perubahan kode untuk konfigurasi operasional.
- Admin menjadi satu-satunya pihak yang mengelola konfigurasi sistem.
- Data transaksi lama tidak boleh rusak ketika konfigurasi berubah.
- Staff/PJ hanya mendapat akses sesuai hak aksesnya.

## 2. Halaman Awal — Pilih PJ Kasir
- Branding/logo/nama/tagline berasal dari pengaturan.
- Daftar PJ berasal dari data staff aktif.
- Avatar/foto PJ berasal dari data staff.
- PJ yang dinonaktifkan tidak muncul untuk login baru.
- Tidak menggunakan password untuk alur PJ sesuai rancangan saat ini.

## 3. Laman PJ Kasir / Staff
Menu utama:
- Beranda
- Pelayanan
- Penjualan
- Pengeluaran
- Kas Harian
- Rekap Saya
- Pasien Hari Ini
- Keluar

Beranda/rekap menampilkan statistik operasional yang relevan tanpa membuka nominal ke staff yang tidak berhak.

Pelayanan memiliki field pelaksana yang dapat dipilih dari staff aktif sesuai hak akses.

## 4. Laman Admin
Menu utama:
- Dashboard
- Pelayanan
- Penjualan
- Pengeluaran
- Kas Harian
- Keuangan
- Data Pasien
- Rekap PJ
- Laporan
- Data Master
- Audit Log
- Pengaturan
- Keluar

Admin dapat melihat rekap lintas PJ, pelaksana, jenis pelayanan, metode pembayaran, nominal, dan laporan sesuai hak akses.

## 5. Pengaturan Dinamis
### Branding & Tampilan
- Logo
- Nama PMB
- Tagline
- Favicon/icon aplikasi
- Warna utama
- Warna sekunder
- Warna tombol
- Warna sidebar
- Warna background
- Foto/banner halaman awal
- Pengaturan gaya visual dasar

### Identitas PMB
- Nama resmi
- Alamat
- Nomor WhatsApp
- Instagram
- Facebook
- TikTok
- Informasi footer/kontak

### Staff & PJ
- Tambah staff
- Edit nama
- Foto/avatar
- Aktif/nonaktif
- Arsip staff
- Hak akses
- Status PJ Kasir
- Status Pelaksana
- Staff lama tidak dihapus permanen agar histori tetap valid

### Pelayanan
- Nama pelayanan
- Kategori
- Tarif
- Status aktif/nonaktif
- Urutan tampilan

### Keuangan
- Kategori pemasukan
- Kategori pengeluaran
- Metode pembayaran
- Status aktif/nonaktif

### Penjualan
Kategori awal yang wajib tersedia:
1. Minuman
2. Makanan
3. Susu

Struktur penjualan harus mendukung penambahan kategori/produk baru melalui Admin tanpa perubahan kode.
Produk minimal memiliki nama, kategori, harga jual, satuan, status aktif/nonaktif, dan dapat dikembangkan untuk stok/modal bila dibutuhkan.

### Kas Harian
- Kas awal
- Buka kas
- Transaksi
- Tutup kas
- Selisih kas
- Catatan penutupan
- Satu hari satu kas
- Kas yang telah ditutup tidak dapat dibuka kembali kecuali mekanisme koreksi Admin yang dirancang khusus

### Teks Sistem & Menu
- Judul login
- Deskripsi login
- Label tombol
- Pesan sistem
- Footer
- Nama menu
- Aktif/nonaktif menu bila memang diperlukan

### Admin & Keamanan
- Identitas admin
- Hak akses
- Pengaturan autentikasi
- Audit log
- Pengamanan data pasien dan keuangan

## 6. Urutan Pengerjaan yang Dikunci
1. **Kunci arsitektur + struktur data dinamis**
2. Pengaturan Branding & Identitas PMB
3. Data Staff/PJ dinamis
4. Jenis Pelayanan & tarif dinamis
5. Penjualan: kategori Minuman/Makanan/Susu + master produk dinamis
6. Kas Harian
7. Pengeluaran & kategori dinamis
8. Rekap PJ/Staff
9. Dashboard Admin
10. Data Pasien & logbook
11. Laporan & export
12. Audit Log
13. Keamanan/RLS dan final testing
14. Uji responsif HP + laptop
15. Final launch

Setiap tahap: **implementasi → test → revisi → kunci → lanjut tahap berikutnya**.

## 7. Aturan Revisi
- Jangan mengubah fitur yang sudah dikunci tanpa persetujuan eksplisit.
- Jangan menghapus data histori hanya karena master data berubah.
- Jangan hard-code nama staff, logo, tarif, kategori, metode pembayaran, atau branding yang seharusnya dinamis.
- Perubahan database harus diuji setelah diterapkan.
