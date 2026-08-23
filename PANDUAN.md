# 📖 Panduan Website The Social Mahjong Club

Panduan ini ditulis untuk pemula. Ikuti dari atas ke bawah.

Ada 2 bagian besar:

- **Bagian A — Setup pertama kali** (dilakukan SEKALI saja, ±20 menit)
- **Bagian B — Mengelola website sehari-hari** (semua lewat browser, tanpa coding)

---

## Bagian A — Setup Pertama Kali

### Langkah 1: Install Node.js

1. Buka https://nodejs.org
2. Download versi **LTS** (tombol hijau besar), lalu install seperti aplikasi biasa (next-next-finish).
3. Untuk mengecek: buka aplikasi **Terminal** (di Mac: tekan Cmd+Space, ketik "Terminal", Enter), lalu ketik:
   ```
   node --version
   ```
   Kalau muncul angka versi (misal `v22.x.x`), berarti berhasil.

### Langkah 2: Buka Terminal di folder website

Di Terminal, ketik (lalu Enter):

```
cd "/Users/dcstormrage/Documents/Coding/TSMC website"
```

> 💡 Semua perintah di bawah ini dijalankan dari folder ini. Kalau kamu menutup Terminal dan membukanya lagi, ulangi perintah `cd` di atas dulu.

### Langkah 3: Install alat deploy (wrangler)

```
npm install
```

Tunggu sampai selesai (±1 menit). Ini menginstall "wrangler", alat resmi Cloudflare untuk meng-upload website.

### Langkah 4: Login ke akun Cloudflare

```
npx wrangler login
```

Browser akan terbuka → klik **Allow**. Gunakan akun Cloudflare yang sama dengan yang dipakai untuk mock website kamu.

### Langkah 5: Buat database

Website ini menyimpan jadwal, booking, berita, dan foto di database bernama D1 (gratis dari Cloudflare).

```
npx wrangler d1 create tsmc-db
```

Hasilnya akan menampilkan beberapa baris, salah satunya seperti ini:

```
"database_id": "abc12345-6789-...."
```

**Salin kode `database_id` itu**, lalu buka file `wrangler.jsonc` di folder ini (bisa dengan TextEdit/Notepad/VS Code) dan ganti teks `GANTI-DENGAN-DATABASE-ID-ANDA` dengan kode tadi. Simpan filenya.

### Langkah 6: Isi database dengan tabel + contoh data

```
npm run db:setup
```

Kalau ditanya `Ok to proceed?` ketik `y` lalu Enter.

> ⚠️ Jalankan perintah ini **satu kali saja**. Kalau dijalankan dua kali, contoh jadwal/berita akan muncul dobel (tidak berbahaya — tinggal dihapus lewat dashboard admin).

### Langkah 7: Buat password admin

```
npx wrangler secret put ADMIN_PASSWORD
```

Ketik password yang kamu mau (tidak akan terlihat saat diketik), lalu Enter. **Ingat baik-baik password ini** — dipakai untuk masuk dashboard admin.

### Langkah 8: Deploy! 🚀

```
npm run deploy
```

Selesai! Website kamu sekarang live di:

- **Website publik:** https://socialmahjong.tsmc-mahjong.workers.dev
- **Dashboard admin:** https://socialmahjong.tsmc-mahjong.workers.dev/admin

Website baru ini menggantikan mock lama di alamat yang sama.

### Kalau nanti ada perubahan kode

Konten (jadwal, berita, foto) TIDAK butuh deploy ulang — semua lewat dashboard admin.
Deploy ulang hanya perlu kalau file kode diubah (misal ganti warna atau tambah fitur):

```
cd "/Users/dcstormrage/Documents/Coding/TSMC website"
npm run deploy
```

---

## Bagian B — Mengelola Website Sehari-hari

Semua dilakukan di **dashboard admin** lewat browser (bisa dari HP!):

👉 **https://socialmahjong.tsmc-mahjong.workers.dev/admin**

Masukkan password admin → kamu akan melihat 6 tab.

### 📅 Tab "Jadwal" — Mengupload jadwal bermain

1. Isi form **Tambah Jadwal Baru**: tanggal, jam, tempat, jumlah meja, fee.
2. Total kursi otomatis terisi (jumlah meja × 4), tapi bisa diubah manual.
3. Klik **Simpan Jadwal** → langsung tampil di website.

Untuk mengubah jadwal, klik **✎ Edit** pada jadwal di daftar bawah. Untuk menutup pendaftaran tanpa menghapus, ubah statusnya jadi **Ditutup**.

> Jadwal yang tanggalnya sudah lewat otomatis hilang dari website publik (tetap tersimpan di dashboard).

### 📋 Tab "Booking" — Memverifikasi pembayaran (rutinitas paling penting!)

Alur booking anggota:

1. Anggota pilih jadwal di website → isi nama + nomor WA → pilih metode bayar.
2. Website menampilkan QRIS / nomor rekening → anggota bayar → upload bukti.
3. Booking muncul di tab ini dengan status **CEK BUKTI ➜** (biru).
4. **Tugas kamu:** klik foto bukti untuk memperbesar → cocokkan dengan mutasi rekening → klik **✓ Konfirmasi**.
5. Anggota bisa cek statusnya sendiri di website ("Cek status booking") dengan kode booking atau nomor WA-nya.

Tips:

- Ada link **WA ↗** di setiap booking untuk langsung chat anggota (misal memberi tahu "pembayaran diterima, sampai jumpa Sabtu!").
- Booking **MENUNGGU BAYAR** (kuning) yang tidak dibayar dalam 24 jam otomatis dilepas dari hitungan kursi — tidak perlu kamu apa-apakan.
- Kalau sesi penuh, anggota baru masuk **WAITING LIST** (merah) — kalau ada yang batal, konfirmasi manual anggota waiting list lalu hubungi via WA.

**Loyalty card (otomatis):** setiap sesi yang dihadiri anggota (booking terkonfirmasi yang tanggalnya sudah lewat) = 1 stempel, dihitung per nomor WA. 5 stempel = 1 permainan gratis, dan ada tier: 🐣 Chicken Hand (0–4x) → 🀄 Pong! (5–14x) → 🏆 Sik Wu (15–29x) → 👑 Limit Hand (30x+). Kartu stempelnya muncul otomatis di bagian "Booking Kamu" di website. Saat anggota menukar stempel, muncul booking berlabel **🎁 KLAIM REWARD** di tab Booking — cek sekilas (misalnya via WA), lalu tekan **✓ Konfirmasi**; stempelnya otomatis terpotong 5. Kamu tidak perlu mencatat apa pun manual.

### 🀄 Tab "Anggota" — Stempel loyalty & koreksi refund

Daftar semua anggota yang pernah booking, lengkap dengan tier, jumlah main, dan isi kartu stempelnya. Ada kolom pencarian nama/nomor WA.

- **Kasus refund:** cara paling rapi adalah membatalkan booking-nya di tab Booking — stempel otomatis hilang. Kalau booking-nya sudah lama atau susah dicari, pakai tombol **−1 stempel** di tab ini.
- **+1 stempel** untuk bonus manual (hadiah event, kompensasi, dsb).
- Koreksi berlaku sekaligus ke kartu stempel dan hitungan tier, dan tercatat terpisah dari hitungan otomatis (tampil sebagai "koreksi +1/−1").

### 📰 Tab "Berita" — Mengubah konten berita

1. Pilih kategori (KOMUNITAS / EVENT / RECAP / PENGUMUMAN), isi judul, ringkasan, dan isi lengkap.
2. Boleh tambah foto — otomatis dikompres, tidak perlu di-resize dulu.
3. Klik **Publikasikan** → langsung tampil di bagian "Berita & Event".
4. Pilih **Draft** kalau mau menulis dulu tanpa menampilkan.

### 🏆 Tab "Event" — Kalender turnamen

Untuk daftar singkat di kotak hijau "KALENDER TURNAMEN & EVENT": isi label tanggal (misal `12 Sep`), tanggal untuk pengurutan, dan nama event. Cocok untuk turnamen, friendly match, sesi spesial.

### 📷 Tab "Galeri" — Mengupload foto

1. Klik **Pilih foto** — bisa memilih banyak foto sekaligus.
2. Foto otomatis dikompres di browser supaya website tetap cepat.
3. Beri keterangan (misal "Sesi Sabtu malam, 29 Agustus") → **Upload**.

### ⚙️ Tab "Pengaturan"

- **Pengumuman** — teks bar hitam di paling atas website (kosongkan untuk menyembunyikan).
- **Statistik** — angka "anggota aktif" dan "sesi sejak 2023" di halaman depan.
- **Pembayaran** — nama bank, nomor rekening, dan **gambar QRIS** (upload screenshot QR dari aplikasi merchant kamu; ini yang dilihat anggota saat booking).
- **Kontak** — ada **dua kanal WhatsApp terpisah**: (1) *WA admin* (format `628xxx`) — nomor pribadi/operasional untuk konfirmasi pembayaran, dipakai di tombol "Konfirmasi via WA Admin" setelah booking dan di footer; (2) *Link grup WA komunitas* (`https://chat.whatsapp.com/...`) — undangan bergabung, tampil di bagian Anggota, footer, dan sebagai tombol "Gabung Grup" setelah booking sukses. Plus Instagram dan email.

Jangan lupa klik **Simpan Semua Pengaturan** setelah mengubah.

---

## Pertanyaan Umum

**Bagaimana ganti password admin?**
Di Terminal (dari folder website): `npx wrangler secret put ADMIN_PASSWORD` → ketik password baru → `npm run deploy`.

**Apakah ini gratis?**
Ya. Paket gratis Cloudflare (100.000 request/hari, database 5 GB) jauh lebih dari cukup untuk komunitas.

**Bagaimana backup data?**
`npx wrangler d1 export tsmc-db --remote --output=backup.sql` — simpan file `backup.sql` di tempat aman. Lakukan sebulan sekali.

**Website error / tidak muncul?**
1. Cek https://dash.cloudflare.com → Workers & Pages → socialmahjong → tab "Logs".
2. Atau jalankan ulang `npm run deploy`.
3. Kalau buntu, buka sesi Claude lagi dan tempelkan pesan errornya.

**Bisa pakai domain sendiri (misal tsmc.id)?**
Bisa. Di dash.cloudflare.com → Workers & Pages → socialmahjong → Settings → Domains & Routes → Add custom domain.

**Bagaimana kalau mau pembayaran otomatis (tanpa cek bukti manual)?**
Nanti bisa ditambahkan payment gateway (Midtrans/Xendit). Butuh pendaftaran akun bisnis dan ada biaya per transaksi. Minta bantuan Claude saat sudah siap.

---

## Menyimpan Kode di GitHub (Backup & Riwayat)

Folder ini sudah menjadi repo Git — setiap perubahan kode bisa dilacak dan dikembalikan. Supaya kodenya juga ter-backup online, push ke GitHub (sekali setup):

**Setup (±5 menit):**

1. Buat akun di https://github.com (gratis) kalau belum punya.
2. Buka https://github.com/new → Repository name: `tsmc-website` → pilih **Private** → **jangan** centang "Add a README" → klik **Create repository**.
3. Di Terminal (dari folder website), jalankan dua baris ini — ganti `USERNAME` dengan username GitHub kamu:
   ```
   git remote add origin https://github.com/USERNAME/tsmc-website.git
   git push -u origin main
   ```
   Saat diminta login, ikuti petunjuk di layar (biasanya membuka browser untuk otorisasi).

   > 💡 Kalau cara di atas terasa ribet, cara paling mudah untuk pemula: install aplikasi **GitHub Desktop** (https://desktop.github.com) → File → Add local repository → pilih folder ini → klik **Publish repository**.

**Rutinitas setiap selesai mengubah kode** (konten harian lewat dashboard admin TIDAK perlu ini):

```
git add -A
git commit -m "tulis ringkasan perubahannya di sini"
git push
```

Catatan: file `.dev.vars` (password lokal) dan `node_modules` otomatis dikecualikan dari Git — aman, tidak akan ikut ter-upload.

Bonus untuk nanti: kalau repo sudah di GitHub, Cloudflare bisa disambungkan (dash.cloudflare.com → Workers & Pages → socialmahjong → Settings → Build) supaya setiap `git push` otomatis deploy — menggantikan `npm run deploy`. Minta bantuan Claude kalau mau mengaktifkan ini.

---

## Rekomendasi Konten Agar Website Makin Menarik

Yang sudah ada di website: jadwal + booking, berita & event, kalender turnamen, modul belajar, galeri, aturan & etika, direktori anggota.

Ide konten untuk dikembangkan (urut dari yang paling berdampak):

1. **Recap rutin tiap sesi** (pakai tab Berita, kategori RECAP) — foto + cerita singkat + siapa yang menang. Ini alasan anggota kembali membuka website tiap minggu.
2. **Leaderboard / klasemen liga** — peringkat pemain per musim. Bikin kompetisi sehat dan orang mengecek posisinya terus.
3. **Player of the Month** — profil singkat 1 anggota per bulan (foto, gaya main, hand favorit). Membuat anggota merasa dilihat.
4. **Konten belajar berseri** — lanjutkan modul: strategi defense, membaca discard lawan, istilah Kanton sehari-hari di meja. Konten belajar adalah magnet anggota baru.
5. **"Hand of the Week"** — foto satu hand menarik dari sesi terakhir + cara menghitung faan-nya. Edukatif dan seru dibagikan di grup WA/IG.
6. **Testimoni anggota baru** — 2–3 kalimat pengalaman pertama ikut sesi, untuk meyakinkan orang yang masih ragu datang.
7. **FAQ untuk pemula** — "Tidak bisa main sama sekali, boleh datang?", "Bawa apa saja?", "Sendirian, nanti duduk dengan siapa?" — menurunkan hambatan psikologis terbesar calon anggota.
8. **Kalender event eksternal** — turnamen mahjong di kota lain / luar negeri (pakai tab Event). Menjadikan website rujukan berita mahjong Indonesia, bukan hanya komunitas sendiri.
9. **Merchandise & membership** — kalau komunitas makin besar: kaos, tile set custom, atau paket membership bulanan (fee lebih murah).
10. **Video singkat** — embed reels IG tutorial 30 detik ("cara cuci tile", "apa itu pong vs chow").

Mulai dari #1 dan #7 — dua itu yang paling murah tenaga dan paling terasa efeknya.
