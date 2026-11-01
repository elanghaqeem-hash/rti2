# RTICORE — Master Produk RTI 2026

**Referensi:** PT Riset Teknologi Indonesia, *Cybersecurity Services & Solutions*, v2.0/2026, halaman 8–17.

## Lingkup yang diterapkan
- 5 pilar layanan cybersecurity, 1 kelompok riset pendukung, dan 3 pilar lintas industri.
- 74 SKU stabil dan 249 sub-layanan/cakupan (termasuk migrasi 0012). SKU tidak boleh didaur ulang sebagai identitas produk lain.
- Penyimpanan SQLite/Cloudflare D1 pada `rti_product_categories`, `rti_products`, `rti_product_scopes`, `rti_product_events`.
- Harga dibiarkan **NULL** (belum disetujui); tidak dibuat data dummy untuk produk atau pelanggan.
- `INSERT OR IGNORE` menjaga edit produk/scope dan harga lama saat migration diulang.
- Admin: `/admin/products` (login diperlukan); API `/api/admin/products` mendukung daftar, tambah dan ubah produk/cakupan, serta nonaktif tanpa menghapus histori.
- Read-only API `/api/products` hanya mengembalikan produk aktif; jika database belum diinisialisasi, respons 503.
- Halaman `/contact` mengambil layanan dari Master Produk jika tersedia dan kembali ke katalog lama saat API belum siap.


## Ekstensi lintas sektor: Training, System Development, Technology Provider
Penambahan idempoten `0012_rticore_sector_portfolios.sql` memperluas katalog menjadi **9 kelompok, 74 SKU dan 249 cakupan layanan**. Rinciannya:
- `RTI-TRN-001` s.d. `RTI-TRN-014`: Training Provider & Corporate Academy (cybersecurity, FSI risk, GRC, BCM, OT/ICS, SPBE, AI, dan ToT).
- `RTI-DEV-001` s.d. `RTI-DEV-014`: System Development & Digital Solutions (ERP, aplikasi perbankan, SPBE, MES, GRC, CRMS, DMS, API, BI, dan HRIS).
- `RTI-TPR-001` s.d. `RTI-TPR-014`: Technology Provider & Infrastructure Solutions (network, server, EDR/XDR, SIEM, PAM, backup, cloud, OT, OEM dan infrastruktur pemerintah).

Tabel `rti_product_industries` menandai produk untuk **FSI, Manufacturing, Government, Other** secara eksplisit; tidak membuat klaim sebagai authorized OEM partner atau pemegang sertifikasi tanpa dokumen. Semua harga produk baru **NULL** sampai disetujui.

**Implementasi simulasi:** Cloudflare Worker `rticore-sales-sim` telah aktif dengan katalog cloud KV khusus `RTICORE_PRODUCT_MASTER`. Lingkungan simulasi mendukung filter industri pada Lead dan ekspor CSV. Hal tersebut **tidak** menyatakan migrasi D1 ERP `rti2` sudah dijalankan. Production ERP memerlukan 0011 + 0012, database aktif, security gate, dan verifikasi lintas modul.

## Jalur aktivasi yang diperlukan
1. Selesaikan **security gate** npm audit (CI saat implementasi ini mendeteksi dua kerentanan high dan satu critical pada dependency lama). Jangan abaikan audit dependency.
2. Jalankan test lengkap dan build produksi setelah perbaikan dependency.
3. Pastikan database runtime sudah tersedia. Untuk Cloudflare, binding `RTI_DB` harus terpasang; untuk Node, `RTI_DB_PATH` harus diarahkan ke storage persisten yang disetujui.
4. Ambil backup database; lalu dari Admin buka `/admin/system` dan jalankan **Initialize / Apply Pending Migrations**, atau jalankan `node scripts/db-migrate.mjs up --db /path/to/rti.sqlite` pada Node.
5. Verifikasi `rti_products = 32`, `rti_product_scopes = 81`, `rti_product_categories = 6`, dan seluruh `price_amount IS NULL` untuk katalog awal yang baru.
6. Buka `/admin/products`, lakukan UAT Admin, cek pilihan di `/contact`, dan verifikasi kembali data transaksi lama.
7. Lakukan deployment terkendali dan pengujian pengguna yang nyata. **Bukti unit-test tidak menggantikan UAT runtime/deployment.**

## Batasan
Master produk ini disiapkan pada repository `elanghaqeem-hash/rti2`, terpisah dari Worker `rticore-sales-sim` yang hanya digunakan untuk simulasi sales. Perubahan tidak berarti migrasi database produksi atau deployment sudah terjadi. Untuk pengintegrasian lebih jauh dengan quotation/BOQ/ERP PSA, diperlukan pencocokan identitas produk dan validasi business rules harga yang terpisah.
