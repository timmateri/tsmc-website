// ============================================================
// TSMC — Kuis "Tebak Poin"
// Mesin kuis menghitung nilai tangan mahjong memakai dua aturan:
//   · FAAN  — tabel standar TSMC (Modul 02, adopsi HKMA)
//   · POIN  — J2 House Rules komunitas temenmahjong (Modul 04)
//
// Semua angka di bawah diambil PERSIS dari kedua modul tersebut.
// Kalau tabel di modul diperbarui, ubah objek RULES di bagian 1 saja.
//
// Dipakai oleh /kuis (kuis.html) bersama /belajar.js (penggambar tile).
// Juga bisa dipanggil dari Node untuk uji otomatis:
//   const K = require('./kuis.js');  K.buildHand('faan', 3);
// ============================================================
'use strict';
(function (root) {

  // ==========================================================
  // 1. ATURAN & NILAI
  // ==========================================================

  // ---- FAAN · tabel standar TSMC (Modul 02) ----
  const FAAN = {
    // Nilai "pola tangan". Yang berlaku hanya SATU: yang tertinggi.
    // (Modul 02 menulis "sudah termasuk 3 faan All Triplets" untuk
    //  Mixed Terminals, All Honours, dan All Terminals — jadi pola
    //  besar memang menggantikan pola dasar, bukan ditumpuk.)
    shape: {
      chicken: 0, allSequences: 1, allTriplets: 3,
      mixedTerminals: 4, sevenPairs: 4, smallDragons: 5, bigDragons: 8,
      allConcealed: 10, smallWinds: 10, allHonours: 10, allTerminals: 10,
      nineGates: 10, bigWinds: 13, thirteenOrphans: 13, fourKongs: 13,
    },
    // Warna tangan — DITUMPUK di atas nilai pola.
    // (Modul 02: "All Triplets (3) + Semi Flush (3) + ..." dihitung semua.)
    flush: { semiFlush: 3, fullFlush: 7 },
    // Poin tambahan — ditumpuk juga. Zimo (menang dari ambilan sendiri)
    // bernilai +1 faan. Bunga/season dihitung di akhir permainan kalau kamu
    // menang: 1 faan untuk setiap tile yang nomornya sama dengan nomor
    // kursimu (bunga hitam maupun merah), jadi paling banyak 2 faan.
    add: { dragonPong: 1, roundWind: 1, seatWind: 1, zimo: 1, flowerSeat: 1 },
    cap: 13,      // maksimum dihitung 13 faan
    min: 3,       // minimum boleh menyatakan menang
    unit: 'FAAN',
  };

  // ---- POIN · J2 House Rules (Modul 04) ----
  // Format [pakai joker, tanpa joker]. Kalau kedua angka sama, berarti
  // tangan itu tidak punya nilai ganda — bonus "tanpa joker +2" berlaku.
  const J2 = {
    shape: {
      chicken: [0, 0], allSequences: [2, 2], allTriplets: [3, 3],
      mixedTerminals: [3, 3], smallDragons: [3, 3], semiFlush: [4, 4],
      sevenPairs: [10, 20], fullFlush: [10, 20], bigDragons: [10, 20],
      smallWinds: [10, 20], allConcealed: [10, 20], allHonours: [10, 20],
      allTerminals: [10, 20], nineGates: [12, 22], bigWinds: [12, 22],
      thirteenOrphans: [15, 25], fourKongs: [15, 25],
    },
    add: {
      dragonPong: 1, roundWind: 1, seatWind: 1, eye28: 1,
      concealed: 1, zimo: 1, plainHand: 2,
      joker: 1, noJoker: 2,
      flowerMatch: 1, seasonOther: 1, seasonMatch: 2,
      lastTile: 1, robKong: 1, buntut: 1,
      // Set lengkap 4 bunga sewarna (rulebook hal. 3). Keputusan klub:
      // +5 ini MENGGANTIKAN poin per-bunga untuk warna itu, bukan ditumpuk.
      // Jadi 4 bunga hitam = 5 poin, bukan 5 + poin bunga yang sesuai kursi.
      flowerSetBlack: 5, flowerSetRed: 5,
    },
    // TANGAN BESAR = POIN FINAL. Mulai dari Seven Pairs (10) sampai Di Hu,
    // nilai tangannya tidak menerima poin tambahan apa pun: tidak zimo,
    // tidak joker, tidak hand tertutup, tidak pair penutup, tidak bunga.
    // Contoh: Full Colour + pair 2 + tanpa bunga/naga/angin + 1 joker +
    // tertutup + zimo tetap 10 poin.
    bigFrom: 10,
    cap: null,    // tidak dipatok limit
    min: 3,
    unit: 'POIN',
  };

  // Nama tampilan tiap pola/bonus: [nama ID, keterangan ID, nama EN, keterangan EN].
  const LABEL = {
    chicken: ['Chicken Hand', 'campuran chow &amp; pong, tanpa pong honor',
      'Chicken Hand', 'mixed chows &amp; pongs, no honour pong'],
    allSequences: ['All Sequences', 'keempat set berupa chow',
      'All Sequences', 'all four sets are chows'],
    allTriplets: ['All Triplets', 'keempat set berupa pong',
      'All Triplets', 'all four sets are pongs'],
    mixedTerminals: ['Mixed Terminals', 'hanya 1, 9, dan honor — sudah termasuk All Triplets',
      'Mixed Terminals', 'only 1s, 9s and honours — All Triplets already included'],
    sevenPairs: ['Seven Pairs', 'tujuh pasang kembar',
      'Seven Pairs', 'seven identical pairs'],
    smallDragons: ['Small Three Dragons', '2 pong naga + pasang naga ketiga',
      'Small Three Dragons', 'two dragon pongs + a pair of the third'],
    bigDragons: ['3 Scholars / Big 3 Dragons', 'tiga pong naga lengkap',
      '3 Scholars / Big 3 Dragons', 'all three dragon pongs'],
    allConcealed: ['All Concealed Triplets', 'semua pong, tidak ada tile dari lawan',
      'All Concealed Triplets', 'all pongs, no tile claimed from anyone'],
    smallWinds: ['Small Four Winds', '3 pong angin + pasang angin keempat',
      'Small Four Winds', 'three wind pongs + a pair of the fourth'],
    bigWinds: ['4 Blessings / Big 4 Winds', 'empat pong angin lengkap',
      '4 Blessings / Big 4 Winds', 'all four wind pongs'],
    allHonours: ['All Honours', 'seluruh tangan honor — sudah termasuk All Triplets',
      'All Honours', 'every tile an honour — All Triplets already included'],
    allTerminals: ['All Terminals', 'seluruh tangan 1 &amp; 9 — sudah termasuk All Triplets',
      'All Terminals', 'every tile a 1 or a 9 — All Triplets already included'],
    nineGates: ['Nine Gates', '1112345678999 satu keluarga',
      'Nine Gates', '1112345678999 in a single suit'],
    thirteenOrphans: ['13 Orphans', '1 &amp; 9 semua keluarga + semua honor',
      '13 Orphans', '1s &amp; 9s of every suit + every honour'],
    fourKongs: ['All Quadruplets / 4 Kongs', 'keempat set berupa kong',
      'All Quadruplets / 4 Kongs', 'all four sets are kongs'],
    semiFlush: ['Mixed / Semi Flush', 'satu keluarga angka + honor',
      'Mixed / Semi Flush', 'one suit plus honours'],
    fullFlush: ['Full Colour / Full Flush', 'satu keluarga angka, tanpa honor',
      'Full Colour / Full Flush', 'one suit only, no honours'],
    none: ['Tanpa pola dasar', 'bentuknya sah, tapi tidak masuk tabel pola',
      'No listed pattern', 'a valid hand, but not in the pattern table'],
    dragonPong: ['Pong naga', 'dihitung per set',
      'Dragon pong', 'counted per set'],
    roundWind: ['Pong angin putaran', '', 'Round wind pong', ''],
    seatWind: ['Pong angin duduk', '', 'Seat wind pong', ''],
    eye28: ['Pair penutup 2 / 8', 'mata penutup angka 2 atau 8',
      'Closing pair of 2s or 8s', 'the eyes are a 2 or an 8'],
    concealed: ['Hand tertutup', 'tidak ada tile dari pemain lain',
      'Concealed hand', 'no tile taken from another player'],
    zimo: ['Zimo', 'menang dari ambilan sendiri',
      'Zimo', 'won on a self-drawn tile'],
    plainHand: ['Tanpa bunga, naga &amp; angin', 'polos total',
      'No flowers, dragons or winds', 'completely plain'],
    joker: ['Joker dipakai', '1 poin per joker',
      'Jokers used', '1 point per joker'],
    noJoker: ['Tanpa joker', '', 'No joker', ''],
    flowerSeat: ['Bunga / season sesuai kursi', '1 faan per tile yang nomornya sama dengan nomor kursimu',
      'Flower / season matching your seat', '1 faan for each tile whose number matches your seat number'],
    flowerMatch: ['Bunga hitam sesuai kursi', '', 'Black flower matching your seat', ''],
    seasonOther: ['Bunga merah tidak sesuai kursi', '', 'Red flower not matching your seat', ''],
    seasonMatch: ['Bunga merah sesuai kursi', '', 'Red flower matching your seat', ''],
    lastTile: ['Last tile / last discard', '', 'Last tile / last discard', ''],
    robKong: ['Mencuri kong', '', 'Robbing the kong', ''],
    buntut: ['Menang dari buntut', 'tile pengganti kong atau bunga',
      'Win on a replacement tile', 'drawn after a kong or a flower'],
    flowerSetBlack: ['Set bunga hitam', '4 bunga hitam lengkap — menggantikan poin per-bunga',
      'Full black flower set', 'all four black flowers — replaces the per-flower points'],
    flowerSetRed: ['Set bunga merah', '4 bunga merah lengkap — menggantikan poin per-bunga',
      'Full red flower set', 'all four red flowers — replaces the per-flower points'],
  };

  // ==========================================================
  // 2. TILE — PEMBANTU
  // ==========================================================
  const SUITS = ['wan', 'tung', 'sok'];
  const WINDS = ['e', 's', 'w', 'n'];
  const DRAGONS = ['c', 'f', 'b'];
  const WIND_CN = { e: '東', s: '南', w: '西', n: '北' };
  const WIND_ID = { e: 'Timur', s: 'Selatan', w: 'Barat', n: 'Utara' };
  const WIND_EN = { e: 'East', s: 'South', w: 'West', n: 'North' };
  const SEAT_NO = { e: 1, s: 2, w: 3, n: 4 };   // penomoran kursi (Modul 04)

  const isSuit = (t) => SUITS.indexOf(t.split(':')[0]) >= 0;
  const suitOf = (t) => t.split(':')[0];
  const numOf = (t) => parseInt(t.split(':')[1], 10);
  const isWind = (t) => t.indexOf('wind:') === 0;
  const isDragon = (t) => t.indexOf('dragon:') === 0;
  const isHonor = (t) => isWind(t) || isDragon(t);
  const isTerminal = (t) => isSuit(t) && (numOf(t) === 1 || numOf(t) === 9);

  const chow = (s, n, open) => ({ k: 'chow', t: [s + ':' + n, s + ':' + (n + 1), s + ':' + (n + 2)], open: !!open });
  const pong = (x, open) => ({ k: 'pong', t: [x, x, x], open: !!open });
  const kong = (x, open) => ({ k: 'kong', t: [x, x, x, x], open: !!open });
  const pair = (x) => ({ k: 'pair', t: [x, x], open: false });

  function allTiles(hand) {
    const out = [];
    hand.sets.forEach((s) => s.t.forEach((t) => out.push(t)));
    return out;
  }

  // Tangan tidak boleh memakai lebih dari 4 tile yang sama.
  function tileCountOk(hand) {
    const c = {};
    let ok = true;
    allTiles(hand).forEach((t) => { c[t] = (c[t] || 0) + 1; if (c[t] > 4) ok = false; });
    return ok;
  }

  // ==========================================================
  // 3. PENILAIAN
  // ==========================================================

  // Pola apa saja yang cocok dengan bentuk tangan ini.
  function shapeKeys(hand) {
    if (hand.kind === 'orphans') return ['thirteenOrphans'];
    if (hand.kind === 'gates') return ['nineGates'];
    if (hand.kind === 'pairs') return ['sevenPairs'];

    const sets = hand.sets;
    const tiles = allTiles(hand);
    const melds = sets.filter((s) => s.k !== 'pair');
    const eye = sets.filter((s) => s.k === 'pair')[0];
    const pongs = melds.filter((s) => s.k === 'pong' || s.k === 'kong');
    const kongs = melds.filter((s) => s.k === 'kong');
    const chows = melds.filter((s) => s.k === 'chow');
    const keys = [];

    if (kongs.length === 4) keys.push('fourKongs');
    if (pongs.length === 4) {
      keys.push('allTriplets');
      if (melds.every((s) => !s.open)) keys.push('allConcealed');
    }
    if (chows.length === 4) keys.push('allSequences');
    if (chows.length > 0 && pongs.length > 0 && !pongs.some((s) => isHonor(s.t[0]))) keys.push('chicken');

    const dp = pongs.filter((s) => isDragon(s.t[0])).length;
    if (dp === 3) keys.push('bigDragons');
    else if (dp === 2 && eye && isDragon(eye.t[0])) keys.push('smallDragons');

    const wp = pongs.filter((s) => isWind(s.t[0])).length;
    if (wp === 4) keys.push('bigWinds');
    else if (wp === 3 && eye && isWind(eye.t[0])) keys.push('smallWinds');

    if (tiles.every(isHonor)) keys.push('allHonours');
    else if (tiles.every(isTerminal)) keys.push('allTerminals');
    else if (tiles.every((t) => isTerminal(t) || isHonor(t)) && pongs.length === 4) keys.push('mixedTerminals');

    return keys;
  }

  // Warna tangan: satu keluarga saja (+honor) atau murni satu keluarga.
  function flushKey(hand) {
    const tiles = allTiles(hand);
    const suits = {};
    tiles.filter(isSuit).forEach((t) => { suits[suitOf(t)] = 1; });
    if (Object.keys(suits).length !== 1) return null;
    return tiles.some(isHonor) ? 'semiFlush' : 'fullFlush';
  }

  // Poin tambahan dari pong naga / angin putaran / angin duduk.
  function honorPongLines(hand, values) {
    const lines = [];
    const pongs = hand.sets.filter((s) => s.k === 'pong' || s.k === 'kong');
    const nDragon = pongs.filter((s) => isDragon(s.t[0])).length;
    if (nDragon > 0) {
      lines.push({ key: 'dragonPong', n: nDragon, value: values.dragonPong * nDragon });
    }
    const windPongs = pongs.filter((s) => isWind(s.t[0])).map((s) => s.t[0].split(':')[1]);
    if (windPongs.indexOf(hand.ctx.round) >= 0) lines.push({ key: 'roundWind', value: values.roundWind });
    if (windPongs.indexOf(hand.ctx.seat) >= 0) lines.push({ key: 'seatWind', value: values.seatWind });
    return lines;
  }

  // Urutan "kekhususan" pola, dari paling umum ke paling khusus.
  // Dipakai sebagai penentu kalau dua pola bernilai SAMA — misalnya di J2,
  // Mixed Terminals dan All Triplets sama-sama 3 poin; yang ditampilkan harus
  // Mixed Terminals, karena itu penjelasan yang benar untuk tangannya.
  const SPEC_ORDER = ['chicken', 'allSequences', 'allTriplets', 'allConcealed',
    'semiFlush', 'fullFlush', 'sevenPairs', 'mixedTerminals', 'allTerminals',
    'allHonours', 'smallDragons', 'bigDragons', 'smallWinds', 'bigWinds',
    'nineGates', 'thirteenOrphans', 'fourKongs'];

  function bestShape(keys, valueOf) {
    let best = null, bestV = -1, bestSpec = -1;
    keys.forEach((k) => {
      const v = valueOf(k);
      const sp = SPEC_ORDER.indexOf(k);
      if (v > bestV || (v === bestV && sp > bestSpec)) { bestV = v; best = k; bestSpec = sp; }
    });
    return best ? { key: best, value: bestV } : { key: 'none', value: 0 };
  }

  // ---------- FAAN (TSMC) ----------
  function scoreFaan(hand) {
    const lines = [];
    const keys = shapeKeys(hand);
    const shape = bestShape(keys, (k) => FAAN.shape[k]);
    lines.push({ key: shape.key, value: shape.value });

    const fl = hand.kind === 'orphans' || hand.kind === 'gates' ? null : flushKey(hand);
    // All Honours tidak punya keluarga angka, jadi flushKey sudah null di sana.
    if (fl) lines.push({ key: fl, value: FAAN.flush[fl] });

    honorPongLines(hand, FAAN.add).forEach((l) => lines.push(l));
    if (hand.ctx.zimo) lines.push({ key: 'zimo', value: FAAN.add.zimo });

    // Bunga & season: 1 faan per tile yang nomornya sama dengan nomor kursi.
    // Warnanya tidak dibedakan di TSMC — yang dilihat cuma nomornya.
    const seatNo = SEAT_NO[hand.ctx.seat];
    const cocok = (hand.ctx.flowers || []).filter((f) => parseInt(f.split(':')[1], 10) === seatNo).length;
    if (cocok) lines.push({ key: 'flowerSeat', n: cocok, value: FAAN.add.flowerSeat * cocok });

    let total = lines.reduce((a, l) => a + l.value, 0);
    let capped = false;
    if (total > FAAN.cap) { total = FAAN.cap; capped = true; }
    return { total: total, lines: lines, capped: capped, rules: FAAN };
  }

  // ---------- POIN (J2) ----------
  function scoreJ2(hand) {
    const ctx = hand.ctx;
    const jokers = ctx.jokers || 0;
    const col = jokers > 0 ? 0 : 1;          // kolom nilai: pakai joker / tanpa joker
    const lines = [];

    const keys = shapeKeys(hand);
    const fl = hand.kind === 'orphans' || hand.kind === 'gates' ? null : flushKey(hand);
    if (fl) keys.push(fl);                    // di J2, semi/full flush ikut jadi "pola tangan"
    const shape = bestShape(keys, (k) => (J2.shape[k] ? J2.shape[k][col] : 0));
    const dual = !!(J2.shape[shape.key] && J2.shape[shape.key][0] !== J2.shape[shape.key][1]);
    lines.push({ key: shape.key, value: shape.value, dual: dual });

    // Tangan besar (10 poin ke atas): nilainya FINAL. Tidak ada satu pun
    // poin tambahan yang ditumpuk — zimo, joker, tertutup, pair penutup,
    // bunga, semuanya tidak berlaku. Instant point dari kong tetap dibayar
    // terpisah saat kongnya terjadi, jadi tidak ikut dihitung di sini.
    if (J2.shape[shape.key] && J2.shape[shape.key][0] >= J2.bigFrom) {
      return { total: shape.value, lines: lines, capped: false, final: true, rules: J2 };
    }

    honorPongLines(hand, J2.add).forEach((l) => lines.push(l));

    const eye = hand.sets.filter((s) => s.k === 'pair')[0];
    if (eye && isSuit(eye.t[0]) && (numOf(eye.t[0]) === 2 || numOf(eye.t[0]) === 8)) {
      lines.push({ key: 'eye28', value: J2.add.eye28 });
    }
    if (ctx.concealed) lines.push({ key: 'concealed', value: J2.add.concealed });
    if (ctx.zimo) lines.push({ key: 'zimo', value: J2.add.zimo });

    const tiles = allTiles(hand);
    const flowers = ctx.flowers || [];
    if (!flowers.length && !tiles.some(isHonor)) lines.push({ key: 'plainHand', value: J2.add.plainHand });

    if (jokers > 0) lines.push({ key: 'joker', n: jokers, value: J2.add.joker * jokers });
    else if (!dual) lines.push({ key: 'noJoker', value: J2.add.noJoker });
    // Tangan bernilai ganda: angka "tanpa joker" sudah jadi nilai tangannya,
    // jadi bonus +2 tidak ditambahkan lagi (lihat catatan Modul 04).

    const seatNo = SEAT_NO[ctx.seat];
    let fm = 0, so = 0, sm = 0;
    flowers.forEach((f) => {
      const parts = f.split(':');
      const n = parseInt(parts[1], 10);
      if (parts[0] === 'flower') { if (n === seatNo) fm++; }
      else if (parts[0] === 'season') { if (n === seatNo) sm++; else so++; }
    });
    // Set lengkap 4 bunga sewarna dihitung SEBAGAI GANTI poin per-bunga
    // warna itu — bukan ditumpuk. Warna yang tidak lengkap tetap dihitung
    // satu per satu seperti biasa.
    const nBlack = flowers.filter((f) => f.indexOf('flower:') === 0).length;
    const nRed = flowers.filter((f) => f.indexOf('season:') === 0).length;
    if (nBlack === 4) lines.push({ key: 'flowerSetBlack', value: J2.add.flowerSetBlack });
    else if (fm) lines.push({ key: 'flowerMatch', n: fm, value: J2.add.flowerMatch * fm });
    if (nRed === 4) {
      lines.push({ key: 'flowerSetRed', value: J2.add.flowerSetRed });
    } else {
      if (so) lines.push({ key: 'seasonOther', n: so, value: J2.add.seasonOther * so });
      if (sm) lines.push({ key: 'seasonMatch', n: sm, value: J2.add.seasonMatch * sm });
    }

    if (ctx.lastTile) lines.push({ key: 'lastTile', value: J2.add.lastTile });
    if (ctx.robKong) lines.push({ key: 'robKong', value: J2.add.robKong });
    if (ctx.buntut) lines.push({ key: 'buntut', value: J2.add.buntut });

    const total = lines.reduce((a, l) => a + l.value, 0);
    return { total: total, lines: lines, capped: false, rules: J2 };
  }

  function score(mode, hand) {
    return mode === 'j2' ? scoreJ2(hand) : scoreFaan(hand);
  }

  // ==========================================================
  // 4. PEMBUAT TANGAN
  // ==========================================================
  const rnd = (n) => Math.floor(Math.random() * n);
  const pick = (a) => a[rnd(a.length)];
  function pickN(a, n) {
    const c = a.slice();
    const out = [];
    while (out.length < n && c.length) out.push(c.splice(rnd(c.length), 1)[0]);
    return out;
  }
  const numTile = (s, n) => s + ':' + n;
  // Delapan tile bunga yang ada di satu set: 4 bunga hitam + 4 bunga merah (season).
  const FLOWER_DECK = ['flower:1', 'flower:2', 'flower:3', 'flower:4',
    'season:1', 'season:2', 'season:3', 'season:4'];
  const anyNum = () => numTile(pick(SUITS), 1 + rnd(9));
  const midNum = () => numTile(pick(SUITS), 2 + rnd(7));   // 2–8, bukan terminal

  // Tiap arsitipe mengembalikan { sets, kind, want }.
  // "want" = pola yang seharusnya terdeteksi — dipakai untuk verifikasi.
  const ARCH = {

    chicken: function () {
      const s1 = pick(SUITS), s2 = pick(SUITS.filter((x) => x !== s1));
      return {
        kind: 'std', want: 'chicken',
        sets: [chow(s1, 1 + rnd(7)), chow(s2, 1 + rnd(7)),
          pong(numTile(s2, 1 + rnd(9)), true), pong(numTile(s1, 1 + rnd(9))),
          pair(pick([pick(WINDS).replace(/^/, 'wind:'), numTile(pick(SUITS), 1 + rnd(9))]))],
      };
    },

    allSequences: function () {
      const s1 = pick(SUITS), s2 = pick(SUITS.filter((x) => x !== s1));
      return {
        kind: 'std', want: 'allSequences',
        sets: [chow(s1, 1 + rnd(7)), chow(s1, 1 + rnd(7)), chow(s2, 1 + rnd(7)),
          chow(s2, 1 + rnd(7), true), pair(numTile(pick([s1, s2]), 1 + rnd(9)))],
      };
    },

    allTriplets: function () {
      const s1 = pick(SUITS), s2 = pick(SUITS.filter((x) => x !== s1));
      return {
        kind: 'std', want: 'allTriplets',
        sets: [pong(midNum().replace(/^\w+/, s1)), pong(numTile(s1, 2 + rnd(7)), true),
          pong(numTile(s2, 2 + rnd(7))), pong(numTile(s2, 2 + rnd(7))),
          pair(numTile(pick([s1, s2]), 1 + rnd(9)))],
      };
    },

    // Pola dasar + pong naga / angin — melatih poin tambahan.
    honorMix: function (ctx) {
      const s1 = pick(SUITS), s2 = pick(SUITS.filter((x) => x !== s1));
      const honor = pick([
        'dragon:' + pick(DRAGONS),
        'wind:' + ctx.seat,
        'wind:' + ctx.round,
        'wind:' + pick(WINDS),
      ]);
      return {
        kind: 'std', want: null,
        sets: [chow(s1, 1 + rnd(7)), chow(s2, 1 + rnd(7)),
          pong(honor, Math.random() < 0.5), pong(numTile(s2, 1 + rnd(9))),
          pair(numTile(s1, 1 + rnd(9)))],
      };
    },

    triplesWithHonor: function (ctx) {
      const s1 = pick(SUITS), s2 = pick(SUITS.filter((x) => x !== s1));
      const honor = pick(['dragon:' + pick(DRAGONS), 'wind:' + ctx.seat, 'wind:' + ctx.round]);
      return {
        kind: 'std', want: 'allTriplets',
        sets: [pong(numTile(s1, 2 + rnd(7))), pong(numTile(s2, 2 + rnd(7)), true),
          pong(honor), pong(numTile(s2, 2 + rnd(7))),
          pair(numTile(s1, 1 + rnd(9)))],
      };
    },

    semiFlush: function (ctx) {
      const s = pick(SUITS);
      const honor = pick(['dragon:' + pick(DRAGONS), 'wind:' + pick(WINDS)]);
      const shape = rnd(2);
      const sets = shape === 0
        ? [chow(s, 1 + rnd(7)), chow(s, 1 + rnd(7)), chow(s, 1 + rnd(7), true), pong(numTile(s, 1 + rnd(9)))]
        : [chow(s, 1 + rnd(7)), chow(s, 1 + rnd(7)), pong(numTile(s, 2 + rnd(7)), true), pong(honor)];
      sets.push(pair(Math.random() < 0.5 ? honor : numTile(s, 1 + rnd(9))));
      return { kind: 'std', want: 'semiFlush', sets: sets, needFlush: 'semiFlush' };
    },

    fullFlush: function () {
      const s = pick(SUITS);
      return {
        kind: 'std', want: 'fullFlush', needFlush: 'fullFlush',
        sets: [chow(s, 1 + rnd(7)), chow(s, 1 + rnd(7)), chow(s, 1 + rnd(7), true),
          pong(numTile(s, 2 + rnd(7))), pair(numTile(s, 1 + rnd(9)))],
      };
    },

    mixedTerminals: function () {
      const t = pickN([numTile('wan', 1), numTile('wan', 9), numTile('tung', 1), numTile('tung', 9),
        numTile('sok', 1), numTile('sok', 9)], 3);
      const h = pickN(['wind:e', 'wind:s', 'wind:w', 'wind:n', 'dragon:c', 'dragon:f', 'dragon:b'], 2);
      return {
        kind: 'std', want: 'mixedTerminals',
        sets: [pong(t[0]), pong(t[1], true), pong(t[2]), pong(h[0]), pair(h[1])],
      };
    },

    sevenPairs: function () {
      const pool = [];
      SUITS.forEach((s) => { for (let i = 1; i <= 9; i++) pool.push(numTile(s, i)); });
      const chosen = pickN(pool, 7);
      // pastikan tidak semuanya satu keluarga (biar bukan flush tak sengaja)
      if (chosen.every((t) => suitOf(t) === suitOf(chosen[0]))) chosen[0] = numTile(pick(SUITS.filter((x) => x !== suitOf(chosen[1]))), 1 + rnd(9));
      return { kind: 'pairs', want: 'sevenPairs', sets: chosen.map((t) => pair(t)) };
    },

    smallDragons: function () {
      const d = pickN(DRAGONS, 3);
      const s = pick(SUITS);
      return {
        kind: 'std', want: 'smallDragons',
        sets: [pong('dragon:' + d[0]), pong('dragon:' + d[1], true),
          chow(s, 1 + rnd(7)), chow(pick(SUITS.filter((x) => x !== s)), 1 + rnd(7)),
          pair('dragon:' + d[2])],
      };
    },

    bigDragons: function () {
      const s = pick(SUITS);
      return {
        kind: 'std', want: 'bigDragons',
        sets: [pong('dragon:c'), pong('dragon:f', true), pong('dragon:b'),
          chow(s, 1 + rnd(7)), pair(numTile(pick(SUITS.filter((x) => x !== s)), 1 + rnd(9)))],
      };
    },

    smallWinds: function () {
      const w = pickN(WINDS, 4);
      const s = pick(SUITS);
      return {
        kind: 'std', want: 'smallWinds',
        sets: [pong('wind:' + w[0]), pong('wind:' + w[1], true), pong('wind:' + w[2]),
          pong(numTile(s, 2 + rnd(7))), pair('wind:' + w[3])],
      };
    },

    bigWinds: function () {
      return {
        kind: 'std', want: 'bigWinds',
        sets: [pong('wind:e'), pong('wind:s', true), pong('wind:w'), pong('wind:n'),
          pair(numTile(pick(SUITS), 1 + rnd(9)))],
      };
    },

    allHonours: function () {
      const h = pickN(['wind:e', 'wind:s', 'wind:w', 'wind:n', 'dragon:c', 'dragon:f', 'dragon:b'], 5);
      return {
        kind: 'std', want: 'allHonours',
        sets: [pong(h[0]), pong(h[1], true), pong(h[2]), pong(h[3]), pair(h[4])],
      };
    },

    allTerminals: function () {
      const t = pickN([numTile('wan', 1), numTile('wan', 9), numTile('tung', 1), numTile('tung', 9),
        numTile('sok', 1), numTile('sok', 9)], 5);
      return {
        kind: 'std', want: 'allTerminals',
        sets: [pong(t[0]), pong(t[1], true), pong(t[2]), pong(t[3]), pair(t[4])],
      };
    },

    allConcealed: function () {
      const s1 = pick(SUITS), s2 = pick(SUITS.filter((x) => x !== s1));
      return {
        kind: 'std', want: 'allConcealed', concealed: true,
        sets: [pong(numTile(s1, 2 + rnd(7))), pong(numTile(s1, 2 + rnd(7))),
          pong(numTile(s2, 2 + rnd(7))), pong(numTile(s2, 2 + rnd(7))),
          pair(numTile(pick(SUITS), 1 + rnd(9)))],
      };
    },

    nineGates: function () {
      const s = pick(SUITS);
      const t = [1, 1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 9, 9].map((n) => numTile(s, n));
      t.push(numTile(s, 1 + rnd(9)));
      t.sort((a, b) => numOf(a) - numOf(b));
      return { kind: 'gates', want: 'nineGates', concealed: true, sets: [{ k: 'special', t: t, open: false }] };
    },

    thirteenOrphans: function () {
      const base = ['wan:1', 'wan:9', 'sok:1', 'sok:9', 'tung:1', 'tung:9',
        'wind:e', 'wind:s', 'wind:w', 'wind:n', 'dragon:c', 'dragon:f', 'dragon:b'];
      const t = base.slice();
      t.push(pick(base));
      return { kind: 'orphans', want: 'thirteenOrphans', concealed: true, sets: [{ k: 'special', t: t, open: false }] };
    },

    fourKongs: function () {
      const s1 = pick(SUITS), s2 = pick(SUITS.filter((x) => x !== s1));
      return {
        kind: 'std', want: 'fourKongs',
        sets: [kong(numTile(s1, 1 + rnd(9))), kong(numTile(s1, 1 + rnd(9)), true),
          kong(numTile(s2, 1 + rnd(9))), kong('dragon:' + pick(DRAGONS)),
          pair(numTile(pick(SUITS), 1 + rnd(9)))],
      };
    },
  };

  // Arsitipe yang boleh muncul di tiap level (1–5).
  // Level 4 & 5 sengaja masih menyimpan beberapa tangan "zona sehari-hari":
  // di J2 tangan besar poinnya final (satu baris, tinggal dikenali), jadi
  // tanpa selipan ini level tertinggi justru jadi paling gampang dihitung.
  const LEVELS = [
    ['chicken', 'allSequences', 'allTriplets', 'semiFlush'],
    ['chicken', 'allSequences', 'allTriplets', 'semiFlush', 'honorMix', 'triplesWithHonor'],
    ['allTriplets', 'semiFlush', 'honorMix', 'triplesWithHonor', 'fullFlush', 'mixedTerminals', 'sevenPairs', 'smallDragons'],
    ['semiFlush', 'fullFlush', 'mixedTerminals', 'sevenPairs', 'smallDragons', 'bigDragons', 'smallWinds', 'allConcealed', 'allHonours', 'allTerminals'],
    ['semiFlush', 'triplesWithHonor', 'fullFlush', 'sevenPairs', 'bigDragons', 'smallWinds', 'allConcealed', 'allHonours', 'allTerminals', 'bigWinds', 'nineGates', 'thirteenOrphans', 'fourKongs'],
  ];
  const MAX_LEVEL = LEVELS.length;

  // Konteks meja (angin, joker, bunga, cara menang) sesuai level & aturan.
  function makeCtx(mode, level) {
    const ctx = {
      seat: pick(WINDS), round: pick(WINDS),
      zimo: false, concealed: false, jokers: 0, flowers: [],
      lastTile: false, robKong: false, buntut: false,
    };
    ctx.seatNo = SEAT_NO[ctx.seat];

    // Tiap level menambah satu hal yang harus diperhitungkan, dan makin
    // sering muncul: level 1 bentuk tangan saja, lalu cara menang, lalu
    // bunga, lalu joker, sampai level puncak yang menumpuk semuanya.
    // Level 1 sengaja bersih supaya pemain baru bisa fokus ke pola.
    if (level >= 2) ctx.zimo = Math.random() < 0.2 + 0.09 * level;

    // Bunga berlaku di KEDUA aturan: TSMC memberi 1 faan untuk tiap bunga
    // atau season yang nomornya sama dengan nomor kursi, J2 punya tabelnya
    // sendiri. Satu set mahjong hanya punya SATU keping tiap bunga, jadi
    // tidak boleh kembar. Maksimalnya 5 keping — set lengkap 4 bunga sewarna
    // sudah bisa keluar, tapi tetap jauh dari 7 keping yang di meja berarti
    // instant win (kondisi itu tidak dimodelkan sebagai soal di kuis).
    if (level >= 3 && Math.random() < 0.3 + 0.12 * (level - 2)) {
      ctx.flowers = pickN(FLOWER_DECK, 1 + rnd(level >= 5 ? 5 : 3));
    }

    // Sisanya khusus J2: joker dan bonus cara menang tidak dipakai TSMC.
    if (mode !== 'j2') return ctx;

    if (level >= 3 && Math.random() < 0.3 + 0.1 * (level - 3)) {
      ctx.jokers = 1 + rnd(level >= 5 ? 3 : 2);
    }
    if (level >= 4) {
      const r = Math.random();
      const p = level >= 5 ? 0.2 : 0.12;   // di level puncak lebih sering muncul
      if (r < p) ctx.lastTile = true;
      else if (r < p * 2) ctx.robKong = true;
      else if (r < p * 3) ctx.buntut = true;
    }
    return ctx;
  }

  // Sebarkan joker ke posisi acak (tampilan saja — nilai tangan tetap dihitung
  // dari tile aslinya, persis seperti di meja).
  // ATURAN PENTING: maksimal SATU joker per set. Kalau dua tile dalam satu set
  // jadi joker, tile aslinya tidak bisa lagi ditebak pemain — misalnya pasangan
  // penutup yang kedua tilenya joker: mustahil tahu itu pair 2, pair 8, atau
  // bukan keduanya. Soal seperti itu tidak punya jawaban pasti.
  function placeJokers(hand) {
    const n = hand.ctx.jokers || 0;
    hand.sets.forEach((s) => { s.j = []; });
    if (!n) return;
    const usable = [];
    hand.sets.forEach((s, si) => {
      const idx = [];
      s.t.forEach((t, ti) => { if (!isHonor(t)) idx.push(ti); });
      if (idx.length) usable.push([si, idx]);
    });
    pickN(usable, Math.min(n, usable.length)).forEach((u) => {
      hand.sets[u[0]].j.push(pick(u[1]));
    });
    hand.ctx.jokers = hand.sets.reduce((a, s) => a + s.j.length, 0);
  }

  // Satu soal siap pakai.
  function buildHand(mode, level, forceArch) {
    const lv = Math.max(1, Math.min(MAX_LEVEL, level || 1));
    for (let tries = 0; tries < 60; tries++) {
      const name = forceArch || pick(LEVELS[lv - 1]);
      const ctx = makeCtx(mode, lv);
      const a = ARCH[name](ctx);
      const hand = { kind: a.kind, sets: a.sets, ctx: ctx, arch: name };

      if (a.concealed) hand.sets.forEach((s) => { s.open = false; });
      hand.ctx.concealed = hand.sets.every((s) => !s.open);
      if (hand.kind !== 'std' && hand.kind !== 'pairs') hand.ctx.jokers = 0;
      if (!tileCountOk(hand)) continue;

      // Tangan tertutup penuh yang tidak diniatkan sebagai All Concealed
      // dibuka satu set, supaya polanya tidak berubah tanpa sengaja.
      if (hand.kind === 'std' && !a.concealed && hand.ctx.concealed) {
        hand.sets[1].open = true;
        hand.ctx.concealed = false;
      }

      placeJokers(hand);
      const res = score(mode, hand);

      // Verifikasi: pola yang terdeteksi harus sesuai niat arsitipe.
      if (a.want) {
        const detected = res.lines[0].key;
        const okFlush = !a.needFlush || res.lines.some((l) => l.key === a.needFlush);
        if (mode === 'j2') { if (detected !== a.want) continue; }
        else if (detected !== a.want && !(a.needFlush && detected === 'chicken')) continue;
        if (!okFlush) continue;
      }
      // FAAN: pastikan tangan tanpa flush memang bukan flush tak sengaja.
      if (!a.needFlush && flushKey(hand) && ['chicken', 'allSequences', 'allTriplets'].indexOf(a.want) >= 0) continue;

      hand.answer = res.total;
      hand.result = res;
      return hand;
    }
    // Cadangan yang pasti valid. Kalau baris ini sampai terpakai, artinya ada
    // arsitipe yang tidak pernah lolos verifikasi — dihitung supaya ketahuan
    // saat pengujian, bukan diam-diam menurunkan mutu soal.
    API.fallbacks++;
    return buildHand(mode, 1, 'allSequences');
  }

  // ==========================================================
  // 5. TEKS
  // ==========================================================
  function lineText(l, lang) {
    const L = LABEL[l.key] || [l.key, '', l.key, ''];
    const en = lang === 'en';
    let name = en ? L[2] : L[0];
    if (l.n && l.n > 1) name += ' ×' + l.n;
    let sub = en ? L[3] : L[1];
    if (l.dual) sub = en ? 'the &ldquo;no joker&rdquo; column' : 'nilai kolom &ldquo;tanpa joker&rdquo;';
    return { name: name, sub: sub, value: l.value };
  }

  const API = {
    fallbacks: 0,
    RULES: { faan: FAAN, j2: J2 },
    LABEL: LABEL, WIND_CN: WIND_CN, WIND_ID: WIND_ID, WIND_EN: WIND_EN, SEAT_NO: SEAT_NO,
    LEVELS: LEVELS, MAX_LEVEL: MAX_LEVEL, ARCH: ARCH,
    buildHand: buildHand, score: score, scoreFaan: scoreFaan, scoreJ2: scoreJ2,
    shapeKeys: shapeKeys, flushKey: flushKey, lineText: lineText,
    helpers: { chow: chow, pong: pong, kong: kong, pair: pair, allTiles: allTiles },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.KUIS = API;

})(typeof window !== 'undefined' ? window : globalThis);
