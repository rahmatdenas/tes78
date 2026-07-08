// ============================================================
// PENINGKATAN TAMPILAN PONSEL (Mobile Enhancements) - REVISI FINAL
// ============================================================

(function() {
  var MOBILE_QUERY   = '(max-width: 800px)';
  var DRAG_THRESHOLD = 5;  

var panel, header;
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
    // 1. Ambil tinggi panel dan header yang paling presisi (termasuk border jika ada)
    var tinggiPanel = panel.getBoundingClientRect().height;
    var tinggiHeader = header.getBoundingClientRect().height || 56; 

    // 2. ANGKA KOREKSI (Ini rahasianya!)
    // Karena di gambarmu separuh header tenggelam (sekitar 20-30px), 
    // kita paksa panelnya "naik" sedikit agar headernya muncul semua.
    // Jika masih tenggelam, NAIKKAN angkanya (misal: 25, 30, atau 40).
    // Jika terlalu tinggi, TURUNKAN angkanya (misal: 10 atau 0).
    var angkaKoreksi = 54; 

    // 3. Kurangi tinggi total panel dengan tinggi header, lalu kurangi lagi dengan angka koreksi
    return tinggiPanel - tinggiHeader - angkaKoreksi; 
  }

  function clampY(y) {
    return Math.min(Math.max(y, getExpandedY()), getCollapsedY());
  }

function applyTransform(y) {
    currentY = y;
    panel.style.transform = 'translateY(' + y + 'px)';
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
    
    // [KUNCI BARU] Jika yang disentuh adalah tombol Play (atau ikon di dalamnya), abaikan fungsi tarik!
    if (e.target.closest('#play-btn')) return;

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
    
    var detailsContainer = document.getElementById('details');

    if (isMobile()) {
      window.setMobilePanelExpanded(true, false);
      
      // Berikan padding gaib sebesar 50% layar + 20px spasi
if (detailsContainer) {
        detailsContainer.style.paddingBottom = (window.innerHeight / 2) + 'px';
      }
    } else {
      panel.style.transform = '';
      panel.classList.remove('eph-dragging');
      currentY = 0;
      
      // Hapus padding saat mode desktop
      if (detailsContainer) {
        detailsContainer.style.paddingBottom = '0px';
      }
    }
  }

 window.addEventListener('load', function() {
    panel = document.getElementById('panel');
    header = document.getElementById('branding');
    if (!panel || !header) return;

    // 1. SUNTIKKAN DRAG HANDLE (GAGANG TIPIS) DI ATAS PANEL
    var dragHandle = document.getElementById('drag-handle');
    if (!dragHandle) {
      dragHandle = document.createElement('div');
      dragHandle.id = 'drag-handle';
      panel.insertBefore(dragHandle, panel.firstChild);
    }

    // 2. SUNTIKKAN TOMBOL PLAY MENGGANTIKAN PANEL TOGGLE (CHEVRON)
    var playBtn = document.getElementById('play-btn');
    if (!playBtn) {
      playBtn = document.createElement('button');
      playBtn.id = 'play-btn';
      playBtn.innerHTML = '▶'; // Ikon Play bawaan
      header.appendChild(playBtn);
    }
    
    // Hapus chevron lama jika kebetulan masih ada di HTML
    var oldToggle = document.getElementById('panel-toggle');
    if (oldToggle) oldToggle.remove();

    handleViewportChange();

    // 3. KUNCI PERUBAHAN: DRAG HANYA BISA DARI HANDLE TIPIS
    dragHandle.addEventListener('touchstart', onTouchStart, { passive: false });
    dragHandle.addEventListener('touchmove', onTouchMove, { passive: false });
    dragHandle.addEventListener('touchend', onTouchEnd);
    dragHandle.addEventListener('touchcancel', onTouchEnd);
   // [TAMBAHAN BARU] Event untuk header agar bisa ditarik juga
    header.addEventListener('touchstart', onTouchStart, { passive: false });
    header.addEventListener('touchmove', onTouchMove, { passive: false });
    header.addEventListener('touchend', onTouchEnd);
    header.addEventListener('touchcancel', onTouchEnd);
  });

  window.addEventListener('resize', handleViewportChange);
})();
