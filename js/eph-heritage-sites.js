'use strict';

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
  let allHtml = ''; 
  let jedaScroll = null;
  let jedaAutoScroll = null;
  
  // Memori State
  let indexAktif = '-1';
  let kandidatIndexAktif = null; 

  // ==========================================
  // [BARU] VARIABEL & LOGIKA AUTOPLAY
  // ==========================================
  let isPlaying = false;
  let playInterval = null;
  let playBtn = document.getElementById('play-btn');

  function hentikanPlay() {
    if (!isPlaying) return;
    isPlaying = false;
    clearInterval(playInterval);
    if (playBtn) playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  }

  function jalankanAnimasiSatuLangkah() {
    // Lanjut ke marker berikutnya
    let curIdx = parseInt(indexAktif === '-1' ? '-1' : indexAktif);
    let nextIdx = curIdx + 1;

    // Jika sudah mencapai akhir daftar, hentikan animasi
    if (nextIdx >= TimelineRecords.length) {
      hentikanPlay();
      return;
    }

    let targetRecord = TimelineRecords[nextIdx];
    if (targetRecord && targetRecord.marker) {
      targetRecord.marker.openPopup();
      fokusKeMarker(targetRecord.marker.getLatLng());

      indexAktif = nextIdx.toString();

      detailsContainer.classList.add('sedang-auto-scroll');
      clearTimeout(jedaAutoScroll);
      jedaAutoScroll = setTimeout(() => {
        detailsContainer.classList.remove('sedang-auto-scroll');
      }, 1200); 

      let targetItem = document.getElementById(`item-${nextIdx}`);
      if (targetItem) {
        let scrollPos = targetItem.offsetTop - detailsContainer.offsetTop; 
        if (scrollPos < 0) scrollPos = 0;
        detailsContainer.scrollTo({ top: scrollPos, behavior: 'smooth' });
      }
    }
  }

  // Aktifkan event pada tombol Play
  if (playBtn) {
    // Hapus event lama jika fungsi ini dipanggil ulang
    let newPlayBtn = playBtn.cloneNode(true);
    playBtn.parentNode.replaceChild(newPlayBtn, playBtn);
    playBtn = newPlayBtn;

    playBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (isPlaying) {
        hentikanPlay(); // Pengguna menekan Pause
      } else {
        isPlaying = true;
        playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
        jalankanAnimasiSatuLangkah(); // Jalan 1x langsung tanpa jeda awal
        playInterval = setInterval(jalankanAnimasiSatuLangkah, 3000); // Jalan tiap 3 detik
      }
    });
  }

  // ==========================================
  // 1. RAKIT KONTEN HTML PANEL
  // ==========================================
  TimelineRecords.forEach((record, index) => {
    allHtml += `
      <div class="timeline-item" id="item-${index}" data-index="${index}">
        <h2 class="timeline-date" style="cursor: pointer;" title="Tampilkan di Peta">${record.formattedDate}</h2>
        
        ${record.imageUrl ? `
        <figure class="timeline-figure">
          <img src="${record.imageUrl}" alt="${record.locationName}">
        </figure>
        ` : ''}
        
        <div class="location-desc">
          <p class="location-name"><strong>${record.locationName}</strong></p>
          ${record.lat && record.lon ? `
          <p class="coord-text">Koordinat: ${record.lat.toFixed(4)}, ${record.lon.toFixed(4)}</p>
          ` : ''}
        </div>
      </div>
    `;
  });

  detailsContainer.innerHTML = allHtml;

  // ==========================================
  // 2. RENDER MARKER & INTERAKSI KLIK MARKER
  // ==========================================
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
      
      marker.bindPopup(popupContent, { 
        autoPan: false,
        minWidth: 160, 
        maxWidth: 160  
      });
      
      // Event saat Marker di Klik
      marker.on('click', function() {
        hentikanPlay(); // INTERUPSI: Berhenti otomatis saat di-klik manual

        fokusKeMarker(marker.getLatLng());
        let indexStr = index.toString();
        indexAktif = indexStr; 

        detailsContainer.classList.add('sedang-auto-scroll');
        clearTimeout(jedaAutoScroll);
        
        jedaAutoScroll = setTimeout(() => {
          detailsContainer.classList.remove('sedang-auto-scroll');
        }, 1200); 

        let targetItem = document.getElementById(`item-${index}`);
        setTimeout(function() {
          let scrollPos = targetItem.offsetTop - detailsContainer.offsetTop; 
          if (scrollPos < 0) scrollPos = 0;
          detailsContainer.scrollTo({ top: scrollPos, behavior: 'smooth' });
        }, 300);
      });
    }
  });

  // ==========================================
  // 3. FITUR: KLIK H2 (BUKA MARKER + SCROLL PANEL)
  // ==========================================
  detailsContainer.addEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('timeline-date')) {
      let parentDiv = e.target.closest('.timeline-item');
      let indexStr = parentDiv.getAttribute('data-index');
      let index = parseInt(indexStr);
      let targetRecord = TimelineRecords[index];

      if (targetRecord && targetRecord.marker) {
        hentikanPlay(); // INTERUPSI: Berhenti otomatis saat judul di-klik

        targetRecord.marker.openPopup();
        fokusKeMarker(targetRecord.marker.getLatLng());

        indexAktif = indexStr; 

        detailsContainer.classList.add('sedang-auto-scroll');
        clearTimeout(jedaAutoScroll);
        
        jedaAutoScroll = setTimeout(() => {
          detailsContainer.classList.remove('sedang-auto-scroll');
        }, 1200); 

        let scrollPos = parentDiv.offsetTop - detailsContainer.offsetTop; 
        if (scrollPos < 0) scrollPos = 0;
        detailsContainer.scrollTo({ top: scrollPos, behavior: 'smooth' });
      }
    }
  });

  // ==========================================
  // 4 & 5. SCROLLTELLING (Radar Posisi Presisi)
  // ==========================================
  detailsContainer.addEventListener('scroll', () => {
    
    // Jika sistem yang auto-scroll, biarkan berjalan.
    if (detailsContainer.classList.contains('sedang-auto-scroll')) return;
    
    // INTERUPSI: Jika ini murni karena sentuhan/scroll pengguna, matikan play.
    hentikanPlay(); 
    
    clearTimeout(jedaScroll);
    
    jedaScroll = setTimeout(() => {
      let batasAktif = detailsContainer.scrollTop + (detailsContainer.clientHeight * 0.15); 
      
      let items = document.querySelectorAll('.timeline-item');
      let kandidatTerpilih = null;

      for (let i = 0; i < items.length; i++) {
        let item = items[i];
        if (item.offsetTop <= batasAktif) {
          kandidatTerpilih = item.getAttribute('data-index');
        } else {
          break; 
        }
      }

      if (kandidatTerpilih === null && items.length > 0) {
        kandidatTerpilih = items[0].getAttribute('data-index');
      }

      if (kandidatTerpilih !== null && kandidatTerpilih !== indexAktif) {
        indexAktif = kandidatTerpilih; 
        let indexAngka = parseInt(indexAktif);
        let targetRecord = TimelineRecords[indexAngka];
        
        if (targetRecord && targetRecord.marker && !targetRecord.marker.isPopupOpen()) {
          targetRecord.marker.openPopup();
          fokusKeMarker(targetRecord.marker.getLatLng());
        }
      }
    }, 300); 

  }, { passive: true });

  // ==========================================
  // 6. FINALIZE UI
  // ==========================================
  document.getElementById('loading').style.display = 'none';
  detailsContainer.style.display = 'block';

  if (markerBounds.length > 0) {
    Map.fitBounds(markerBounds, { padding: [40, 40] });
  }
}

// Fungsi baru untuk fokus ke marker dengan transisi smooth dan ruang lega (offset)
function fokusKeMarker(latlng) {
  let targetZoom = 14;
  let mapHeight = document.getElementById('map').clientHeight;
  let yOffset = mapHeight * 0.05; 

  let targetPoint = Map.project(latlng, targetZoom);
  targetPoint.y += yOffset;
  let targetLatLng = Map.unproject(targetPoint, targetZoom);

  // --- LOGIKA PENCEGAH SHAKY ---
  let currentCenter = Map.getCenter();
  let currentZoom = Map.getZoom();

  // Cek jarak antara titik tengah peta saat ini dengan target (dalam hitungan meter).
  // Jika zoom sudah pas dan jaraknya kurang dari 5 meter (hanya selisih desimal), batalkan animasi.
  if (currentZoom === targetZoom && currentCenter.distanceTo(targetLatLng) < 5) {
    return; // Berhenti di sini, animasi flyTo tidak dieksekusi
  }
  // -----------------------------

  Map.flyTo(targetLatLng, targetZoom, {
    animate: true,
    duration: 1.2
  });
}

// Fungsi utilitas format waktu
function formatWikidataDate(dateString, precision) {
  if (!dateString) return null;  
  let cleanStr = dateString.replace(/^[+-]/, '');   
  let yearStr  = cleanStr.substring(0, 4);
  let monthStr = cleanStr.substring(5, 7);
  let dayStr   = cleanStr.substring(8, 10);
  let yearNum  = parseInt(yearStr);
  const bulanIndo = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  
  let prec = parseInt(precision) || 9; 
  if (prec === 11) {
    return `${parseInt(dayStr)} ${bulanIndo[parseInt(monthStr)]} ${yearStr}`;
  } 
  else if (prec === 10) {
    return `${bulanIndo[parseInt(monthStr)]} ${yearStr}`;
  } 
  else if (prec === 9) {
    return yearStr;
  } 
  else if (prec === 8) {
    return `${yearStr}-an`;
  } 
  else if (prec === 7) {
    let century = Math.ceil(yearNum / 100);
    return `Abad ke-${century}`;
  } 
  else {
    return yearStr;
  }
}
