// ============================================================
// TSMC — Kuis Tebak Poin: tampilan, animasi & alur permainan
// Mesin penilaian: /kuis.js · gambar tile SVG: /belajar.js (window.MJ)
// Halaman ini berdiri sendiri, tidak memakai gaya modul belajar.
// ============================================================
'use strict';
(function () {
  const K = window.KUIS;
  const MJ = window.MJ;
  const $ = (id) => document.getElementById(id);
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const HANDS_PER_LEVEL = 10;
  const MODE = {
    faan: { unit: 'faan', modul: '/modul-02', store: 'tsmc.kuis.best.faan' },
    j2: { unit: 'poin', modul: '/modul-04', store: 'tsmc.kuis.best.j2' },
  };

  const G = { mode: 'faan', level: 1, handNo: 0, score: 0, hand: null, answer: 0, locked: false };

  // ---------- rekor tersimpan di perangkat ----------
  function readBest(mode) {
    try { return parseInt(localStorage.getItem(MODE[mode].store) || '0', 10) || 0; } catch (e) { return 0; }
  }
  function saveBest(mode, v) {
    try { if (v > readBest(mode)) localStorage.setItem(MODE[mode].store, String(v)); } catch (e) {}
    return readBest(mode);
  }

  // ---------- tema ----------
  // Tema TSMC = meja felt hijau. Tema J2 = maroon + emas, mengikuti rulebook
  // J2 Style Mahjong, lengkap dengan logo J2 Mahjong.
  function setTheme(mode, flash) {
    const b = document.body;
    const next = mode === 'j2' ? 'j2' : 'tsmc';
    if (b.getAttribute('data-theme') === next) return;
    b.setAttribute('data-theme', next);
    // warna bar browser di HP ikut tema
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next === 'j2' ? '#231518' : '#04331F');
    const eb = $('hero-eyebrow');
    if (eb) eb.textContent = next === 'j2' ? 'J2 STYLE MAHJONG · HOUSE RULES' : 'THE SOCIAL MAHJONG CLUB';
    buildRain();
    if (flash && !reduce) { b.classList.remove('swap'); void b.offsetWidth; b.classList.add('swap'); }
  }

  // ---------- hujan tile di latar ----------
  const RAIN_TSMC = ['wan:1', 'wan:5', 'wan:9', 'tung:1', 'tung:5', 'tung:8', 'sok:1', 'sok:5', 'sok:9',
    'wind:e', 'wind:s', 'wind:w', 'wind:n', 'dragon:c', 'dragon:f', 'dragon:b', 'flower:2', 'season:1'];
  const RAIN_J2 = RAIN_TSMC.concat(['joker', 'joker', 'flower:1', 'flower:3', 'season:2', 'season:4']);
  function buildRain() {
    if (reduce) return;
    const RAIN_POOL = document.body.getAttribute('data-theme') === 'j2' ? RAIN_J2 : RAIN_TSMC;
    const box = $('rain');
    const w0 = window.innerWidth;
    const n = w0 < 420 ? 8 : (w0 < 640 ? 11 : 18);
    let html = '';
    for (let i = 0; i < n; i++) {
      const spec = RAIN_POOL[Math.floor(Math.random() * RAIN_POOL.length)];
      const w = 34 + Math.random() * 44;                 // lebar tile
      const dur = 17 + Math.random() * 20;               // lama jatuh
      const delay = -Math.random() * dur;                // sebar posisi awal
      const r0 = Math.round(-40 + Math.random() * 80);
      const r1 = r0 + Math.round(-90 + Math.random() * 180);
      const dx = Math.round(-90 + Math.random() * 180);
      html += '<span style="left:' + (Math.random() * 100).toFixed(2) + '%;width:' + w.toFixed(0) + 'px;'
        + 'opacity:' + (0.09 + Math.random() * 0.12).toFixed(2) + ';'
        + '--r0:' + r0 + 'deg;--r1:' + r1 + 'deg;--dx:' + dx + 'px;'
        + 'animation-duration:' + dur.toFixed(1) + 's,' + (2.4 + Math.random()).toFixed(1) + 's;'
        + 'animation-delay:' + delay.toFixed(1) + 's,0s">' + MJ.tileSVG(spec) + '</span>';
    }
    box.innerHTML = html;
  }

  // ---------- tile ----------
  function tile(spec, i) {
    return MJ.tileSVG(spec).replace('class="mtile"', 'class="mt" style="--i:' + i + '"');
  }

  function renderHand(hand) {
    const box = $('q-sets');
    box.className = 'sets' + (hand.kind === 'std' || hand.kind === 'pairs' ? '' : ' solo');
    let i = 0;
    box.innerHTML = hand.sets.map((s) => {
      const jok = s.j || [];
      const row = s.t.map((t, ti) => tile(jok.indexOf(ti) >= 0 ? 'joker' : t, i++)).join('');
      const tag = s.open ? 'TERBUKA' : (s.k === 'kong' ? 'KONG' : (s.k === 'pair' ? 'PASANGAN' : ''));
      return '<div class="set' + (s.open ? ' open' : '') + '"><div class="row">' + row + '</div>'
        + (tag ? '<span class="tag">' + tag + '</span>' : '') + '</div>';
    }).join('');
  }

  function chip(label, value, strong) {
    return '<span class="chip' + (strong ? ' on' : '') + '"><small>' + label + '</small><b>' + value + '</b></span>';
  }

  function renderCtx(hand) {
    const c = hand.ctx;
    const out = [
      chip('Angin duduk', K.WIND_CN[c.seat] + ' ' + K.WIND_ID[c.seat], true),
      chip('Angin putaran', K.WIND_CN[c.round] + ' ' + K.WIND_ID[c.round], true),
    ];
    if (G.mode === 'j2') {
      out.push(chip('Nomor kursi', String(K.SEAT_NO[c.seat])));
      out.push(chip('Cara menang', c.zimo ? 'Zimo' : 'Ron', c.zimo));
      out.push(chip('Tangan', c.concealed ? 'Tertutup' : 'Ada set terbuka', c.concealed));
      out.push(chip('Joker dipakai', c.jokers ? String(c.jokers) : 'tidak ada', !!c.jokers));
      if (c.lastTile) out.push(chip('Bonus', 'Last tile', true));
      if (c.robKong) out.push(chip('Bonus', 'Mencuri kong', true));
      if (c.buntut) out.push(chip('Bonus', 'Menang dari buntut', true));
    }
    $('q-ctx').innerHTML = out.join('');

    const fl = $('q-flowers');
    if (G.mode === 'j2') {
      fl.style.display = '';
      fl.innerHTML = '<small>BUNGA DI DEPANMU</small>'
        + (c.flowers.length
          ? '<span class="row">' + c.flowers.map((f, i) => tile(f, i)).join('') + '</span>'
          : '<span class="no">tidak ada</span>');
    } else {
      fl.style.display = 'none';
    }
  }

  // ---------- rincian nilai ----------
  function breakdownHTML(hand) {
    const res = hand.result;
    const rows = res.lines.map((l, i) => {
      const t = K.lineText(l, G.mode);
      return '<div class="ln" style="animation-delay:' + (i * 55) + 'ms"><span><b>' + t.name + '</b>'
        + (t.sub ? '<small>' + t.sub + '</small>' : '') + '</span>'
        + '<i>' + (l.value >= 0 ? '+' : '') + l.value + '</i></div>';
    }).join('');
    const unit = MODE[G.mode].unit;
    let note = '';
    if (res.capped) note = '<div class="note">Totalnya lebih dari 13, tapi maksimum yang dihitung tetap <b>13 faan</b>.</div>';
    else if (res.total < res.rules.min) note = '<div class="note">Di bawah minimum ' + res.rules.min + ' ' + unit
      + ' — tangan seperti ini belum boleh dideklarasikan menang.</div>';
    return '<div class="bd">' + rows
      + '<div class="tot"><span>TOTAL</span><b>' + res.total + ' ' + unit.toUpperCase() + '</b></div>'
      + note + '</div>';
  }

  // ---------- animasi kecil ----------
  function countUp(el, from, to) {
    if (reduce || from === to) { el.textContent = to; return; }
    const t0 = performance.now(), dur = 520;
    (function step(t) {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  function levelUp(lv) {
    const el = $('levelup');
    el.querySelector('b').textContent = lv;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }
  function dots(n) {
    let h = '';
    for (let i = 1; i <= HANDS_PER_LEVEL; i++) h += '<i class="' + (i <= n ? 'on' : '') + '"></i>';
    $('hud-dots').innerHTML = h;
  }

  // ---------- alur ----------
  function show(scr) {
    ['start', 'play', 'over'].forEach((s) => {
      const el = $('scr-' + s);
      el.style.display = s === scr ? '' : 'none';
      if (s === scr) { el.classList.remove('scr'); void el.offsetWidth; el.classList.add('scr'); }
    });
  }

  function startGame(mode) {
    G.mode = mode; G.level = 1; G.handNo = 0; G.score = 0;
    setTheme(mode, false);
    $('play-modul').href = MODE[mode].modul;
    $('over-modul').href = MODE[mode].modul;
    $('ans-unit').textContent = MODE[mode].unit.toUpperCase();
    $('hud-score').textContent = '0';
    show('play');
    nextHand(true);
  }

  function nextHand(first) {
    G.handNo++;
    const lv = Math.min(K.MAX_LEVEL, Math.floor((G.handNo - 1) / HANDS_PER_LEVEL) + 1);
    if (!first && lv > G.level) levelUp(lv);
    G.level = lv;
    G.hand = K.buildHand(G.mode, G.level);
    G.locked = false;
    renderHand(G.hand);
    renderCtx(G.hand);
    $('hud-lv').textContent = G.level;
    dots((G.handNo - 1) % HANDS_PER_LEVEL + 1);
    setAnswer(0, true);
    $('dock').style.display = '';
    $('feedback').innerHTML = '';
  }

  function setAnswer(v, silent) {
    G.answer = Math.max(0, Math.min(40, v));
    const el = $('ans-val');
    el.textContent = G.answer;
    if (!silent && !reduce) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  }

  function submit() {
    if (G.locked) return;
    G.locked = true;
    const correct = G.hand.answer;
    const ok = G.answer === correct;
    const sets = $('q-sets');
    $('dock').style.display = 'none';
    const fb = $('feedback');

    if (ok) {
      const before = G.score;
      G.score += correct;
      countUp($('hud-score'), before, G.score);
      sets.classList.add('win');
      fb.innerHTML = '<div class="fb ok"><div class="head"><b>Betul!</b><span>+' + correct + ' ' + MODE[G.mode].unit + '</span></div>'
        + breakdownHTML(G.hand)
        + '<button class="kbtn wide" id="fb-next">Lanjut →</button></div>';
      $('fb-next').onclick = () => nextHand(false);
    } else {
      sets.classList.add('lose');
      fb.innerHTML = '<div class="fb no"><div class="head"><b>Belum tepat</b><span>jawabanmu ' + G.answer
        + ' · seharusnya ' + correct + '</span></div>'
        + breakdownHTML(G.hand)
        + '<button class="kbtn wide" id="fb-next">Lihat hasil →</button></div>';
      $('fb-next').onclick = gameOver;
    }
    if (fb.scrollIntoView) fb.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
  }

  function gameOver() {
    const b = saveBest(G.mode, G.score);
    $('over-unit').textContent = MODE[G.mode].unit.toUpperCase();
    $('over-sub').innerHTML = 'Sampai <b>level ' + G.level + '</b> · tumbang di tangan ke-<b>' + G.handNo + '</b>';
    $('over-best').innerHTML = 'Rekor di perangkat ini: <b>' + b + ' ' + MODE[G.mode].unit + '</b>';
    $('over-new').style.display = (G.score >= b && G.score > 0) ? '' : 'none';
    show('over');
    countUp($('over-score'), 0, G.score);
    if (window.scrollTo) window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }

  function toStart() {
    $('best-faan').textContent = readBest('faan');
    $('best-j2').textContent = readBest('j2');
    show('start');
  }

  // ---------- tombol & keyboard ----------
  function bind() {
    document.querySelectorAll('.mode-card').forEach((el) => {
      el.onclick = () => {
        document.querySelectorAll('.mode-card').forEach((x) => {
          x.classList.remove('sel'); x.setAttribute('aria-pressed', 'false');
        });
        el.classList.add('sel'); el.setAttribute('aria-pressed', 'true');
        G.mode = el.dataset.mode;
        $('start-go').textContent = 'Mulai kuis ' + (G.mode === 'faan' ? 'faan' : 'poin J2');
        setTheme(G.mode, true);
      };
      el.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') { el.onclick(); e.preventDefault(); }
      };
    });
    $('start-go').onclick = () => startGame(G.mode);
    $('ans-minus').onclick = () => setAnswer(G.answer - 1);
    $('ans-plus').onclick = () => setAnswer(G.answer + 1);
    $('ans-minus5').onclick = () => setAnswer(G.answer - 5);
    $('ans-plus5').onclick = () => setAnswer(G.answer + 5);
    $('ans-submit').onclick = submit;
    $('over-again').onclick = () => startGame(G.mode);
    $('over-home').onclick = toStart;

    document.addEventListener('keydown', (e) => {
      if ($('scr-play').style.display === 'none') return;
      if (!G.locked) {
        if (e.key === 'ArrowUp' || e.key === '+' || e.key === '=') { setAnswer(G.answer + 1); e.preventDefault(); }
        else if (e.key === 'ArrowDown' || e.key === '-') { setAnswer(G.answer - 1); e.preventDefault(); }
        else if (e.key === 'Enter') { submit(); e.preventDefault(); }
        else if (/^[0-9]$/.test(e.key)) { setAnswer(G.answer * 10 + parseInt(e.key, 10)); e.preventDefault(); }
        else if (e.key === 'Backspace') { setAnswer(Math.floor(G.answer / 10)); e.preventDefault(); }
      } else if (e.key === 'Enter' && $('fb-next')) { $('fb-next').click(); e.preventDefault(); }
    });
  }

  function init() {
    if (!K || !MJ) return;
    document.body.setAttribute('data-theme', 'tsmc');
    buildRain();
    bind();
    toStart();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
