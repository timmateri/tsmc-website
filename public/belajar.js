// ============================================================
// TSMC — Penggambar tile mahjong (SVG)
// Pakai: <span data-tile="wan:3"></span>  atau
//        <div class="tile-row" data-tiles="tung:1,tung:2,sok:5"></div>
// Jenis: wan:1-9 · tung:1-9 · sok:1-9 · wind:e/s/w/n ·
//        dragon:c/f/b · flower · back
// ============================================================
'use strict';
(function () {
  const INK = '#04331F', RED = '#C02028', GREEN = '#087048', BLUE = '#1E4D8C';
  const NUM_CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const DOT_COLORS = [GREEN, RED, BLUE];

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
    1: [[30, 42, 15]],
    2: [[30, 25, 9], [30, 59, 9]],
    3: [[17, 21, 8], [30, 42, 8], [43, 63, 8]],
    4: [[19, 25, 8], [41, 25, 8], [19, 59, 8], [41, 59, 8]],
    5: [[18, 22, 7], [42, 22, 7], [30, 42, 7], [18, 62, 7], [42, 62, 7]],
    6: [[19, 21, 7], [41, 21, 7], [19, 42, 7], [41, 42, 7], [19, 63, 7], [41, 63, 7]],
    7: [[15, 15, 6], [30, 20, 6], [45, 25, 6], [19, 46, 6.5], [41, 46, 6.5], [19, 65, 6.5], [41, 65, 6.5]],
    8: [[19, 17, 6], [41, 17, 6], [19, 34, 6], [41, 34, 6], [19, 51, 6], [41, 51, 6], [19, 68, 6], [41, 68, 6]],
    9: [[16, 21, 6], [30, 21, 6], [44, 21, 6], [16, 42, 6], [30, 42, 6], [44, 42, 6], [16, 63, 6], [30, 63, 6], [44, 63, 6]],
  };
  function circles(n) {
    return (TUNG[n] || []).map((d, i) =>
      dot(d[0], d[1], d[2], DOT_COLORS[i % 3])).join('');
  }

  // ---- batang bambu (sok) ----
  function stick(x, y, h, col) {
    const w = 8;
    return `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="3.5" fill="${col}"/>` +
      `<rect x="${x - w / 2}" y="${y - 2}" width="${w}" height="4" fill="#fff" opacity="0.55"/>`;
  }
  const SOK = { // baris: [y, tinggi, [x...]]
    1: [[42, 34, [30]]],
    2: [[25, 24, [30]], [59, 24, [30]]],
    3: [[24, 24, [30]], [60, 24, [19, 41]]],
    4: [[25, 24, [19, 41]], [59, 24, [19, 41]]],
    5: [[21, 20, [18, 42]], [42, 20, [30]], [63, 20, [18, 42]]],
    6: [[25, 24, [16, 30, 44]], [59, 24, [16, 30, 44]]],
    7: [[17, 16, [30]], [42, 18, [16, 30, 44]], [65, 18, [16, 30, 44]]],
    8: [[21, 20, [13, 24.5, 35.5, 47]], [63, 20, [13, 24.5, 35.5, 47]]],
    9: [[18, 16, [16, 30, 44]], [42, 16, [16, 30, 44]], [66, 16, [16, 30, 44]]],
  };
  function sticks(n) {
    const rows = SOK[n] || [];
    const all = [];
    rows.forEach(r => r[2].forEach(x => all.push([x, r[0], r[1]])));
    // batang paling tengah dibuat merah pada jumlah ganjil (gaya set klasik)
    const midIdx = n % 2 === 1 ? Math.floor(all.length / 2) : -1;
    return all.map((s, i) =>
      stick(s[0], s[1], s[2], i === midIdx ? RED : GREEN)).join('');
  }

  const WINDS = { e: '東', s: '南', w: '西', n: '北' };

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
      inner = text(30, 48, 30, RED, '花') + text(30, 72, 13, GREEN, '❀', 400);
      label = 'bunga';
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
})();
