// ============================================================
// TSMC — Peralih bahasa Indonesia / Inggris
//
// CARA PAKAI (tidak perlu kamus terpisah):
//   Tulis teks Indonesia seperti biasa, lalu tempelkan versi Inggrisnya
//   pada atribut data-en di elemen yang sama.
//
//     <p data-en="Wins are one thing.">Menang itu satu hal.</p>
//
//   Untuk atribut, pakai awalan data-en- :
//     data-en-alt · data-en-title · data-en-label (jadi aria-label)
//     data-en-content (untuk <meta>) · data-en-placeholder
//
//   Tombol peralihnya muncul di elemen bertanda data-lang-switch.
//
// CATATAN: annotasi cukup di elemen "daun". Kalau induk dan anaknya
// sama-sama diberi data-en, isi anak akan tertimpa saat ganti bahasa.
//
// Teks yang datang dari database (jadwal, berita, galeri, pengumuman)
// sengaja TIDAK diterjemahkan — isinya diketik lewat dashboard admin.
// Strukturnya sudah siap kalau nanti kolom bilingual ditambahkan.
// ============================================================
'use strict';
(function (root) {
  const KEY = 'tsmc.lang';
  const DEFAULT = 'id';
  const ATTRS = { alt: 'alt', title: 'title', label: 'aria-label', content: 'content', placeholder: 'placeholder' };

  const original = new WeakMap();   // simpan teks asli (Indonesia) apa adanya
  const listeners = [];
  let current = DEFAULT;

  function readSaved() {
    try { const v = localStorage.getItem(KEY); return v === 'en' || v === 'id' ? v : DEFAULT; }
    catch (e) { return DEFAULT; }
  }
  function saveLang(l) { try { localStorage.setItem(KEY, l); } catch (e) {} }

  // ---------- penerapan ----------
  function applyText(lang) {
    document.querySelectorAll('[data-en]').forEach((el) => {
      let store = original.get(el);
      if (!store) { store = { html: el.innerHTML }; original.set(el, store); }
      const next = lang === 'en' ? el.getAttribute('data-en') : store.html;
      if (el.innerHTML !== next) el.innerHTML = next;
    });
  }

  function applyAttrs(lang) {
    Object.keys(ATTRS).forEach((suffix) => {
      const dataName = 'data-en-' + suffix;
      const attr = ATTRS[suffix];
      document.querySelectorAll('[' + dataName + ']').forEach((el) => {
        let store = original.get(el);
        if (!store) { store = {}; original.set(el, store); }
        if (store[attr] === undefined) store[attr] = el.getAttribute(attr) || '';
        el.setAttribute(attr, lang === 'en' ? el.getAttribute(dataName) : store[attr]);
      });
    });
  }

  function markButtons() {
    document.querySelectorAll('[data-set-lang]').forEach((b) => {
      const on = b.getAttribute('data-set-lang') === current;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function apply(lang) {
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('data-lang', lang);
    applyText(lang);
    applyAttrs(lang);
    // Kalau ada baris tile yang ikut tertulis ulang, gambar SVG-nya kembali.
    if (window.MJ && window.MJ.render) window.MJ.render();
    markButtons();
    listeners.forEach((fn) => { try { fn(lang); } catch (e) {} });
  }

  function set(lang) {
    const next = lang === 'en' ? 'en' : 'id';
    if (next === current) return;
    current = next;
    saveLang(next);
    apply(next);
  }

  // ---------- tombol peralih ----------
  function buildSwitch() {
    document.querySelectorAll('[data-lang-switch]').forEach((box) => {
      if (box.querySelector('[data-set-lang]')) return;
      box.classList.add('lang-switch');
      box.setAttribute('role', 'group');
      box.setAttribute('aria-label', 'Pilih bahasa / Choose language');
      box.innerHTML =
        '<button type="button" data-set-lang="id" title="Bahasa Indonesia">ID</button>' +
        '<button type="button" data-set-lang="en" title="English">EN</button>';
    });
  }

  function init() {
    current = readSaved();
    buildSwitch();
    document.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('[data-set-lang]');
      if (b) { e.preventDefault(); set(b.getAttribute('data-set-lang')); }
    });
    apply(current);
  }

  const API = {
    get: () => current,
    set: set,
    // dipanggil tiap kali bahasa berganti — dipakai halaman yang isinya
    // digambar oleh JavaScript, misalnya kuis.
    onChange: (fn) => { listeners.push(fn); return fn; },
    // pemilih teks singkat untuk string di dalam JavaScript
    pick: (id, en) => (current === 'en' ? en : id),
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.I18N = API;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
