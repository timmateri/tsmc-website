// ============================================================
// Service worker — The Social Mahjong Club
// Tujuan: PWA installable + halaman tetap terbuka saat sinyal jelek.
// Prinsip aman:
//   - /api/  dan /admin  TIDAK PERNAH di-cache (data selalu fresh & privat).
//   - Aset situs (halaman, gambar, font same-origin) pakai "network-first":
//     ambil dari jaringan dulu, cache hanya sebagai cadangan offline.
// ============================================================
const CACHE = 'tsmc-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Jangan sentuh request lintas-origin (mis. Google Fonts) — biar browser tangani sendiri.
  if (url.origin !== self.location.origin) return;
  // Jangan pernah cache API atau area admin.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;

  // network-first: utamakan data terbaru, jatuh ke cache saat offline.
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('/')))
  );
});
