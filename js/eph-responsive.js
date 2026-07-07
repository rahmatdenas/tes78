// ============================================================
// PENINGKATAN TAMPILAN PONSEL (Mobile Enhancements) - REVISI FINAL
// ============================================================

(function() {
  var MOBILE_QUERY   = '(max-width: 800px)';
  var DRAG_THRESHOLD = 5;  

  var panel, header, toggleIcon, navMenu;
  var currentY       = 0;
  var dragging       = false;
  var moved          = false;
  var startClientY   = 0;
  var startTranslate = 0;

  function isMobile() {
    return window.matchMedia(MOBILE_QUERY).matches;
  }

  // 1. Hitung Terbuka (50%)
function getExpandedY() {
  return window.innerHeight / 2; // Terbuka tepat setengah layar bersih
}

function getCollapsedY() {
  // Ambil tinggi asli header. Jika karena satu hal nilainya 0, pasang fallback 56 sesuai ukuran CSS Anda
  var headerHeight = (header && header.offsetHeight > 0) ? header.offsetHeight : 56;
  
  // RUMUS SAKTI: Tinggi total layar aktif dikurangi tinggi header. 
  // Ini menjamin top panel akan berhenti pas di bawah layar (menyisakan headernya saja).
  return window.innerHeight - headerHeight; 
}

  function clampY(y) {
    return Math.min(Math.max(y, getExpandedY()), getCollapsedY());
  }

  function applyTransform(y) {
    currentY = y;
    panel.style.transform = 'translateY(' + y + 'px)';
    
    // Animasikan Ikon Panah
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
      // Tap pada header
      var isExpanded = currentY <= getExpandedY() + 10;
      window.setMobilePanelExpanded(!isExpanded);
    } else {
      // Drag/Tarik header
      var dragDistance = currentY - startTranslate;
      var SWIPE_THRESHOLD = 40; 

      if (dragDistance > SWIPE_THRESHOLD) {
        window.setMobilePanelExpanded(false); 
      } else if (dragDistance < -SWIPE_THRESHOLD) {
        window.setMobilePanelExpanded(true);  
      } else {
        var wasExpanded = startTranslate <= getExpandedY() + 10;
        window.setMobilePanelExpanded(wasExpanded);
      }
    }
    panel.classList.remove('eph-dragging');
  }

  function handleViewportChange() {
    if (!panel) return;
    if (isMobile()) {
      window.setMobilePanelExpanded(true, false);
    } else {
      panel.style.transform = '';
      panel.classList.remove('eph-dragging');
      currentY = 0;
    }
  }

  window.addEventListener('load', function() {
    panel = document.getElementById('panel');
    header = document.getElementById('branding');
    navMenu = document.querySelector('nav');
    if (!panel || !header) return;

    // KUNCI: SUNTIKKAN IKON TOGGLE (JIKA BELUM ADA)
    if (!document.getElementById('panel-toggle')) {
      toggleIcon = document.createElement('div');
      toggleIcon.id = 'panel-toggle';
      toggleIcon.innerHTML = '&#9660;'; // Chevron Bawah
      header.appendChild(toggleIcon);
    } else {
      toggleIcon = document.getElementById('panel-toggle');
    }

    handleViewportChange();

    header.addEventListener('touchstart', onTouchStart, { passive: false });
    header.addEventListener('touchmove', onTouchMove, { passive: false });
    header.addEventListener('touchend', onTouchEnd);
    header.addEventListener('touchcancel', onTouchEnd);
  });

  window.addEventListener('resize', handleViewportChange);
})();
