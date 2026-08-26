// ============================================================
// TSMC — Penggambar tile mahjong (SVG), mengikuti set standar:
//  · 1 sok = burung (bukan batang)
//  · 5 sok batang tengah merah · 7 sok batang atas merah
//  · 8 sok susunan miring M/W · 9 sok baris tengah merah
//  · pola warna lingkaran (tung) mengikuti set klasik
// Pakai: <span data-tile="wan:3"></span>  atau
//        <div class="tile-row" data-tiles="tung:1,tung:2,sok:5"></div>
// Jenis: wan:1-9 · tung:1-9 · sok:1-9 · wind:e/s/w/n ·
//        dragon:c/f/b · flower:1-4 · season:1-4 · joker · back
// ============================================================
'use strict';
(function () {
  const INK = '#04331F', RED = '#C02028', GREEN = '#087048', BLUE = '#1E4D8C';
  const NUM_CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

  function text(x, y, size, fill, ch, weight) {
    return `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" ` +
      `font-family="'Noto Serif TC',serif" font-weight="${weight || 900}" fill="${fill}">${ch}</text>`;
  }

  // ---- lingkaran (tung) ----
  function dot(x, y, r, col) {
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/>` +
      `<circle cx="${x}" cy="${y}" r="${r * 0.45}" fill="#fff" opacity="0.85"/>` +
      `<circle cx="${x}" cy="${y}" r="${r * 0.18}" fill="${col}"/>`;
  }
  const TUNG = {
    2: [[30, 25, 9], [30, 59, 9]],
    3: [[17, 21, 8], [30, 42, 8], [43, 63, 8]],
    4: [[19, 25, 8], [41, 25, 8], [19, 59, 8], [41, 59, 8]],
    5: [[18, 22, 7], [42, 22, 7], [30, 42, 7], [18, 62, 7], [42, 62, 7]],
    6: [[19, 21, 7], [41, 21, 7], [19, 42, 7], [41, 42, 7], [19, 63, 7], [41, 63, 7]],
    7: [[15, 15, 6], [30, 20, 6], [45, 25, 6], [19, 46, 6.5], [41, 46, 6.5], [19, 65, 6.5], [41, 65, 6.5]],
    8: [[19, 17, 6], [41, 17, 6], [19, 34, 6], [41, 34, 6], [19, 51, 6], [41, 51, 6], [19, 68, 6], [41, 68, 6]],
    9: [[16, 21, 6], [30, 21, 6], [44, 21, 6], [16, 42, 6], [30, 42, 6], [44, 42, 6], [16, 63, 6], [30, 63, 6], [44, 63, 6]],
  };
  // pola warna per angka, mengikuti set klasik
  const TUNG_COLS = {
    2: [GREEN, BLUE],
    3: [BLUE, RED, GREEN],
    4: [BLUE, GREEN, GREEN, BLUE],
    5: [BLUE, GREEN, RED, GREEN, BLUE],
    6: [GREEN, GREEN, RED, RED, RED, RED],
    7: [GREEN, GREEN, GREEN, RED, RED, RED, RED],
    8: [BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE],
    9: [GREEN, GREEN, GREEN, RED, RED, RED, BLUE, BLUE, BLUE],
  };
  function circles(n) {
    if (n === 1) {
      // 1 tung: satu lingkaran besar berhias
      let s = `<circle cx="30" cy="42" r="17" fill="${GREEN}"/>` +
        `<circle cx="30" cy="42" r="12" fill="#fff"/>` +
        `<circle cx="30" cy="42" r="7" fill="${RED}"/>` +
        `<circle cx="30" cy="42" r="2.2" fill="#fff"/>`;
      for (let i = 0; i < 8; i++) {
        const a = Math.PI / 4 * i;
        s += `<circle cx="${30 + Math.cos(a) * 9.6}" cy="${42 + Math.sin(a) * 9.6}" r="1.5" fill="${GREEN}"/>`;
      }
      return s;
    }
    const cols = TUNG_COLS[n] || [];
    return (TUNG[n] || []).map((d, i) => dot(d[0], d[1], d[2], cols[i] || GREEN)).join('');
  }

  // ---- batang bambu (sok) ----
  function stick(x, y, h, col, rot) {
    const w = 8;
    const r = `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="3.5" fill="${col}"/>` +
      `<rect x="${x - w / 2}" y="${y - 2}" width="${w}" height="4" fill="#fff" opacity="0.55"/>`;
    return rot ? `<g transform="rotate(${rot} ${x} ${y})">${r}</g>` : r;
  }
  const SOK = { // baris: [y, tinggi, [x...]]
    2: [[25, 24, [30]], [59, 24, [30]]],
    3: [[24, 24, [30]], [60, 24, [19, 41]]],
    4: [[25, 24, [19, 41]], [59, 24, [19, 41]]],
    5: [[21, 20, [18, 42]], [42, 20, [30]], [63, 20, [18, 42]]],
    6: [[25, 24, [16, 30, 44]], [59, 24, [16, 30, 44]]],
    7: [[17, 16, [30]], [42, 18, [16, 30, 44]], [65, 18, [16, 30, 44]]],
    9: [[18, 16, [16, 30, 44]], [42, 16, [16, 30, 44]], [66, 16, [16, 30, 44]]],
  };
  // batang merah per angka (indeks urut baris atas→bawah, kiri→kanan) — sesuai set standar
  // 9 sok: KOLOM tengah merah (garis vertikal di tengah)
  const SOK_RED = { 5: [2], 7: [0], 9: [1, 4, 7] };

  // 1 sok: burung (ciri khas set standar)
  function sokBird() {
    return `
      <g>
        <path d="M40 60 q9 3 13 -3" stroke="${GREEN}" stroke-width="3.4" fill="none" stroke-linecap="round"/>
        <path d="M39 64 q8 7 13 5" stroke="${RED}" stroke-width="3.4" fill="none" stroke-linecap="round"/>
        <path d="M37 68 q5 9 11 10" stroke="${GREEN}" stroke-width="3.4" fill="none" stroke-linecap="round"/>
        <ellipse cx="31" cy="47" rx="11.5" ry="15.5" fill="${GREEN}" transform="rotate(-18 31 47)"/>
        <path d="M33 40 q11 -3 14 6 q-9 4 -14 0 z" fill="${RED}"/>
        <circle cx="22" cy="26" r="7.2" fill="${GREEN}"/>
        <path d="M15.5 24.5 L6.5 27.5 L15.5 30 z" fill="${RED}"/>
        <circle cx="21" cy="24.5" r="1.7" fill="#fff"/>
        <path d="M22 19.5 l2.5 -5 M25 20.5 l4 -3.5" stroke="${RED}" stroke-width="2" stroke-linecap="round"/>
        <path d="M26 62 l-2.5 11 M31.5 63 l0.5 10.5" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M20 73 h7 M28.5 73.5 h7" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>
      </g>`;
  }

  function sticks(n) {
    if (n === 1) return sokBird();
    if (n === 8) {
      // 8 sok: dua kelompok miring membentuk M / W
      const top = [stick(16, 25, 22, GREEN, 16), stick(26.5, 25, 22, GREEN, -16),
        stick(33.5, 25, 22, GREEN, 16), stick(44, 25, 22, GREEN, -16)];
      const bot = [stick(16, 59, 22, GREEN, -16), stick(26.5, 59, 22, GREEN, 16),
        stick(33.5, 59, 22, GREEN, -16), stick(44, 59, 22, GREEN, 16)];
      return top.join('') + bot.join('');
    }
    const rows = SOK[n] || [];
    const all = [];
    rows.forEach(r => r[2].forEach(x => all.push([x, r[0], r[1]])));
    const reds = SOK_RED[n] || [];
    return all.map((s, i) =>
      stick(s[0], s[1], s[2], reds.includes(i) ? RED : GREEN)).join('');
  }

  const WINDS = { e: '東', s: '南', w: '西', n: '北' };

  // ---- tile bonus: 4 bunga (梅蘭菊竹) & 4 musim (春夏秋冬), bernomor 1-4 ----
  const FLOWERS = ['', '梅', '蘭', '菊', '竹'];
  const SEASONS = ['', '春', '夏', '秋', '冬'];
  function blossom(cx, cy, scale) {
    let s = '';
    for (let i = 0; i < 8; i++) {
      s += `<ellipse cx="${cx}" cy="${cy}" rx="${3.2 * scale}" ry="${8 * scale}" fill="${GREEN}" opacity="0.9"
        transform="rotate(${i * 45} ${cx} ${cy}) translate(0 ${-7 * scale})"/>`;
    }
    s += `<circle cx="${cx}" cy="${cy}" r="${4.4 * scale}" fill="${RED}"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${1.6 * scale}" fill="#fff"/>`;
    return s;
  }
  function flowerFace(v) {
    if (!v) { // versi lama tanpa nomor — tetap didukung
      return blossom(30, 47, 1.5) + text(13, 18, 12, RED, '花');
    }
    return text(12, 20, 13, RED, v, 800) +           // nomor merah di pojok (1-4)
      text(30, 44, 26, GREEN, FLOWERS[v]) +          // nama bunga
      blossom(30, 66, 0.9);
  }
  function seasonFace(v) {
    let sun = `<circle cx="30" cy="66" r="6" fill="none" stroke="${RED}" stroke-width="2"/>` +
      `<circle cx="30" cy="66" r="2" fill="${RED}"/>`;
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 4 * i;
      sun += `<line x1="${30 + Math.cos(a) * 8.5}" y1="${66 + Math.sin(a) * 8.5}"
        x2="${30 + Math.cos(a) * 11}" y2="${66 + Math.sin(a) * 11}" stroke="${RED}" stroke-width="2" stroke-linecap="round"/>`;
    }
    return text(12, 20, 13, BLUE, v, 800) +          // nomor biru di pojok (1-4)
      text(30, 44, 26, RED, SEASONS[v]) +            // nama musim
      sun;
  }

  // ---- joker (dipakai di J2 house rules) — burung di atas perisai ----
  function jokerFace() {
    return (
      // perisai
      `<path d="M15 24 H45 V54 Q45 67 30 74 Q15 67 15 54 Z" fill="#fff" stroke="${RED}" stroke-width="2.8"/>` +
      `<path d="M19 28 H41 V53 Q41 63 30 69 Q19 63 19 53 Z" fill="none" stroke="${RED}" stroke-width="1" opacity=".45"/>` +
      // burung (memakai gambar burung 1 sok, diperkecil di dalam perisai)
      `<g transform="translate(30 47) scale(0.6) translate(-29 -46)">${sokBird()}</g>`
    );
  }

  function tileSVG(spec) {
    const [kind, val] = spec.split(':');
    const v = parseInt(val) || 0;
    let inner = '', label = spec;
    if (kind === 'wan') {
      inner = text(30, 33, 27, INK, NUM_CN[v]) + text(30, 70, 27, RED, '萬');
      label = v + ' wan';
    } else if (kind === 'tung') {
      inner = circles(v); label = v + ' tung';
    } else if (kind === 'sok') {
      inner = sticks(v); label = v + ' sok';
    } else if (kind === 'wind') {
      inner = text(30, 55, 36, INK, WINDS[val] || '東');
      label = 'angin ' + (WINDS[val] || '');
    } else if (kind === 'dragon') {
      if (val === 'c') { inner = text(30, 55, 36, RED, '中'); label = 'naga merah'; }
      else if (val === 'f') { inner = text(30, 55, 36, GREEN, '發'); label = 'naga hijau'; }
      else { inner = `<rect x="14" y="20" width="32" height="44" rx="4" fill="none" stroke="${BLUE}" stroke-width="3"/>` +
        `<rect x="20" y="27" width="20" height="30" rx="2" fill="none" stroke="${BLUE}" stroke-width="2"/>`; label = 'naga putih'; }
    } else if (kind === 'flower') {
      inner = flowerFace(v);
      label = 'bunga ' + (FLOWERS[v] || '');
    } else if (kind === 'season') {
      inner = seasonFace(v || 1);
      label = 'musim ' + (SEASONS[v] || '');
    } else if (kind === 'joker') {
      inner = jokerFace();
      label = 'joker';
    } else if (kind === 'back') {
      inner = `<rect x="7" y="7" width="46" height="70" rx="6" fill="${GREEN}"/>` +
        `<rect x="12" y="12" width="36" height="60" rx="4" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.5"/>`;
      label = 'tile tertutup';
    }
    return `<svg viewBox="0 0 60 84" class="mtile" role="img" aria-label="${label}">` +
      `<rect x="1.5" y="1.5" width="57" height="81" rx="9" fill="#FFFFFF" stroke="${INK}" stroke-width="2.5"/>${inner}</svg>`;
  }

  function render() {
    document.querySelectorAll('[data-tile]').forEach(el => {
      el.innerHTML = tileSVG(el.dataset.tile);
    });
    document.querySelectorAll('[data-tiles]').forEach(el => {
      el.innerHTML = el.dataset.tiles.split(',')
        .map(s => s.trim())
        .map(s => s === '+' ? '<span class="tile-plus">+</span>'
                : s === '|' ? '<span class="tile-gap"></span>'
                : tileSVG(s)).join('');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();

  // Dipakai halaman yang menggambar tile secara dinamis (mis. /kuis).
  window.MJ = { tileSVG: tileSVG, render: render };
})();
