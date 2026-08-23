# The Social Mahjong Club — Website

Website komunitas mahjong dengan sistem booking slot, portal berita, galeri foto, dan dashboard admin.

- **Website publik:** https://socialmahjong.tsmc-mahjong.workers.dev
- **Dashboard admin:** https://socialmahjong.tsmc-mahjong.workers.dev/admin

## 📖 Baca PANDUAN.md

Semua langkah setup dan cara mengelola website ada di **[PANDUAN.md](PANDUAN.md)** — ditulis untuk pemula, langkah demi langkah.

## Struktur folder

```
├── public/
│   ├── index.html      ← website publik (jadwal, booking, berita, galeri)
│   ├── admin.html      ← dashboard admin (kelola semua konten)
│   ├── modul-01.html   ← belajar: kenali tile & susunan meja
│   ├── modul-02.html   ← belajar: menghitung faan
│   ├── modul-03.html   ← belajar: etika & ritme permainan
│   ├── belajar.css/.js ← gaya & penggambar tile SVG untuk halaman modul
│   └── tsmc-logo.png, favicon.png
├── src/
│   └── worker.js    ← backend API (Cloudflare Worker)
├── schema.sql       ← struktur database D1 + contoh data awal
├── wrangler.jsonc   ← konfigurasi Cloudflare
├── package.json     ← perintah npm (deploy, db:setup, dev)
└── index.html       ← ⚠️ mock lama (tidak dipakai lagi, boleh dihapus)
```

## Perintah penting

```bash
npm install        # sekali saja, install wrangler
npm run db:setup   # sekali saja, isi database
npm run deploy     # upload website ke Cloudflare
npm run dev        # coba di komputer sendiri (http://localhost:8787)
```

Konten harian (jadwal, booking, berita, foto) dikelola lewat dashboard `/admin` — tidak perlu deploy ulang.
