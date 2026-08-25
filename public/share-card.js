/* ============================================================
   TSMC — Kartu jadwal untuk dibagikan (WA / sosial media)
   Menggambar kartu jadwal (tanggal, jam, venue, slot, peserta)
   sebagai gambar PNG via <canvas>, lalu membuka share sheet HP.
   Dipakai oleh index.html (user) dan admin.html (admin).
   ============================================================ */
(function () {
  'use strict';
  const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const BULAN = ['JAN','FEB','MAR','APR','MEI','JUN','JUL','AGU','SEP','OKT','NOV','DES'];
  const BULAN_LONG = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const C = { cream:'#EAF3DF', paper:'#FAFCF5', green:'#087048', greenDk:'#04552F',
    ink:'#04331F', red:'#C02028', gold:'#C9A54A', blue:'#1E4D8C', mut:'#4E5C4B', track:'#DDE5D8' };
  const LVLC = { N:'#C9A54A', B:'#1E4D8C', I:'#087048' };
  const SITE_URL = location.origin;

  const rupiah = n => 'Rp ' + Number(n).toLocaleString('id-ID');
  const pd = iso => { const [y,m,d] = iso.split('-').map(Number); return new Date(y, m-1, d); };
  // penyingkatan nama yang SAMA dengan server ("Budi Tanoto" -> "Budi T.") —
  // dijalankan lagi di sini agar hasil share dari admin & user dijamin identik,
  // apa pun sumber datanya. Aman untuk nama yang sudah singkat ("Budi T." tetap).
  const shortName = full => {
    const parts = String(full || '').trim().split(/\s+/);
    if (parts.length <= 1) return parts[0] || '';
    return parts[0] + ' ' + parts[1][0].toUpperCase() + '.';
  };
  const sesiNama = s => {
    const j = parseInt(s.time_start);
    return HARI[pd(s.date).getDay()] + ' ' + (j < 11 ? 'Pagi' : j < 17 ? 'Siang' : 'Malam');
  };

  function rr(ctx, x, y, w, h, r) { // rounded rect path
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function wrap(ctx, text, maxW) {
    const words = String(text).split(/\s+/); const lines = []; let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; }
      else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  // daftar kursi: 1 baris per kursi (kursi ekstra pakai nama yang sama), sama seperti website
  function seatRows(s) {
    const out = [];
    for (const p of (s.players || [])) {
      for (let i = 0; i < 1 + (p.x || 0); i++) out.push(p);
    }
    return out;
  }
  const PAY_PILL = {
    l:  { txt: 'LUNAS',            bg: '#FFFFFF', border: C.red,  color: C.red  },
    v:  { txt: 'BAYAR DI TEMPAT',  bg: '#F5EDD3', border: C.gold, color: '#8a6d1c' },
    p:  { txt: 'MENUNGGU BAYAR',   bg: '#EDF0EC', border: '#9aa694', color: C.mut },
    vr: { txt: 'VERIFIKASI',       bg: '#E8EEF7', border: C.blue, color: C.blue },
  };

  async function renderCard(s) {
    await Promise.all([
      document.fonts.load('64px "DM Serif Display"'),
      document.fonts.load('700 32px "Schibsted Grotesk"'),
      document.fonts.load('800 26px "Schibsted Grotesk"'),
    ]).catch(() => {});
    const logo = await new Promise(res => {
      const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null);
      im.src = '/tsmc-logo.png';
    });

    const W = 1080, P = 64;
    const rows = seatRows(s);
    // ukur dulu tinggi venue (bisa 2 baris)
    const tmp = document.createElement('canvas').getContext('2d');
    tmp.font = '600 32px "Schibsted Grotesk", sans-serif';
    const venueLines = wrap(tmp, '📍 ' + s.venue + (s.note ? ' · ' + s.note : ''), W - 2 * P);
    const H = 470 + venueLines.length * 44 + 110
      + (rows.length ? 96 + rows.length * 56 : 150) + 150;

    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');

    // latar + aksen brand
    ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.green; ctx.fillRect(0, 0, W, 12); ctx.fillRect(0, H - 12, W, 12);

    // logo
    if (logo) {
      const lh = 92, lw = logo.width * lh / logo.height;
      ctx.drawImage(logo, (W - lw) / 2, 44, lw, lh);
    }
    let y = 190;

    // kotak tanggal + judul sesi + pill status
    const d = pd(s.date);
    ctx.fillStyle = C.cream; rr(ctx, P, y, 150, 150, 18); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3; rr(ctx, P, y, 150, 150, 18); ctx.stroke();
    ctx.fillStyle = C.ink; ctx.font = '72px "DM Serif Display", serif'; ctx.textAlign = 'center';
    ctx.fillText(d.getDate(), P + 75, y + 82);
    ctx.fillStyle = C.red; ctx.font = '800 26px "Schibsted Grotesk", sans-serif';
    ctx.fillText(BULAN[d.getMonth()], P + 75, y + 122);
    ctx.textAlign = 'left';
    ctx.fillStyle = C.ink; ctx.font = '58px "DM Serif Display", serif';
    ctx.fillText(sesiNama(s), P + 190, y + 62);
    ctx.fillStyle = C.mut; ctx.font = '700 34px "Schibsted Grotesk", sans-serif';
    ctx.fillText(`${s.time_start} – ${s.time_end} WIB`, P + 190, y + 116);
    const open = s.status === 'open' && s.left > 0;
    const stTxt = s.status !== 'open' ? 'DITUTUP' : (s.left > 0 ? 'OPEN' : 'PENUH');
    ctx.font = '800 24px "Schibsted Grotesk", sans-serif';
    const stW = ctx.measureText(stTxt).width + 44;
    ctx.fillStyle = open ? C.green : '#6B7A66';
    rr(ctx, W - P - stW, y, stW, 52, 26); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText(stTxt, W - P - stW / 2, y + 35); ctx.textAlign = 'left';
    y += 200;

    // venue (+ catatan)
    ctx.fillStyle = C.ink; ctx.font = '600 32px "Schibsted Grotesk", sans-serif';
    for (const ln of venueLines) { ctx.fillText(ln, P, y); y += 44; }
    y += 18;

    // bar okupansi + teks slot
    const bw = W - 2 * P;
    ctx.fillStyle = C.track; rr(ctx, P, y, bw, 18, 9); ctx.fill();
    const pct = Math.min(1, (s.booked || 0) / (s.capacity || 1));
    if (pct > 0) { ctx.fillStyle = open ? C.green : '#6B7A66'; rr(ctx, P, y, Math.max(18, bw * pct), 18, 9); ctx.fill(); }
    y += 56;
    ctx.fillStyle = C.mut; ctx.font = '600 31px "Schibsted Grotesk", sans-serif';
    ctx.fillText(`${s.booked}/${s.capacity} kursi terisi · `, P, y);
    const off = ctx.measureText(`${s.booked}/${s.capacity} kursi terisi · `).width;
    ctx.fillStyle = open ? C.green : C.red; ctx.font = '800 31px "Schibsted Grotesk", sans-serif';
    ctx.fillText(s.left > 0 ? `${s.left} slot tersisa` : 'penuh — waiting list', P + off, y);
    y += 40;

    // panel peserta
    if (rows.length) {
      const ph = 88 + rows.length * 56;
      ctx.fillStyle = C.cream; rr(ctx, P, y, bw, ph, 20); ctx.fill();
      let yy = y + 56;
      ctx.fillStyle = C.ink; ctx.font = '800 28px "Schibsted Grotesk", sans-serif';
      ctx.fillText('👥 SUDAH DAFTAR', P + 36, yy); yy += 52;
      rows.forEach((p, i) => {
        let x = P + 36;
        ctx.fillStyle = C.ink; ctx.font = '600 30px "Schibsted Grotesk", sans-serif';
        const nm = `${i + 1}. ${shortName(p.n)}`;
        ctx.fillText(nm, x, yy); x += ctx.measureText(nm).width + 16;
        if (p.l && LVLC[p.l]) { // badge level
          ctx.fillStyle = LVLC[p.l]; rr(ctx, x, yy - 28, 38, 38, 10); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.font = '800 22px "Schibsted Grotesk", sans-serif';
          ctx.textAlign = 'center'; ctx.fillText(p.l, x + 19, yy); ctx.textAlign = 'left';
          x += 54;
        }
        const pill = PAY_PILL[p.pay || (p.v ? 'vr' : '')];
        if (pill) {
          ctx.font = '800 21px "Schibsted Grotesk", sans-serif';
          const pw = ctx.measureText(pill.txt).width + 36;
          ctx.fillStyle = pill.bg; rr(ctx, x, yy - 27, pw, 38, 19); ctx.fill();
          ctx.strokeStyle = pill.border; ctx.lineWidth = 2.5; rr(ctx, x, yy - 27, pw, 38, 19); ctx.stroke();
          ctx.fillStyle = pill.color; ctx.textAlign = 'center';
          ctx.fillText(pill.txt, x + pw / 2, yy - 1); ctx.textAlign = 'left';
        }
        yy += 56;
      });
      y += ph + 46;
    } else {
      ctx.fillStyle = C.cream; rr(ctx, P, y, bw, 100, 20); ctx.fill();
      ctx.fillStyle = C.mut; ctx.font = '600 29px "Schibsted Grotesk", sans-serif';
      ctx.fillText('👥 Belum ada peserta — jadi yang pertama! 🀄', P + 36, y + 62);
      y += 146;
    }

    // footer: fee + ajakan book
    ctx.fillStyle = '#8a9484'; ctx.font = '800 22px "Schibsted Grotesk", sans-serif';
    ctx.fillText('FEE / ORANG', P, y);
    ctx.fillStyle = C.ink; ctx.font = '46px "DM Serif Display", serif';
    ctx.fillText(rupiah(s.fee), P, y + 52);
    ctx.textAlign = 'right';
    ctx.fillStyle = C.green; ctx.font = '800 27px "Schibsted Grotesk", sans-serif';
    ctx.fillText('Book slot kamu di', W - P, y);
    ctx.fillText(SITE_URL.replace(/^https?:\/\//, ''), W - P, y + 40);
    ctx.textAlign = 'left';

    return new Promise(res => cv.toBlob(res, 'image/png'));
  }

  function shareText(s) {
    const d = pd(s.date);
    let t = `🀄 *The Social Mahjong Club*\n`
      + `*${sesiNama(s)} — ${HARI[d.getDay()]}, ${d.getDate()} ${BULAN_LONG[d.getMonth()]} ${d.getFullYear()}*\n`
      + `🕐 ${s.time_start}–${s.time_end} WIB\n`
      + `📍 ${s.venue}${s.note ? ' · ' + s.note : ''}\n`;
    if (s.map_url) t += `🗺️ ${s.map_url}\n`;
    t += `💺 ${s.left > 0 ? `Sisa ${s.left} dari ${s.capacity} kursi` : 'PENUH — bisa masuk waiting list'} · Fee ${rupiah(s.fee)}/orang\n\n`
      + `Book slot kamu di:\n${SITE_URL}/#jadwal-${s.id}`;   // link langsung ke kartu jadwal ini
    return t;
  }

  async function share(s) {
    const text = shareText(s);
    let blob = null;
    try { blob = await renderCard(s); } catch (e) { /* gagal gambar → share teks saja */ }
    // Share sheet native hanya dipakai di HP/tablet — di laptop (macOS/Windows)
    // sheet-nya tidak memuat WhatsApp dan teks/link ikut hilang, jadi desktop
    // langsung ke fallback: unduh PNG + buka WhatsApp Web berisi teks & link.
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    if (blob && isMobile) {
      const file = new File([blob], `jadwal-tsmc-${s.date}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], text }); return; }
        catch (e) { if (e && e.name === 'AbortError') return; }
      }
    }
    if (blob) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `jadwal-tsmc-${s.date}.png`;
      document.body.appendChild(a); a.click(); a.remove();
    }
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
  }

  window.TSMCShare = { share, renderCard, shareText };
})();
