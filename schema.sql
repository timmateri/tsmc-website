-- ============================================================
-- The Social Mahjong Club — Database Schema (Cloudflare D1)
-- Jalankan sekali:
--   npx wrangler d1 execute tsmc-db --remote --file=schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS schedules (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  date        TEXT NOT NULL,            -- format YYYY-MM-DD
  time_start  TEXT NOT NULL,            -- contoh: 18.30
  time_end    TEXT NOT NULL,            -- contoh: 22.30
  venue       TEXT NOT NULL,
  note        TEXT DEFAULT '',
  map_url     TEXT DEFAULT '',          -- link Google Maps venue (opsional)
  tables      INTEGER NOT NULL DEFAULT 4,   -- jumlah meja (1 meja = 4 kursi)
  capacity    INTEGER NOT NULL DEFAULT 16,  -- total kursi
  fee         INTEGER NOT NULL DEFAULT 75000,
  status      TEXT NOT NULL DEFAULT 'open', -- open | closed | canceled
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT UNIQUE NOT NULL,     -- kode booking, contoh: TSMC-4F7K
  schedule_id INTEGER NOT NULL,
  name        TEXT NOT NULL,
  wa          TEXT NOT NULL,            -- nomor WhatsApp
  seats       INTEGER NOT NULL DEFAULT 1,
  method      TEXT NOT NULL DEFAULT 'qris',   -- qris | transfer | venue | reward
  level       TEXT NOT NULL DEFAULT '',       -- N (newbie) | B (beginner) | I (intermediate)
  status      TEXT NOT NULL DEFAULT 'pending',-- pending | verifying | confirmed | canceled | waitlist
  proof       TEXT,                     -- bukti bayar (data-URL base64, sudah dikompres)
  admin_note  TEXT DEFAULT '',
  created_at  TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (schedule_id) REFERENCES schedules(id)
);

CREATE TABLE IF NOT EXISTS news (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tag         TEXT NOT NULL DEFAULT 'KOMUNITAS', -- EVENT | RECAP | KOMUNITAS | dll (bebas)
  title       TEXT NOT NULL,
  blurb       TEXT DEFAULT '',          -- ringkasan singkat
  body        TEXT DEFAULT '',          -- isi lengkap berita
  image       TEXT,                     -- foto berita (data-URL base64)
  published   INTEGER NOT NULL DEFAULT 1,
  date        TEXT DEFAULT (date('now')),
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  date_label  TEXT NOT NULL,            -- contoh: 12 Sep
  title       TEXT NOT NULL,
  sort_date   TEXT DEFAULT (date('now')), -- untuk pengurutan, YYYY-MM-DD
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS gallery (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  caption     TEXT DEFAULT '',
  image       TEXT NOT NULL,            -- data-URL base64 (dikompres di browser)
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Catatan percobaan login admin (untuk proteksi brute-force per-IP).
-- Dibuat otomatis oleh worker juga; didefinisikan di sini agar rapi.
CREATE TABLE IF NOT EXISTS login_attempts (
  ip  TEXT NOT NULL,
  at  TEXT DEFAULT (datetime('now'))
);

-- Koreksi manual stempel loyalty per anggota (kasus refund, dsb).
-- delta bisa negatif; dijumlahkan ke kehadiran hasil hitung otomatis.
CREATE TABLE IF NOT EXISTS loyalty_adj (
  wa          TEXT PRIMARY KEY,
  delta       INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- ---------- Pengaturan awal (bisa diubah lewat dashboard admin) ----------
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('announcement',  'TSMC OPEN 2026 · Pendaftaran turnamen sudah dibuka'),
  ('bank_name',     'BCA'),
  ('bank_account',  '1234567890'),
  ('bank_holder',   'The Social Mahjong Club'),
  ('qris_image',    ''),
  ('wa_admin',      '628123456789'),
  ('instagram',     'https://instagram.com/socialmahjongclub'),
  ('wa_group',      ''),
  ('email',         'hello@tsmc.id'),
  ('stat_members',  '128'),
  ('stat_sessions', '210+');

-- ---------- Contoh jadwal awal (hapus/ubah lewat dashboard admin) ----------
INSERT INTO schedules (date, time_start, time_end, venue, note, tables, capacity, fee) VALUES
  ('2026-08-29', '18.30', '22.30', 'Clubhouse TSMC, Jakarta Barat', 'Sesi reguler mingguan', 4, 16, 75000),
  ('2026-08-30', '13.00', '17.00', 'Kedai Panjang, PIK', 'Sesi santai · pemula welcome', 4, 16, 75000),
  ('2026-09-05', '18.30', '22.30', 'Clubhouse TSMC, Jakarta Barat', 'Liga musim 2 · putaran 1', 4, 16, 75000);

-- ---------- Contoh berita awal ----------
INSERT INTO news (tag, date, title, blurb, body) VALUES
  ('EVENT', '2026-08-20', 'TSMC Open 2026: turnamen Hong Kong style pertama kami, hadiah total Rp 5 juta',
   'Kualifikasi mulai 12 September di Clubhouse TSMC. Terbuka untuk anggota dan non-anggota. Kuota 32 pemain.',
   'Kualifikasi mulai 12 September di Clubhouse TSMC. Terbuka untuk anggota dan non-anggota. Kuota 32 pemain. Daftar melalui admin di WhatsApp.'),
  ('RECAP', '2026-08-17', 'Recap Sabtu Malam: 4 meja penuh, 3 limit hand dalam semalam',
   'Sesi ke-38 tahun ini jadi yang paling ramai sejauh ini.',
   'Sesi ke-38 tahun ini jadi yang paling ramai sejauh ini. Terima kasih untuk semua yang hadir!'),
  ('KOMUNITAS', '2026-08-10', 'Venue baru di PIK untuk sesi Minggu siang',
   'Mulai akhir Agustus, sesi santai pindah ke Kedai Panjang.',
   'Mulai akhir Agustus, sesi santai pindah ke Kedai Panjang, PIK. Tempat lebih luas dan ada menu makanan.');

-- ---------- Contoh kalender event ----------
INSERT INTO events (date_label, title, sort_date) VALUES
  ('12 Sep', 'TSMC Open 2026 · babak kualifikasi', '2026-09-12'),
  ('26 Sep', 'TSMC Open 2026 · final day', '2026-09-26'),
  ('11 Okt', 'Friendly match · Bandung (away)', '2026-10-11'),
  ('07 Nov', 'Sesi khusus pemula + coaching', '2026-11-07');
