// ============================================================
// The Social Mahjong Club — Backend API (Cloudflare Worker + D1)
// Semua data (jadwal, booking, berita, galeri) tersimpan di database D1.
// Konten dikelola lewat dashboard admin di /admin — tidak perlu coding.
// ============================================================

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}
function err(message, status = 400) {
  return json({ ok: false, error: message }, status);
}

// Booking yang belum dibayar lebih dari 24 jam tidak lagi menahan kursi
const HOLD_EXPR = `(b.status IN ('confirmed','verifying')
  OR (b.status = 'pending' AND b.created_at > datetime('now','-1 day')))`;

// Kode booking acak, contoh: TSMC-7KQ4
function makeCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return 'TSMC-' + s;
}

// Batas ukuran gambar base64 (~1,5 MB) agar database tetap sehat
function imageOk(dataUrl) {
  return typeof dataUrl === 'string'
    && dataUrl.startsWith('data:image/')
    && dataUrl.length < 1_500_000;
}

// "Budi Tanoto" -> "Budi T." — nama lengkap tidak pernah dikirim ke publik
function shortName(full) {
  const parts = String(full || '').trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] || '';
  return parts[0] + ' ' + parts[1][0].toUpperCase() + '.';
}

async function getSettings(db) {
  const { results } = await db.prepare('SELECT key, value FROM settings').all();
  const s = {};
  for (const r of results) s[r.key] = r.value;
  return s;
}

// ---------- Loyalty card (tanpa login — identitas = nomor WA) ----------
// 1 sesi hadir (booking confirmed, tanggal sudah lewat) = 1 stempel.
// 5 stempel = 1 permainan gratis. Klaim gratis dicatat sebagai booking
// dengan method 'reward' dan perlu dikonfirmasi admin.
const TIERS = [
  { min: 30, name: 'Limit Hand', icon: '👑' },
  { min: 15, name: 'Sik Wu', icon: '🏆' },
  { min: 5, name: 'Pong!', icon: '🀄' },
  { min: 0, name: 'Chicken Hand', icon: '🐣' },
];

// tabel koreksi manual stempel (dibuat otomatis kalau belum ada —
// aman untuk database yang sudah terlanjur di-setup tanpa tabel ini)
async function ensureAdjTable(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS loyalty_adj (
    wa TEXT PRIMARY KEY, delta INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')))`).run();
}

async function getLoyalty(db, wa) {
  const row = await db.prepare(`
    SELECT
      SUM(CASE WHEN b.status = 'confirmed' AND s.date <= date('now') THEN 1 ELSE 0 END) AS plays_total,
      SUM(CASE WHEN b.method != 'reward' AND b.status = 'confirmed' AND s.date <= date('now') THEN 1 ELSE 0 END) AS plays_stamp,
      SUM(CASE WHEN b.method = 'reward' AND b.status != 'canceled' THEN 1 ELSE 0 END) AS rewards_used
    FROM bookings b JOIN schedules s ON s.id = b.schedule_id
    WHERE b.wa = ?
  `).bind(wa).first();
  // koreksi manual dari admin (refund, dsb.) — kalau tabelnya belum ada, anggap 0
  let delta = 0;
  try {
    const a = await db.prepare('SELECT delta FROM loyalty_adj WHERE wa = ?').bind(wa).first();
    delta = a ? a.delta : 0;
  } catch (e) { /* tabel belum dibuat */ }
  const playsTotal = Math.max(0, (row.plays_total || 0) + delta);
  const net = Math.max(0, (row.plays_stamp || 0) + delta - (row.rewards_used || 0) * 5);
  const tier = TIERS.find((t) => playsTotal >= t.min);
  const nextIdx = TIERS.indexOf(tier) - 1;
  const next = nextIdx >= 0 ? TIERS[nextIdx] : null;
  return {
    plays_total: playsTotal,
    card: net % 5,                      // stempel di kartu yang sedang berjalan (0–4)
    rewards_ready: Math.floor(net / 5), // permainan gratis yang siap dipakai
    tier: { name: tier.name, icon: tier.icon },
    next_tier: next ? { name: next.name, icon: next.icon, need: next.min - playsTotal } : null,
  };
}

async function schedulesWithAvailability(db) {
  const { results } = await db.prepare(`
    SELECT s.*, COALESCE((
      SELECT SUM(b.seats) FROM bookings b
      WHERE b.schedule_id = s.id AND ${HOLD_EXPR}
    ), 0) AS booked
    FROM schedules s
    WHERE s.status != 'canceled' AND s.date >= date('now','-1 day')
    ORDER BY s.date ASC
  `).all();
  return results.map((s) => ({ ...s, left: Math.max(0, s.capacity - s.booked) }));
}

// ---------- Autentikasi admin ----------
async function requireAdmin(req, env) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT token FROM sessions WHERE token = ? AND created_at > datetime('now','-30 day')`
  ).bind(token).first();
  return row ? token : null;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // Halaman admin: /admin → file admin.html
    if (path === '/admin' || path === '/admin/') {
      return env.ASSETS.fetch(new Request(new URL('/admin.html', url), req));
    }

    if (!path.startsWith('/api/')) {
      return env.ASSETS.fetch(req); // file statis (index.html, dll)
    }

    try {
      // ======================= API PUBLIK =======================

      // Semua data untuk halaman depan dalam satu panggilan
      if (path === '/api/site' && method === 'GET') {
        const db = env.DB;
        const [schedules, news, events, gallery, settings] = await Promise.all([
          schedulesWithAvailability(db),
          db.prepare(`SELECT id, tag, title, blurb, date, image FROM news
                      WHERE published = 1 ORDER BY date DESC, id DESC LIMIT 30`).all()
            .then((r) => r.results),
          db.prepare(`SELECT id, date_label, title FROM events
                      WHERE sort_date >= date('now','-1 day')
                      ORDER BY sort_date ASC LIMIT 12`).all().then((r) => r.results),
          db.prepare(`SELECT id, caption, image FROM gallery ORDER BY id DESC LIMIT 24`).all()
            .then((r) => r.results),
          getSettings(db),
        ]);
        // daftar peserta per jadwal (hanya yang sudah bayar / terkonfirmasi),
        // nama sudah disingkat di server demi privasi
        if (schedules.length) {
          const ids = schedules.map((s) => s.id);
          const { results: parts } = await db.prepare(`
            SELECT schedule_id, name, seats, status FROM bookings
            WHERE status IN ('confirmed','verifying')
              AND schedule_id IN (${ids.map(() => '?').join(',')})
            ORDER BY id ASC
          `).bind(...ids).all();
          const byId = {};
          for (const p of parts) {
            (byId[p.schedule_id] = byId[p.schedule_id] || []).push({
              n: shortName(p.name),
              x: Math.max(0, p.seats - 1),   // kursi ekstra yang dia bawa
              v: p.status === 'verifying' ? 1 : 0,
            });
          }
          for (const s of schedules) s.players = byId[s.id] || [];
        }
        // hanya kirim pengaturan yang memang untuk publik
        const pub = (({ announcement, wa_admin, instagram, wa_group, email,
          stat_members, stat_sessions }) =>
          ({ announcement, wa_admin, instagram, wa_group, email, stat_members, stat_sessions }))(settings);
        return json({ ok: true, schedules, news, events, gallery, settings: pub });
      }

      // Isi lengkap satu berita
      if (path.match(/^\/api\/news\/\d+$/) && method === 'GET') {
        const id = path.split('/').pop();
        const row = await env.DB.prepare(
          'SELECT * FROM news WHERE id = ? AND published = 1'
        ).bind(id).first();
        return row ? json({ ok: true, news: row }) : err('Berita tidak ditemukan', 404);
      }

      // Buat booking baru
      if (path === '/api/bookings' && method === 'POST') {
        const b = await req.json();
        const name = (b.name || '').trim();
        const wa = (b.wa || '').replace(/[^0-9+]/g, '');
        const useReward = !!b.use_reward;
        const seats = useReward ? 1 : Math.min(4, Math.max(1, parseInt(b.seats) || 1));
        const methodPay = useReward ? 'reward'
          : (['qris', 'transfer', 'venue'].includes(b.method) ? b.method : 'qris');
        if (!name || name.length > 60) return err('Nama wajib diisi (maks. 60 karakter).');
        if (wa.length < 9 || wa.length > 16) return err('Nomor WhatsApp tidak valid.');

        // klaim gratis: pastikan stempelnya memang cukup
        if (useReward) {
          const loyal = await getLoyalty(env.DB, wa);
          if (loyal.rewards_ready < 1) return err('Stempel kamu belum cukup untuk permainan gratis.');
        }

        const scheds = await schedulesWithAvailability(env.DB);
        const sched = scheds.find((s) => s.id === parseInt(b.schedule_id));
        if (!sched || sched.status !== 'open') return err('Jadwal tidak tersedia.');

        const isWaitlist = sched.left < seats;
        // klaim gratis langsung berstatus 'verifying' (menahan kursi,
        // menunggu konfirmasi admin) — tidak lewat alur pembayaran
        const status = isWaitlist ? 'waitlist' : (useReward ? 'verifying' : 'pending');
        if (isWaitlist && !b.allow_waitlist) {
          return json({ ok: false, waitlist: true,
            error: `Tersisa ${sched.left} kursi. Masuk waiting list?` });
        }

        let code = makeCode();
        // pastikan kode unik
        for (let i = 0; i < 5; i++) {
          const dupe = await env.DB.prepare('SELECT 1 FROM bookings WHERE code = ?').bind(code).first();
          if (!dupe) break;
          code = makeCode();
        }
        await env.DB.prepare(`
          INSERT INTO bookings (code, schedule_id, name, wa, seats, method, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(code, sched.id, name, wa, seats, methodPay, status).run();

        const settings = await getSettings(env.DB);
        return json({
          ok: true, code, status, reward: useReward,
          total: useReward ? 0 : sched.fee * seats,
          payment: {
            bank_name: settings.bank_name, bank_account: settings.bank_account,
            bank_holder: settings.bank_holder, qris_image: settings.qris_image,
            wa_admin: settings.wa_admin,
          },
        });
      }

      // Upload bukti pembayaran
      if (path === '/api/bookings/proof' && method === 'POST') {
        const b = await req.json();
        if (!imageOk(b.proof)) return err('File bukti tidak valid atau terlalu besar (maks ±1 MB).');
        const row = await env.DB.prepare(
          `SELECT id, status FROM bookings WHERE code = ?`
        ).bind((b.code || '').toUpperCase().trim()).first();
        if (!row) return err('Kode booking tidak ditemukan.', 404);
        if (['canceled'].includes(row.status)) return err('Booking ini sudah dibatalkan.');
        await env.DB.prepare(
          `UPDATE bookings SET proof = ?, status = CASE WHEN status='pending' THEN 'verifying' ELSE status END
           WHERE id = ?`
        ).bind(b.proof, row.id).run();
        return json({ ok: true });
      }

      // Kartu loyalty berdasarkan nomor WA
      if (path === '/api/loyalty' && method === 'GET') {
        const wa = (url.searchParams.get('wa') || '').replace(/[^0-9+]/g, '');
        if (wa.length < 9) return err('Nomor WhatsApp tidak valid.');
        return json({ ok: true, loyalty: await getLoyalty(env.DB, wa) });
      }

      // Cek status booking berdasarkan nomor WA atau kode
      if (path === '/api/bookings/lookup' && method === 'GET') {
        const q = (url.searchParams.get('q') || '').trim();
        if (q.length < 4) return err('Masukkan kode booking atau nomor WhatsApp.');
        const wa = q.replace(/[^0-9+]/g, '');
        const { results } = await env.DB.prepare(`
          SELECT b.code, b.name, b.seats, b.method, b.status, b.created_at,
                 s.date, s.time_start, s.time_end, s.venue, s.fee
          FROM bookings b JOIN schedules s ON s.id = b.schedule_id
          WHERE b.code = ? OR (length(?) >= 9 AND b.wa = ?)
          ORDER BY b.id DESC LIMIT 10
        `).bind(q.toUpperCase(), wa, wa).all();
        return json({ ok: true, bookings: results });
      }

      // ======================= LOGIN ADMIN =======================

      if (path === '/api/admin/login' && method === 'POST') {
        const b = await req.json();
        if (!env.ADMIN_PASSWORD) return err('ADMIN_PASSWORD belum diset di server.', 500);
        if (b.password !== env.ADMIN_PASSWORD) return err('Password salah.', 401);
        const token = crypto.randomUUID() + crypto.randomUUID();
        await env.DB.prepare('INSERT INTO sessions (token) VALUES (?)').bind(token).run();
        return json({ ok: true, token });
      }

      // ======================= API ADMIN =======================
      if (path.startsWith('/api/admin/')) {
        const token = await requireAdmin(req, env);
        if (!token) return err('Silakan login dulu.', 401);
        const db = env.DB;

        if (path === '/api/admin/logout' && method === 'POST') {
          await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
          return json({ ok: true });
        }

        // ---- Booking ----
        if (path === '/api/admin/bookings' && method === 'GET') {
          const sid = url.searchParams.get('schedule_id');
          const q = `
            SELECT b.*, s.date, s.time_start, s.venue, s.fee
            FROM bookings b JOIN schedules s ON s.id = b.schedule_id
            ${sid ? 'WHERE b.schedule_id = ?' : ''}
            ORDER BY b.id DESC LIMIT 500`;
          const stmt = sid ? db.prepare(q).bind(sid) : db.prepare(q);
          const { results } = await stmt.all();
          return json({ ok: true, bookings: results });
        }
        {
          const m = path.match(/^\/api\/admin\/bookings\/(\d+)$/);
          if (m && method === 'POST') {
            const b = await req.json();
            const ok = ['pending', 'verifying', 'confirmed', 'canceled', 'waitlist'];
            if (!ok.includes(b.status)) return err('Status tidak dikenal.');
            await db.prepare('UPDATE bookings SET status = ?, admin_note = ? WHERE id = ?')
              .bind(b.status, b.admin_note || '', m[1]).run();
            return json({ ok: true });
          }
        }

        // ---- Anggota & stempel loyalty ----
        if (path === '/api/admin/members' && method === 'GET') {
          await ensureAdjTable(db);
          const { results } = await db.prepare(`
            SELECT b.wa,
              (SELECT b2.name FROM bookings b2 WHERE b2.wa = b.wa ORDER BY b2.id DESC LIMIT 1) AS name,
              SUM(CASE WHEN b.method != 'reward' AND b.status = 'confirmed' AND s.date <= date('now') THEN 1 ELSE 0 END) AS plays,
              SUM(CASE WHEN b.method = 'reward' AND b.status != 'canceled' THEN 1 ELSE 0 END) AS rewards_used,
              COUNT(*) AS total_bookings
            FROM bookings b JOIN schedules s ON s.id = b.schedule_id
            GROUP BY b.wa ORDER BY plays DESC, total_bookings DESC LIMIT 500
          `).all();
          const { results: adjs } = await db.prepare('SELECT wa, delta FROM loyalty_adj').all();
          const deltaMap = {};
          for (const a of adjs) deltaMap[a.wa] = a.delta;
          const members = results.map((m) => {
            const delta = deltaMap[m.wa] || 0;
            const total = Math.max(0, m.plays + delta);
            const net = Math.max(0, m.plays + delta - m.rewards_used * 5);
            const tier = TIERS.find((t) => total >= t.min);
            return {
              wa: m.wa, name: m.name, plays: m.plays, delta,
              total, card: net % 5, rewards_ready: Math.floor(net / 5),
              rewards_used: m.rewards_used, total_bookings: m.total_bookings,
              tier: { name: tier.name, icon: tier.icon },
            };
          });
          return json({ ok: true, members });
        }
        if (path === '/api/admin/members/adjust' && method === 'POST') {
          const b = await req.json();
          const wa = (b.wa || '').replace(/[^0-9+]/g, '');
          const change = parseInt(b.change);
          if (wa.length < 9) return err('Nomor WA tidak valid.');
          if (![1, -1].includes(change)) return err('Perubahan harus +1 atau -1.');
          await ensureAdjTable(db);
          await db.prepare(`
            INSERT INTO loyalty_adj (wa, delta, updated_at) VALUES (?, ?, datetime('now'))
            ON CONFLICT(wa) DO UPDATE SET delta = delta + ?, updated_at = datetime('now')
          `).bind(wa, change, change).run();
          return json({ ok: true });
        }

        // ---- Jadwal ----
        if (path === '/api/admin/schedules' && method === 'GET') {
          const { results } = await db.prepare(`
            SELECT s.*, COALESCE((SELECT SUM(b.seats) FROM bookings b
              WHERE b.schedule_id = s.id AND ${HOLD_EXPR}), 0) AS booked
            FROM schedules s ORDER BY s.date DESC LIMIT 200`).all();
          return json({ ok: true, schedules: results });
        }
        if (path === '/api/admin/schedules' && method === 'POST') {
          const b = await req.json();
          if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || '')) return err('Tanggal wajib format YYYY-MM-DD.');
          const tables = Math.max(1, parseInt(b.tables) || 4);
          await db.prepare(`
            INSERT INTO schedules (date, time_start, time_end, venue, note, tables, capacity, fee, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(b.date, b.time_start || '18.30', b.time_end || '22.30', b.venue || '',
            b.note || '', tables, parseInt(b.capacity) || tables * 4,
            parseInt(b.fee) || 75000, b.status || 'open').run();
          return json({ ok: true });
        }
        {
          const m = path.match(/^\/api\/admin\/schedules\/(\d+)$/);
          if (m && method === 'PUT') {
            const b = await req.json();
            await db.prepare(`
              UPDATE schedules SET date=?, time_start=?, time_end=?, venue=?, note=?,
                tables=?, capacity=?, fee=?, status=? WHERE id=?
            `).bind(b.date, b.time_start, b.time_end, b.venue || '', b.note || '',
              parseInt(b.tables) || 4, parseInt(b.capacity) || 16,
              parseInt(b.fee) || 75000, b.status || 'open', m[1]).run();
            return json({ ok: true });
          }
          if (m && method === 'DELETE') {
            await db.prepare('DELETE FROM bookings WHERE schedule_id = ?').bind(m[1]).run();
            await db.prepare('DELETE FROM schedules WHERE id = ?').bind(m[1]).run();
            return json({ ok: true });
          }
        }

        // ---- Berita ----
        if (path === '/api/admin/news' && method === 'GET') {
          const { results } = await db.prepare('SELECT * FROM news ORDER BY date DESC, id DESC LIMIT 200').all();
          return json({ ok: true, news: results });
        }
        if (path === '/api/admin/news' && method === 'POST') {
          const b = await req.json();
          if (!b.title) return err('Judul wajib diisi.');
          if (b.image && !imageOk(b.image)) return err('Gambar terlalu besar.');
          await db.prepare(`
            INSERT INTO news (tag, title, blurb, body, image, published, date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind((b.tag || 'KOMUNITAS').toUpperCase(), b.title, b.blurb || '', b.body || '',
            b.image || null, b.published ? 1 : 0, b.date || new Date().toISOString().slice(0, 10)).run();
          return json({ ok: true });
        }
        {
          const m = path.match(/^\/api\/admin\/news\/(\d+)$/);
          if (m && method === 'PUT') {
            const b = await req.json();
            if (b.image && !imageOk(b.image)) return err('Gambar terlalu besar.');
            await db.prepare(`
              UPDATE news SET tag=?, title=?, blurb=?, body=?, image=?, published=?, date=? WHERE id=?
            `).bind((b.tag || 'KOMUNITAS').toUpperCase(), b.title, b.blurb || '', b.body || '',
              b.image || null, b.published ? 1 : 0, b.date, m[1]).run();
            return json({ ok: true });
          }
          if (m && method === 'DELETE') {
            await db.prepare('DELETE FROM news WHERE id = ?').bind(m[1]).run();
            return json({ ok: true });
          }
        }

        // ---- Kalender event ----
        if (path === '/api/admin/events' && method === 'GET') {
          const { results } = await db.prepare('SELECT * FROM events ORDER BY sort_date ASC LIMIT 200').all();
          return json({ ok: true, events: results });
        }
        if (path === '/api/admin/events' && method === 'POST') {
          const b = await req.json();
          if (!b.title || !b.date_label) return err('Tanggal dan nama event wajib diisi.');
          await db.prepare('INSERT INTO events (date_label, title, sort_date) VALUES (?, ?, ?)')
            .bind(b.date_label, b.title, b.sort_date || new Date().toISOString().slice(0, 10)).run();
          return json({ ok: true });
        }
        {
          const m = path.match(/^\/api\/admin\/events\/(\d+)$/);
          if (m && method === 'DELETE') {
            await db.prepare('DELETE FROM events WHERE id = ?').bind(m[1]).run();
            return json({ ok: true });
          }
        }

        // ---- Galeri ----
        if (path === '/api/admin/gallery' && method === 'POST') {
          const b = await req.json();
          if (!imageOk(b.image)) return err('Foto tidak valid atau terlalu besar.');
          await db.prepare('INSERT INTO gallery (caption, image) VALUES (?, ?)')
            .bind(b.caption || '', b.image).run();
          return json({ ok: true });
        }
        {
          const m = path.match(/^\/api\/admin\/gallery\/(\d+)$/);
          if (m && method === 'DELETE') {
            await db.prepare('DELETE FROM gallery WHERE id = ?').bind(m[1]).run();
            return json({ ok: true });
          }
        }

        // ---- Pengaturan ----
        if (path === '/api/admin/settings' && method === 'GET') {
          return json({ ok: true, settings: await getSettings(db) });
        }
        if (path === '/api/admin/settings' && method === 'POST') {
          const b = await req.json();
          const allowed = ['announcement', 'bank_name', 'bank_account', 'bank_holder',
            'qris_image', 'wa_admin', 'instagram', 'wa_group', 'email',
            'stat_members', 'stat_sessions'];
          for (const k of allowed) {
            if (k in b) {
              if (k === 'qris_image' && b[k] && !imageOk(b[k])) return err('Gambar QRIS terlalu besar.');
              await db.prepare(
                'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
              ).bind(k, String(b[k])).run();
            }
          }
          return json({ ok: true });
        }
      }

      return err('Endpoint tidak ditemukan.', 404);
    } catch (e) {
      return err('Terjadi kesalahan server: ' + e.message, 500);
    }
  },
};
