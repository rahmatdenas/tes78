'use strict';

// ==========================================
// VARIABEL GLOBAL UNTUK AUTOPLAY & RUTE
// ==========================================
let isPlaying = false;
let playInterval = null;
let bgAudio = null;
let garisRuteAktif = null;    // Menyimpan objek garis rute dinamis
let koordinatTerakhir = null;  // Menyimpan jejak koordinat sebelum berpindah

function hentikanPlay() {
  isPlaying = false; 
  if (playInterval !== null) {
    clearInterval(playInterval);
    playInterval = null;
  }
  if (bgAudio) {
    bgAudio.pause();
  }

  let playBtn = document.getElementById('play-btn');
  if (playBtn) {
    playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  }
}

function dapatkanOpsiBounds(denganDurasi = false) {
  let apakahMobile = window.innerWidth <= 800;
  if (apakahMobile) {
    let opsi = {
      paddingTopLeft: [40, 40],
      paddingBottomRight: [40, (window.innerHeight / 2) + 40]
    };
    if (denganDurasi) opsi.duration = 1.5;
    return opsi;
  } else {
    let opsi = { padding: [40, 40] };
    if (denganDurasi) opsi.duration = 1.5;
    return opsi;
  }
}

function loadPrimaryData() {
  queryWdqsThenProcess(
    SPARQL_RESIDENCE_QUERY,
    function(result) {
      let record = {
        locationName: result.locationLabel.value,
        rawTime: result.pointInTime.value,
        formattedDate: formatWikidataDate(result.pointInTime.value, result.ptPrecision.value)
      };

      if (result.coord) {
        let wktBits = result.coord.value.split(/\(|\)| /); 
        record.lon = parseFloat(wktBits[1]);
        record.lat = parseFloat(wktBits[2]);
      }

      if (result.image) {
        let filename = decodeURIComponent(result.image.value.replace(/https?:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//, ''));
        record.imageUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=500`;
      }

      TimelineRecords.push(record);
    },
    function() {
      TimelineRecords.sort((a, b) => a.rawTime.localeCompare(b.rawTime));
      renderMapAndPanel();
    }
  );
}

function renderMapAndPanel() {
  let detailsContainer = document.getElementById('details');
  let markerBounds = [];
  
  let allHtml = `
    <div class="timeline-item" id="item--1" data-index="-1">
      <h2 class="timeline-date" style="cursor: pointer;" title="Tampilkan Semua Peta">Pengantar</h2>
      <div class="location-desc">
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Nanti bisa diisi dengan biografi dan foto di sini secara manual.</p>
      </div>
    </div>
  `; 
  
  let indexAktif = '-1';

  hentikanPlay();

  if (!bgAudio) {
    bgAudio = document.createElement('audio');
    bgAudio.id = 'bg-musik';
    bgAudio.src = 'lagu-sejarah.mp3'; 
    bgAudio.loop = true; 
    document.body.appendChild(bgAudio);
  }

  // --------------------------------========================================
  // INJEKSI CSS ANIMASI GARIS (MARCHING ANTS)
  // --------------------------------========================================
  if (!document.getElementById('style-rute-mengalir')) {
    let style = document.createElement('style');
    style.id = 'style-rute-mengalir';
    style.innerHTML = `
      @keyframes berjalan {
        to { stroke-dashoffset: -20; }
      }
      .rute-animasi {
        stroke-dasharray: 10, 10;
        animation: berjalan 1.2s linear infinite;
      }
    `;
    document.head.appendChild(style);
  }

  // PENGAMAN UX: Hentikan autoplay jika pengguna melakukan scroll/touch manual
  detailsContainer.addEventListener('touchstart', () => {
    if (isPlaying) hentikanPlay();
  }, { passive: true });

  detailsContainer.addEventListener('wheel', () => {
    if (isPlaying) hentikanPlay();
  }, { passive: true });

  function gulirkanPanelLewatKode(posisiTarget) {
    if (Math.abs(detailsContainer.scrollTop - posisiTarget) < 4) {
      detailsContainer.classList.remove('sedang-auto-scroll');
      return;
    }
    detailsContainer.classList.add('sedang-auto-scroll');
    detailsContainer.scrollTo({ top: posisiTarget, behavior: 'smooth' });
  }

  function jalankanAnimasiSatuLangkah() {
    let curIdx = parseInt(indexAktif === '-1' ? '-1' : indexAktif);
    let nextIdx = curIdx + 1;

    if (nextIdx >= TimelineRecords.length) {
      hentikanPlay();
      indexAktif = '-1'; 
      Map.closePopup(); 
      
      // Bersihkan rute saat kembali ke pengantar awal
      if (garisRuteAktif) { Map.removeLayer(garisRuteAktif); garisRuteAktif = null; }
      koordinatTerakhir = null;

      if (markerBounds.length > 0) {
        Map.flyToBounds(markerBounds, dapatkanOpsiBounds(true)); 
      }
      gulirkanPanelLewatKode(0);
      return; 
    }    
    
    let targetRecord = TimelineRecords[nextIdx];
    if (targetRecord && targetRecord.marker) {
      targetRecord.marker.openPopup();
      fokusKeMarker(targetRecord.marker.getLatLng(), false); 

      indexAktif = nextIdx.toString();
      
      let targetItem = document.getElementById(`item-${nextIdx}`);
      if (targetItem) {
        let scrollPos = targetItem.offsetTop;
        if (scrollPos < 0) scrollPos = 0;
        gulirkanPanelLewatKode(scrollPos);
      }
    }
  }

  let playBtn = document.getElementById('play-btn');
  if (playBtn) {
    let newPlayBtn = playBtn.cloneNode(true);
    playBtn.parentNode.replaceChild(newPlayBtn, playBtn);
    playBtn = newPlayBtn;
    
    playBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      
      if (isPlaying) {
        hentikanPlay(); 
      } else {
        let curIdx = parseInt(indexAktif === '-1' ? '-1' : indexAktif);
        let apakahDiUjung = curIdx >= TimelineRecords.length - 1;

        isPlaying = true;
        playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
        
        if (bgAudio) {
          bgAudio.play().catch(function(error) {
            console.log("Browser menahan pemutaran otomatis lagu: ", error); 
          });
        }

        if (apakahDiUjung) {
          indexAktif = '-1'; 
          Map.closePopup(); 
          
          if (garisRuteAktif) { Map.removeLayer(garisRuteAktif); garisRuteAktif = null; }
          koordinatTerakhir = null;

          if (markerBounds.length > 0) {
            Map.flyToBounds(markerBounds, dapatkanOpsiBounds(true)); 
          }
          gulirkanPanelLewatKode(0);
        } else {
          jalankanAnimasiSatuLangkah(); 
        }
        
        clearInterval(playInterval); 
        playInterval = setInterval(jalankanAnimasiSatuLangkah, 3000); 
      }
    });
  }

  TimelineRecords.forEach((record, index) => {
    allHtml += `
      <div class="timeline-item" id="item-${index}" data-index="${index}">
        <h2 class="timeline-date" style="cursor: pointer;" title="Tampilkan di Peta">${record.formattedDate}</h2>
        ${record.imageUrl ? `<figure class="timeline-figure"><img src="${record.imageUrl}" alt="${record.locationName}"></figure>` : ''}
        <div class="location-desc">
          <p class="location-name"><strong>${record.locationName}</strong></p>
          ${record.lat && record.lon ? `<p class="coord-text">Koordinat: ${record.lat.toFixed(4)}, ${record.lon.toFixed(4)}</p>` : ''}
        </div>
      </div>
    `;
  });
  detailsContainer.innerHTML = allHtml;

  TimelineRecords.forEach((record, index) => {
    if (record.lat && record.lon) {
      let marker = L.marker([record.lat, record.lon]).addTo(Map);
      record.marker = marker; 
      markerBounds.push([record.lat, record.lon]);
      
      let popupContent = `
        <div class="custom-popup">
          ${record.imageUrl ? `<img src="${record.imageUrl}"><br>` : ''}
          <strong class="popup-title">${record.locationName}</strong>
          <span class="popup-date">${record.formattedDate}</span>
        </div>
      `;
      marker.bindPopup(popupContent, { autoPan: false, minWidth: 160, maxWidth: 160 });
      
      marker.on('click', function() {
        hentikanPlay(); 
        fokusKeMarker(marker.getLatLng(), true, 0.3, true); 
        
        let indexStr = index.toString();
        indexAktif = indexStr; 

        detailsContainer.classList.add('sedang-auto-scroll');

        let targetItem = document.getElementById(`item-${index}`);
        if (targetItem) {
          let scrollPos = targetItem.offsetTop; 
          if (scrollPos < 0) scrollPos = 0;
          detailsContainer.scrollTo({ top: scrollPos, behavior: 'smooth' });
        }
      });
    }
  });

  detailsContainer.addEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('timeline-date')) {
      let parentDiv = e.target.closest('.timeline-item');
      let indexStr = parentDiv.getAttribute('data-index');
      hentikanPlay(); 

      if (indexStr === '-1') {
        indexAktif = '-1';
        Map.closePopup();
        
        if (garisRuteAktif) { Map.removeLayer(garisRuteAktif); garisRuteAktif = null; }
        koordinatTerakhir = null;

        if (markerBounds.length > 0) {
          Map.flyToBounds(markerBounds, dapatkanOpsiBounds(true));
        }
        gulirkanPanelLewatKode(0);
      } else {
        let index = parseInt(indexStr);
        let targetRecord = TimelineRecords[index];
        if (targetRecord && targetRecord.marker) {
          targetRecord.marker.openPopup();
          fokusKeMarker(targetRecord.marker.getLatLng(), false); 
          indexAktif = indexStr; 

          let scrollPos = parentDiv.offsetTop;
          if (scrollPos < 0) scrollPos = 0;
          gulirkanPanelLewatKode(scrollPos);
        }
      }
    }
  });

  detailsContainer.addEventListener('scrollend', () => {
    detailsContainer.classList.remove('sedang-auto-scroll');
  });

  let intersectingItems = new Set();
  let observerOptions = {
    root: detailsContainer,
    rootMargin: '0px 0px -95% 0px', 
    threshold: 0 
  };

  let observer = new IntersectionObserver((entries) => {
    if (detailsContainer.classList.contains('sedang-auto-scroll')) return;

    entries.forEach(entry => {
      if (entry.isIntersecting) {
        intersectingItems.add(entry.target);
      } else {
        intersectingItems.delete(entry.target);
      }
    });

    let kandidatTerpilih = null;
    let lokasiGarisTarget = detailsContainer.scrollTop; 
    let maxOffsetTop = -1;

    intersectingItems.forEach(item => {
      let posisiTopItem = item.offsetTop;
      if (posisiTopItem <= lokasiGarisTarget + 20 && posisiTopItem > maxOffsetTop) {
        maxOffsetTop = posisiTopItem;
        kandidatTerpilih = item.getAttribute('data-index');
      }
    });

    if (!kandidatTerpilih && intersectingItems.size > 0) {
      let minIdx = Infinity;
      intersectingItems.forEach(item => {
        let idx = parseInt(item.getAttribute('data-index'));
        if (idx < minIdx) {
          minIdx = idx;
          kandidatTerpilih = idx.toString();
        }
      });
    }

    if (kandidatTerpilih !== null && kandidatTerpilih !== indexAktif) {
      indexAktif = kandidatTerpilih; 
      hentikanPlay(); 

      if (indexAktif === '-1') {
        Map.closePopup();
        
        if (garisRuteAktif) { Map.removeLayer(garisRuteAktif); garisRuteAktif = null; }
        koordinatTerakhir = null;

        if (markerBounds.length > 0) {
          Map.flyToBounds(markerBounds, dapatkanOpsiBounds(true));
        }
      } else {
        let indexAngka = parseInt(indexAktif);
        let targetRecord = TimelineRecords[indexAngka];
        if (targetRecord && targetRecord.marker && !targetRecord.marker.isPopupOpen()) {
          targetRecord.marker.openPopup();
          fokusKeMarker(targetRecord.marker.getLatLng(), false); 
        }
      }
    }
  }, observerOptions);

  document.querySelectorAll('.timeline-item').forEach(item => {
    observer.observe(item);
  });

  document.getElementById('loading').style.display = 'none';
  detailsContainer.style.display = 'block';

  if (markerBounds.length > 0) {
    Map.fitBounds(markerBounds, dapatkanOpsiBounds(false));
  }
}

// =========================================================================
// FUNGSI FOKUS: SEKARANG OTOMATIS MENGGAMBAR GARIS MENGALIR PAS TRANSISI
// =========================================================================
function fokusKeMarker(latlng, keepCurrentZoom = false, durasi = 1.2, gunakanPanTo = false) {
  let targetZoom = keepCurrentZoom ? Map.getZoom() : 12;
  let koordinatAkhir = latlng;

  if (window.innerWidth <= 800) {
    let targetPoint = Map.project(latlng, targetZoom);
    targetPoint.y += 40; 
    koordinatAkhir = Map.unproject(targetPoint, targetZoom);
  }

  // --------------------------------========================================
  // LOGIKA UTAMA GARIS ROUTING DINAMIS & ANIMATIF
  // --------------------------------========================================
  // 1. Hapus rute garis lama saat terjadi perpindahan baru
  if (garisRuteAktif) {
    Map.removeLayer(garisRuteAktif);
    garisRuteAktif = null;
  }

  // 2. Gambar garis dari titik lokasi lama ke titik lokasi baru jika datanya ada
  if (koordinatTerakhir && (koordinatTerakhir.lat !== latlng.lat || koordinatTerakhir.lng !== latlng.lng)) {
    garisRuteAktif = L.polyline([koordinatTerakhir, latlng], {
      color: '#822',
      weight: 4,
      className: 'rute-animasi', // Mengaktifkan efek gerak mengalir CSS
      opacity: 0.85,
      interactive: false
    }).addTo(Map);
  }

  // 3. Simpan posisi sekarang untuk menjadi acuan start di perpindahan berikutnya
  koordinatTerakhir = latlng;

  // Eksekusi pergeseran kamera peta
  if (gunakanPanTo) {
    Map.panTo(koordinatAkhir, { animate: true });
  } else {
    let currentCenter = Map.getCenter();
    let currentZoom = Map.getZoom();

    if (currentZoom === targetZoom && currentCenter.distanceTo(koordinatAkhir) < 5) {
      return; 
    }

    Map.flyTo(koordinatAkhir, targetZoom, {
      animate: true,
      duration: durasi
    });
  }
}

function formatWikidataDate(dateString, precision) {
  if (!dateString) return null;  
  let cleanStr = dateString.replace(/^[+-]/, '');   
  let yearStr  = cleanStr.substring(0, 4);
  let monthStr = cleanStr.substring(5, 7);
  let dayStr   = cleanStr.substring(8, 10);
  let yearNum  = parseInt(yearStr);
  const bulanIndo = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  
  let prec = parseInt(precision) || 9; 
  if (prec === 11) return `${parseInt(dayStr)} ${bulanIndo[parseInt(monthStr)]} ${yearStr}`;
  else if (prec === 10) return `${bulanIndo[parseInt(monthStr)]} ${yearStr}`;
  else if (prec === 9) return yearStr;
  else if (prec === 8) return `${yearStr}-an`;
  else if (prec === 7) return `Abad ke-${Math.ceil(yearNum / 100)}`;
  else return yearStr;
}
