// ============================================================
// TSMC — Menu mobile untuk halaman modul (dan halaman lain yang
// memakai nav.top). Beranda punya versinya sendiri di index.html.
// Tidak melakukan apa-apa kalau tombol burger tidak ada di halaman.
// ============================================================
'use strict';
(function () {
  function init() {
    const burger = document.getElementById('nav-burger');
    const links = document.getElementById('nav-links');
    if (!burger || !links) return;

    function setOpen(open) {
      links.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
      burger.textContent = open ? '✕' : '☰';
    }

    burger.addEventListener('click', (e) => {
      e.stopPropagation();
      setOpen(!links.classList.contains('open'));
    });

    // Tutup setelah menekan salah satu tautan (untuk tautan sesama halaman),
    // saat menekan di luar menu, dan saat menekan Esc.
    links.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('click', (e) => {
      if (links.classList.contains('open') && !links.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    // Kembali ke tampilan desktop → pastikan menu tidak tertinggal terbuka.
    window.addEventListener('resize', () => { if (window.innerWidth > 820) setOpen(false); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
