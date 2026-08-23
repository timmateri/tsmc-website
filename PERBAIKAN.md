# Perbaikan — Optimisasi Mobile & Keamanan

Ringkasan perubahan yang sudah diterapkan pada codebase, plus cara deploy.

## Yang diubah

### 1. Menu hamburger untuk mobile — `public/index.html`
Sebelumnya menu navigasi hilang total di layar ≤820px tanpa pengganti. Sekarang ada
tombol hamburger (☰) yang membuka panel menu dropdown (Jadwal, Berita, Belajar +
3 modul, Galeri, Anggota, dan "Cek Booking & Kartu Stempel"). Menu menutup otomatis
saat memilih item atau menekan di luar area.

### 2. Anti auto-zoom iOS — `public/index.html` & `public/admin.html`
Semua `<input>`, `<select>`, `<textarea>` dinaikkan ke `font-size:16px`. iOS Safari
tidak lagi melakukan zoom paksa saat form booking / login diisi.

### 3. Tombol "Book Slot" sticky di mobile — `public/index.html`
Bar tetap di bawah layar (`#mobile-cta`) agar tombol book selalu terjangkau ibu jari,
menghormati `safe-area-inset` (iPhone dengan home indicator).

### 4. Open Graph / share preview — `public/index.html` + `public/og-cover.png`
Ditambahkan meta `og:*` dan `twitter:*` + gambar cover 1200×630 (`og-cover.png`).
Sekarang link yang dibagikan di WhatsApp/Instagram tampil dengan judul, deskripsi,
dan gambar.

### 5. PWA / installable — `public/manifest.json`, `public/sw.js`, `icon-192/512.png`
Website bisa "Add to Home Screen" dan terbuka seperti aplikasi. Service worker
memakai strategi **network-first** dan **tidak pernah** meng-cache `/api/` atau
`/admin` (data selalu fresh & privat); cache hanya sebagai cadangan saat offline.

### 6. Halaman 404 ramah — `public/404.html` + `src/worker.js`
Route yang tidak ada dulu menampilkan layar kosong. Sekarang muncul halaman 404
ber-branding dengan tombol kembali ke beranda.

### 7. Proteksi brute-force login admin — `src/worker.js` + `schema.sql`
Endpoint `/api/admin/login` kini dibatasi: maksimum 8 percobaan gagal per IP dalam
15 menit (respons `429`). Hitungan direset saat login berhasil. Memakai tabel D1
`login_attempts` yang dibuat otomatis.

## Cara deploy

```bash
# dari folder project
npm run deploy          # deploy worker + semua aset di public/
```

Tabel `login_attempts` dibuat otomatis oleh worker saat login pertama, jadi
`npm run db:setup` tidak wajib. (Kalau ingin rapi, schema.sql sudah diperbarui juga.)

Untuk preview lokal sebelum deploy:

```bash
npm run dev             # buka URL yang muncul, lalu kecilkan browser / DevTools mode HP
```

## Belum dikerjakan (butuh keputusan infrastruktur)

- **Bukti bayar → Cloudflare R2.** Saat ini bukti disimpan base64 di D1 (dibatasi 1,5 MB/gambar).
  Untuk skala ratusan booking, sebaiknya pindah ke R2 + thumbnail + paginasi di
  `/api/admin/bookings`. Perlu membuat bucket R2 dan migrasi data — belum dilakukan.
- **Rate limit endpoint publik** `/api/bookings/lookup` & `/api/loyalty` (enumerasi).
  Bisa memakai pola throttle D1 yang sama; belum ditambahkan agar tidak mengganggu
  pemakaian normal. Rekomendasi: batasi per IP kalau nanti trafik naik.

## Catatan
Item ini **sudah baik** di kode dan tidak diubah: token sesi admin sudah kedaluwarsa
30 hari & divalidasi di server; nama peserta di jadwal publik sudah disamarkan
(`shortName`); ukuran gambar upload sudah dibatasi.
