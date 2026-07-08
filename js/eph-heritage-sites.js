'use strict';

// ==========================================
// VARIABEL GLOBAL UNTUK AUTOPLAY
// ==========================================
let isPlaying = false;
let playInterval = null;
let bgAudio = null;
let jedaAutoScroll = null;

function hentikanPlay() {
  isPlaying = false; 
  
  if (playInterval !== null) {
    clearInterval(playInterval);
    playInterval = null;
  }

  if (jedaAutoScroll !== null) {
    clearTimeout(jedaAutoScroll);
    jedaAutoScroll = null;
  }

  if (bgAudio) {
    bgAudio.pause();
  }

  let detailsContainer = document.getElementById('details');
  if (detailsContainer) {
    detailsContainer.classList.remove('sedang-auto-scroll');
  }

  let playBtn = document.getElementById('play-btn');
  if (playBtn) {
    playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  }
}

// -------------------------------------------------------------------------
// FUNGSI BARU: MENGHITUNG PADDING AREA PETA SECARA DINAMIS (DESKTOP VS MOBILE)
// -------------------------------------------------------------------------
function dapatkanOpsiBounds(denganDurasi = false) {
  let apakahMobile = window.innerWidth <= 800;
  
  if (apakahMobile) {
    // Jika mobile, beri padding bawah sebesar setengah layar ponsel + 40px spasi aman
    let opsi = {
      paddingTopLeft: [40, 40],
      paddingBottomRight: [40, (window.innerHeight / 2) + 40]
    };
    if (denganDurasi) opsi.duration = 1.5;
    return opsi;
  } else {
    // Jika desktop, gunakan padding standar rata di semua sisi
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
  
  let jedaScroll = null;
  let indexAktif = '-1';

  hentikanPlay();

  if (!bgAudio) {
    bgAudio = document.createElement('audio');
    bgAudio.id = 'bg-musik';
    bgAudio.src = 'lagu-sejarah.mp3'; 
    bgAudio.loop = true; 
    document.body.appendChild(bgAudio);
  }

  function jalankanAnimasiSatuLangkah() {
    let curIdx = parseInt(indexAktif === '-1' ? '-1' : indexAktif);
    let nextIdx = curIdx + 1;

    if (nextIdx >= TimelineRecords.length) {
      hentikanPlay();
      indexAktif = '-1'; 
      Map.closePopup(); 
      
      if (markerBounds.length > 0) {
        // Menggunakan opsi padding dinamis khusus mobile ketika animasi selesai
        Map.flyToBounds(markerBounds, dapatkanOpsiBounds(true)); 
      }
      
      detailsContainer.classList.add('sedang-auto-scroll');
      jedaAutoScroll = setTimeout(() => {
        detailsContainer.classList.remove('sedang-auto-scroll');
      }, 1200); 
      detailsContainer.scrollTo({ top: 0, behavior: 'smooth' });
      return; 
    }    
    
    let targetRecord = TimelineRecords[nextIdx];
    if (targetRecord && targetRecord.marker) {
      targetRecord.marker.openPopup();
      fokusKeMarker(targetRecord.marker.getLatLng(), false); // False = Jalankan paksa zoom otomatis 14

      indexAktif = nextIdx.toString();

      detailsContainer.classList.add('sedang-auto-scroll');
      jedaAutoScroll = setTimeout(() => {
        detailsContainer.classList.remove('sedang-auto-scroll');
      }, 2200); 
      
      let targetItem = document.getElementById(`item-${nextIdx}`);
      if (targetItem) {
        let scrollPos = targetItem.offsetTop - detailsContainer.offsetTop; 
        if (scrollPos < 0) scrollPos = 0;
        detailsContainer.scrollTo({ top: scrollPos, behavior: 'smooth' });
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
        isPlaying = true;
        playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
        if (bgAudio) {
          bgAudio.play().catch(function(error) {
            console.log("Browser menahan pemutaran otomatis lagu: ", error); 
          });
        }
        jalankanAnimasiSatuLangkah(); 
        clearInterval(playInterval); 
        playInterval = setInterval(jalankanAnimasiSatuLangkah, 3000); 
      }
    });
  }

  // ==========================================
  // RAKIT KONTEN HTML PANEL
  // ==========================================
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

  // ==========================================
  // RENDER MARKER & INTERAKSI KLIK MARKER DIRECT
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
      
      marker.bindPopup(popupContent, { autoPan: false, minWidth: 160, maxWidth: 160 });
      
  // Event saat Marker di Klik Direct
 marker.on('click', function() {
        hentikanPlay(); 

        // SEKARANG: Parameter ke-2 = true (tetap zoom), Parameter ke-3 = 0.3 (durasi super cepat)
        fokusKeMarker(marker.getLatLng(), true, 0.3); 
        
        let indexStr = index.toString();
        indexAktif = indexStr; 

        detailsContainer.classList.add('sedang-auto-scroll');
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
  // FITUR: KLIK H2 PANEL
  // ==========================================
  detailsContainer.addEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('timeline-date')) {
      let parentDiv = e.target.closest('.timeline-item');
      let indexStr = parentDiv.getAttribute('data-index');
      hentikanPlay(); 

      if (indexStr === '-1') {
        indexAktif = '-1';
        Map.closePopup();
        if (markerBounds.length > 0) {
          // Menggunakan opsi padding dinamis khusus mobile ketika teks pengantar diklik manual
          Map.flyToBounds(markerBounds, dapatkanOpsiBounds(true));
        }
        detailsContainer.classList.add('sedang-auto-scroll');
        jedaAutoScroll = setTimeout(() => {
          detailsContainer.classList.remove('sedang-auto-scroll');
        }, 1200); 
        detailsContainer.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        let index = parseInt(indexStr);
        let targetRecord = TimelineRecords[index];
        if (targetRecord && targetRecord.marker) {
          targetRecord.marker.openPopup();
          fokusKeMarker(targetRecord.marker.getLatLng(), false); // False = Tetap zoom in otomatis ke 14
          indexAktif = indexStr; 

          detailsContainer.classList.add('sedang-auto-scroll');
          jedaAutoScroll = setTimeout(() => {
            detailsContainer.classList.remove('sedang-auto-scroll');
          }, 1200); 

          let scrollPos = parentDiv.offsetTop - detailsContainer.offsetTop; 
          if (scrollPos < 0) scrollPos = 0;
          detailsContainer.scrollTo({ top: scrollPos, behavior: 'smooth' });
        }
      }
    }
  });

  // ==========================================
  // SCROLLTELLING PANEL
  // ==========================================
  detailsContainer.addEventListener('scroll', () => {
    if (detailsContainer.classList.contains('sedang-auto-scroll')) return;
    hentikanPlay(); 
    clearTimeout(jedaScroll);
    
    jedaScroll = setTimeout(() => {
      let batasAktif = detailsContainer.scrollTop + (detailsContainer.clientHeight * 0.15); 
      let items = document.querySelectorAll('.timeline-item');
      let kandidatTerpilih = null;

      for (let i = 0; i < items.length; i++) {
        let item = items[i];
        let posisiAsliItem = item.offsetTop - detailsContainer.offsetTop;
        if (posisiAsliItem <= batasAktif) {
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
        if (indexAktif === '-1') {
          Map.closePopup();
          if (markerBounds.length > 0) {
            // Menggunakan opsi padding dinamis khusus mobile ketika discroll manual ke atas
            Map.flyToBounds(markerBounds, dapatkanOpsiBounds(true));
          }
        } else {
          let indexAngka = parseInt(indexAktif);
          let targetRecord = TimelineRecords[indexAngka];
          if (targetRecord && targetRecord.marker && !targetRecord.marker.isPopupOpen()) {
            targetRecord.marker.openPopup();
            fokusKeMarker(targetRecord.marker.getLatLng(), false); // False = Tetap zoom in otomatis ke 14
          }
        }
      }
    }, 300);
  }, { passive: true });

  document.getElementById('loading').style.display = 'none';
  detailsContainer.style.display = 'block';

  if (markerBounds.length > 0) {
    // Menggunakan opsi padding dinamis khusus mobile saat pertama kali aplikasi dibuka bersih
    Map.fitBounds(markerBounds, dapatkanOpsiBounds(false));
  }
}

// =========================================================================
// MODIFIKASI FUNGSI FOKUS: MENDUKUNG AKSI TETAP ZOOM & PERGESERAN LAYAR MOBILE
// =========================================================================
function fokusKeMarker(latlng, keepCurrentZoom = false, durasi = 1.2) {
  // Jika dari klik marker langsung (true), gunakan zoom saat ini. Jika false, paksa ke 14.
  let targetZoom = keepCurrentZoom ? Map.getZoom() : 14;
  
  let koordinatAkhir = latlng;

  // JIKA MOBILE: Geser kamera ke bawah 40px agar posisi marker naik ke atas
  if (window.innerWidth <= 800) {
    let targetPoint = Map.project(latlng, targetZoom);
    targetPoint.y += 40; 
    koordinatAkhir = Map.unproject(targetPoint, targetZoom);
  }

  let currentCenter = Map.getCenter();
  let currentZoom = Map.getZoom();

  // Logika pencegah shaky / getar jika posisi sudah pas
  if (currentZoom === targetZoom && currentCenter.distanceTo(koordinatAkhir) < 5) {
    return; 
  }

  // Selalu gunakan flyTo agar ada animasi meluncur, durasinya diambil dari parameter
  Map.flyTo(koordinatAkhir, targetZoom, {
    animate: true,
    duration: durasi
  });
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
