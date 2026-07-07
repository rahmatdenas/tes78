// ============================================================
// PENINGKATAN TAMPILAN PONSEL (Mobile Enhancements) - REVISI 50% & HEADER
// ============================================================

(function() {
  var MOBILE_QUERY   = '(max-width: 800px)';
  var DRAG_THRESHOLD = 5;  

  var panel, header, toggleIcon;
  var currentY       = 0;
  var dragging       = false;
  var moved          = false;
  var startClientY   = 0;
  var startTranslate = 0;

  function isMobile() {
    return window.matchMedia(MOBILE_QUERY).matches;
  }

  // KUNCI 1: Hitung titik mentok atas (Terbuka 50%) dan bawah (Sisa Header)
  function getExpandedY() {
    return panel.offsetHeight / 2; // Terbuka tepat setengah layar
  }
  
function getCollapsedY() {
  // Ganti penghitungan dinamis dengan angka statis 56 (sesuai tinggi header Anda)
  // Anda bisa menambah/mengurangi angka 56 jika masih kurang pas (misal: 60 atau 65)
  return panel.offsetHeight - 56; 
}

  function clampY(y) {
    // Kunci gerakan agar tidak bisa ditarik lebih tinggi dari 50% atau lebih rendah dari header
    return Math.min(Math.max(y, getExpandedY()), getCollapsedY());
  }

  function applyTransform(y) {
    currentY = y;
    panel.style.transform = 'translateY(' + y + 'px)';
    
    // Animasikan Ikon Panah (Putar 180 derajat saat tertutup)
    if (toggleIcon) {
      if (y > getExpandedY() + 20) {
        toggleIcon.style.transform = 'translateY(-50%) rotate(180deg)'; // Panah Atas
      } else {
        toggleIcon.style.transform = 'translateY(-50%) rotate(0deg)';   // Panah Bawah
      }
    }
  }

  window.setMobilePanelExpanded = function(expand, animate) {
    if (!panel || !isMobile()) return;
    
    if (animate === false) panel.classList.add('eph-dragging');
    else panel.classList.remove('eph-dragging');
    
    // Terapkan posisi: jika expand = 50%, jika tidak = sebatas header
    applyTransform(expand ? getExpandedY() : getCollapsedY());
    
    if (animate === false) {
      void panel.offsetWidth; 
      panel.classList.remove('eph-dragging');
    }
  };

  function onTouchStart(e) {
    if (!isMobile()) return;
    var touch = e.touches ? e.touches[0] : e;
    
    dragging = true;
    moved = false;
    startClientY = touch.clientY;
    startTranslate = currentY;
    
    panel.classList.add('eph-dragging');
  }

  function onTouchMove(e) {
    if (!dragging) return;
    var touch = e.touches ? e.touches[0] : e;
    var delta = touch.clientY - startClientY;

    if (Math.abs(delta) > DRAG_THRESHOLD) {
      moved = true;
      if (e.cancelable) e.preventDefault(); 
    }
    applyTransform(clampY(startTranslate + delta));
  }

  function onTouchEnd() {
    if (!dragging) return;
    dragging = false;

    if (!moved) {
      // Jika header cuma diklik/di-tap, otomatis buka/tutup
      var isExpanded = currentY <= getExpandedY() + 10;
      window.setMobilePanelExpanded(!isExpanded);
    } else {
      // Jika di-drag, snap ke posisi terdekat
      var dragDistance = currentY - startTranslate;
      var SWIPE_THRESHOLD = 40; 

      if (dragDistance > SWIPE_THRESHOLD) {
        window.setMobilePanelExpanded(false); // Ditarik turun -> Tutup ke header
      } else if (dragDistance < -SWIPE_THRESHOLD) {
        window.setMobilePanelExpanded(true);  // Ditarik naik -> Buka 50%
      } else {
        // Tarikan tidak kuat, kembali ke posisi awal
        var wasExpanded = startTranslate <= getExpandedY() + 10;
        window.setMobilePanelExpanded(wasExpanded);
      }
    }
    panel.classList.remove('eph-dragging');
  }

  function handleViewportChange() {
    if (!panel) return;
    if (isMobile()) {
      // Saat mobile dimuat, panel otomatis terbuka 50%
      window.setMobilePanelExpanded(true, false);
    } else {
      // Kembalikan ke mode desktop
      panel.style.transform = '';
      panel.classList.remove('eph-dragging');
      currentY = 0;
    }
  }

  window.addEventListener('load', function() {
    panel = document.getElementById('panel');
    header = document.getElementById('branding');
    if (!panel || !header) return;
toggleIcon = document.getElementById('panel-toggle');

    handleViewportChange();

    // Lekatkan event drag HANYA PADA HEADER
    header.addEventListener('touchstart', onTouchStart, { passive: false });
    header.addEventListener('touchmove', onTouchMove, { passive: false });
    header.addEventListener('touchend', onTouchEnd);
    header.addEventListener('touchcancel', onTouchEnd);
  });

  window.addEventListener('resize', handleViewportChange);
})();
