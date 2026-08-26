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

  // 5 tangan per level: naik levelnya cepat, dan tiap level menambah satu
  // hal baru yang harus dihitung (lihat makeCtx di kuis.js).
  const HANDS_PER_LEVEL = 5;
  const MODE = {
    faan: { unit: 'faan', unitEn: 'faan', modul: '/modul-02', store: 'tsmc.kuis.best.faan' },
    j2: { unit: 'poin', unitEn: 'points', modul: '/modul-04', store: 'tsmc.kuis.best.j2' },
  };

  const G = { mode: 'faan', level: 1, handNo: 0, score: 0, hand: null, answer: 0,
    locked: false, fb: null, best: 0, champ: false };

  // Menjawab benar sebanyak ini = tamat: 5 level × 5 tangan.
  const TOTAL_HANDS = () => K.MAX_LEVEL * HANDS_PER_LEVEL;
  // Nama aturan untuk ucapan selamat.
  const ruleName = () => (G.mode === 'j2' ? 'J2 Style Rules' : 'TSMC Rules');

  // ---------- bahasa ----------
  // Teks yang digambar oleh JavaScript tidak bisa memakai atribut data-en,
  // jadi pasangan Indonesia/Inggrisnya ditulis langsung di pemanggilan t().
  const lang = () => (window.I18N ? window.I18N.get() : 'id');
  const t = (id, en) => (lang() === 'en' ? en : id);
  const unit = (m) => (lang() === 'en' ? MODE[m || G.mode].unitEn : MODE[m || G.mode].unit);
  const startLabel = () => (G.mode === 'faan'
    ? t('Mulai kuis faan', 'Start the faan quiz')
    : t('Mulai kuis poin J2', 'Start the J2 points quiz'));

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

  function setTag(s) {
    if (s.open) return t('TERBUKA', 'OPEN');
    if (s.k === 'kong') return 'KONG';
    if (s.k === 'pair') return t('PASANGAN', 'PAIR');
    return '';
  }

  function renderHand(hand) {
    const box = $('q-sets');
    box.className = 'sets' + (hand.kind === 'std' || hand.kind === 'pairs' ? '' : ' solo');
    let i = 0;
    box.innerHTML = hand.sets.map((s) => {
      const jok = s.j || [];
      const row = s.t.map((t, ti) => tile(jok.indexOf(ti) >= 0 ? 'joker' : t, i++)).join('');
      const tag = setTag(s);
      return '<div class="set' + (s.open ? ' open' : '') + '"><div class="row">' + row + '</div>'
        + (tag ? '<span class="tag">' + tag + '</span>' : '') + '</div>';
    }).join('');
  }

  function chip(label, value, strong) {
    return '<span class="chip' + (strong ? ' on' : '') + '"><small>' + label + '</small><b>' + value + '</b></span>';
  }

  function renderCtx(hand) {
    const c = hand.ctx;
    const W = lang() === 'en' ? K.WIND_EN : K.WIND_ID;
    const out = [
      chip(t('Angin duduk', 'Seat wind'), K.WIND_CN[c.seat] + ' ' + W[c.seat], true),
      chip(t('Angin putaran', 'Round wind'), K.WIND_CN[c.round] + ' ' + W[c.round], true),
    ];
    // Zimo dan nomor kursi bernilai di kedua aturan, jadi chip-nya selalu
    // tampil — di TSMC nomor kursi menentukan bunga mana yang berfaan.
    out.push(chip(t('Cara menang', 'How it was won'), c.zimo ? 'Zimo' : 'Ron', c.zimo));
    out.push(chip(t('Nomor kursi', 'Seat number'), String(K.SEAT_NO[c.seat])));
    if (G.mode === 'j2') {
      out.push(chip(t('Tangan', 'Hand'),
        c.concealed ? t('Tertutup', 'Concealed') : t('Ada set terbuka', 'Has an open set'), c.concealed));
      out.push(chip(t('Joker dipakai', 'Jokers used'),
        c.jokers ? String(c.jokers) : t('tidak ada', 'none'), !!c.jokers));
      if (c.lastTile) out.push(chip('Bonus', 'Last tile', true));
      if (c.robKong) out.push(chip('Bonus', t('Mencuri kong', 'Robbing the kong'), true));
      if (c.buntut) out.push(chip('Bonus', t('Menang dari buntut', 'Replacement tile'), true));
    }
    $('q-ctx').innerHTML = out.join('');

    // Bunga dihitung di kedua aturan, jadi barisnya tampil di kedua mode.
    // Disembunyikan di level awal, saat kuis belum pernah membagikan bunga.
    const fl = $('q-flowers');
    if (c.flowers.length || G.level >= 3) {
      fl.style.display = '';
      fl.innerHTML = '<small>' + t('BUNGA DI DEPANMU', 'YOUR FLOWER TILES') + '</small>'
        + (c.flowers.length
          ? '<span class="row">' + c.flowers.map((f, i) => tile(f, i)).join('') + '</span>'
          : '<span class="no">' + t('tidak ada', 'none') + '</span>');
    } else {
      fl.style.display = 'none';
    }
  }

  // ---------- rincian nilai ----------
  function breakdownHTML(hand) {
    const res = hand.result;
    const rows = res.lines.map((l, i) => {
      const x = K.lineText(l, lang());
      return '<div class="ln" style="animation-delay:' + (i * 55) + 'ms"><span><b>' + x.name + '</b>'
        + (x.sub ? '<small>' + x.sub + '</small>' : '') + '</span>'
        + '<i>' + (l.value >= 0 ? '+' : '') + l.value + '</i></div>';
    }).join('');
    const u = unit();
    let note = '';
    if (res.final) {
      note = '<div class="note">' + t(
        'Tangan 10 poin ke atas nilainya <b>final</b> — zimo, joker, hand tertutup, pair penutup, dan bunga tidak menambah apa pun.',
        'Hands worth 10 points and up are <b>final</b> — zimo, jokers, a concealed hand, the closing pair and flowers add nothing.') + '</div>';
    } else if (res.capped) {
      note = '<div class="note">' + t(
        'Totalnya lebih dari 13, tapi maksimum yang dihitung tetap <b>13 faan</b>.',
        'The total runs past 13, but the maximum that counts is still <b>13 faan</b>.') + '</div>';
    } else if (res.total < res.rules.min) {
      note = '<div class="note">' + t(
        'Di bawah minimum ' + res.rules.min + ' ' + u + ' — tangan seperti ini belum boleh dideklarasikan menang.',
        'Below the ' + res.rules.min + '-' + u + ' minimum — a hand like this cannot be declared a win.') + '</div>';
    }
    return '<div class="bd">' + rows
      + '<div class="tot"><span>TOTAL</span><b>' + res.total + ' ' + u.toUpperCase() + '</b></div>'
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
    G.mode = mode; G.level = 1; G.handNo = 0; G.score = 0; G.champ = false;
    $('confetti').innerHTML = '';
    $('over-champ').style.display = 'none';
    setTheme(mode, false);
    $('play-modul').href = MODE[mode].modul;
    $('over-modul').href = MODE[mode].modul;
    $('ans-unit').textContent = unit(mode).toUpperCase();
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
    G.fb = null;
    $('dock').style.display = '';
    $('feedback').innerHTML = '';
  }

  function setAnswer(v, silent) {
    G.answer = Math.max(0, Math.min(40, v));
    const el = $('ans-val');
    el.textContent = G.answer;
    if (!silent && !reduce) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  }

  function paintFeedback() {
    const f = G.fb;
    if (!f) return;
    const fb = $('feedback');
    const u = unit();
    if (f.ok) {
      // Tangan terakhir dijawab benar → tamat, bukan lanjut ke soal berikutnya.
      const tamat = G.handNo >= TOTAL_HANDS();
      fb.innerHTML = '<div class="fb ok"><div class="head"><b>'
        + (tamat ? t('Sempurna!', 'Perfect!') : t('Betul!', 'Correct!')) + '</b>'
        + '<span>+' + f.correct + ' ' + u + '</span></div>'
        + breakdownHTML(G.hand)
        + '<button class="kbtn wide" id="fb-next">'
        + (tamat ? t('Terima pialamu 🏆', 'Claim your trophy 🏆') : t('Lanjut →', 'Next hand →'))
        + '</button></div>';
      $('fb-next').onclick = () => (tamat ? gameOver(true) : nextHand(false));
    } else {
      fb.innerHTML = '<div class="fb no"><div class="head"><b>' + t('Belum tepat', 'Not quite') + '</b><span>'
        + t('jawabanmu ' + f.given + ' · seharusnya ' + f.correct,
            'you said ' + f.given + ' · it was ' + f.correct) + '</span></div>'
        + breakdownHTML(G.hand)
        + '<button class="kbtn wide" id="fb-next">' + t('Lihat hasil →', 'See your result →') + '</button></div>';
      $('fb-next').onclick = () => gameOver(false);
    }
  }

  function submit() {
    if (G.locked) return;
    G.locked = true;
    const correct = G.hand.answer;
    const ok = G.answer === correct;
    G.fb = { ok: ok, correct: correct, given: G.answer };
    $('dock').style.display = 'none';
    const sets = $('q-sets');
    if (ok) {
      const before = G.score;
      G.score += correct;
      countUp($('hud-score'), before, G.score);
      sets.classList.add('win');
    } else {
      sets.classList.add('lose');
    }
    paintFeedback();
    const fb = $('feedback');
    if (fb.scrollIntoView) fb.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
  }

  function paintOver() {
    const u = unit();
    const n = TOTAL_HANDS();
    $('over-unit').textContent = u.toUpperCase();
    $('over-sub').innerHTML = G.champ
      ? t('Tamat di <b>level ' + K.MAX_LEVEL + '</b> · <b>' + n + '</b> tangan, semuanya benar',
          'Finished <b>level ' + K.MAX_LEVEL + '</b> · <b>' + n + '</b> hands, every one correct')
      : t('Sampai <b>level ' + G.level + '</b> · tumbang di tangan ke-<b>' + G.handNo + '</b>',
          'Reached <b>level ' + G.level + '</b> · fell on hand <b>' + G.handNo + '</b>');
    $('over-best').innerHTML = t(
      'Rekor di perangkat ini: <b>' + G.best + ' ' + u + '</b>',
      'Best on this device: <b>' + G.best + ' ' + u + '</b>');
    $('champ-kick').textContent = t('RONDE SEMPURNA · ' + n + ' TANGAN',
      'PERFECT RUN · ' + n + ' HANDS');
    $('champ-rule').textContent = ruleName();
  }

  // Hujan confetti — dibuat sekali, lalu membersihkan dirinya sendiri.
  function confetti() {
    const box = $('confetti');
    if (!box) return;
    box.innerHTML = '';
    if (reduce) return;
    const warna = G.mode === 'j2'
      ? ['#D4AF37', '#F5DE8C', '#FAFCF5', '#C02028', '#8C6B12']
      : ['#D4AF37', '#F5DE8C', '#FAFCF5', '#087048', '#C02028'];
    let html = '';
    for (let i = 0; i < 90; i++) {
      const w = 6 + Math.random() * 7;
      const h = 8 + Math.random() * 10;
      html += '<i class="' + (Math.random() < 0.3 ? 'round' : '') + '" style="'
        + 'left:' + (Math.random() * 100).toFixed(2) + '%;'
        + 'width:' + w.toFixed(1) + 'px;height:' + (Math.random() < 0.3 ? w : h).toFixed(1) + 'px;'
        + 'background:' + warna[i % warna.length] + ';'
        + '--dx:' + Math.round(-120 + Math.random() * 240) + 'px;'
        + 'animation-duration:' + (2.6 + Math.random() * 2.6).toFixed(2) + 's,'
        + (0.7 + Math.random() * 1.4).toFixed(2) + 's;'
        + 'animation-delay:' + (Math.random() * 1.6).toFixed(2) + 's,0s;'
        + '"></i>';
    }
    box.innerHTML = html;
    // Hapus setelah animasinya habis supaya tidak membebani halaman.
    clearTimeout(confetti.t);
    confetti.t = setTimeout(() => { box.innerHTML = ''; }, 7000);
  }

  function gameOver(champ) {
    G.champ = !!champ;
    G.best = saveBest(G.mode, G.score);
    paintOver();
    $('over-champ').style.display = G.champ ? '' : 'none';
    // nasihat "ulangi lagi" tidak cocok untuk yang baru saja tamat
    $('over-tip').style.display = G.champ ? 'none' : '';
    $('over-new').style.display = (G.score >= G.best && G.score > 0) ? '' : 'none';
    show('over');
    countUp($('over-score'), 0, G.score);
    if (G.champ) confetti();
    if (window.scrollTo) window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }

  function toStart() {
    $('confetti').innerHTML = '';
    $('over-champ').style.display = 'none';
    G.champ = false;
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
        $('start-go').textContent = startLabel();
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

  // Dipanggil tiap kali bahasa berganti: teks yang sudah terlanjur digambar
  // oleh JavaScript perlu ditulis ulang dalam bahasa yang baru.
  function relang() {
    $('start-go').textContent = startLabel();
    $('ans-unit').textContent = unit().toUpperCase();
    // teks rekor ikut tertulis ulang saat kalimat pembungkusnya diganti
    $('best-faan').textContent = readBest('faan');
    $('best-j2').textContent = readBest('j2');
    if (G.hand && $('scr-play').style.display !== 'none') {
      $('q-sets').querySelectorAll('.set').forEach((el, i) => {
        const tag = el.querySelector('.tag');
        if (tag && G.hand.sets[i]) tag.textContent = setTag(G.hand.sets[i]);
      });
      renderCtx(G.hand);
      if (G.locked) paintFeedback();
    }
    if ($('scr-over').style.display !== 'none') paintOver();
  }

  function init() {
    if (!K || !MJ) return;
    document.body.setAttribute('data-theme', 'tsmc');
    buildRain();
    bind();
    if (window.I18N) window.I18N.onChange(relang);
    $('start-go').textContent = startLabel();
    toStart();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
