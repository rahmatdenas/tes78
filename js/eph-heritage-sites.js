'use strict';

// ==========================================
// VARIABEL GLOBAL UNTUK AUTOPLAY
// ==========================================
let isPlaying = false;
let playInterval = null;
let bgAudio = null;

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
  // SENJATA UTAMA: FUNGSI SCROLL PROGRAMER (MEMBENTENG SEPENUHNYA DARI KAWAT)
  // --------------------------------========================================
  function gulirkanPanelLewatKode(posisiTarget) {
    // Jalankan toleransi: Jika posisi scroll saat ini sudah sama dengan target, jangan kunci!
    if (Math.abs(detailsContainer.scrollTop - posisiTarget) < 4) {
      detailsContainer.classList.remove('sedang-auto-scroll');
      return;
    }
    // Kunci kawat jebakan secara total
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
        // CEK POSISI: Apakah kita sedang berada di div terakhir?
        let curIdx = parseInt(indexAktif === '-1' ? '-1' : indexAktif);
        let apakahDiUjung = curIdx >= TimelineRecords.length - 1;

        // 1. Nyalakan status Play secara visual dan audio
        isPlaying = true;
        playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
        
        if (bgAudio) {
          bgAudio.play().catch(function(error) {
            console.log("Browser menahan pemutaran otomatis lagu: ", error); 
          });
        }

        // 2. Logika Pencegah Glitch
        if (apakahDiUjung) {
          // JIKA DI TERAKHIR: Kembalikan ke pengantar secara manual, 
          // tanpa memanggil animasi instan yang berisiko mematikan sistem.
          indexAktif = '-1'; 
          Map.closePopup(); 
          if (markerBounds.length > 0) {
            Map.flyToBounds(markerBounds, dapatkanOpsiBounds(true)); 
          }
          gulirkanPanelLewatKode(0);
        } else {
          // JIKA DI TENGAH: Langsung eksekusi 1 langkah animasi secara instan
          jalankanAnimasiSatuLangkah(); 
        }
        
        // 3. Setel mesin waktu untuk langkah selanjutnya secara konsisten
        clearInterval(playInterval); 
        playInterval = setInterval(jalankanAnimasiSatuLangkah, 3000); 
      }
    });
  }

  // Rakit HTML Panel
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

  // Interaksi Klik Marker Direct di Peta
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
        fokusKeMarker(marker.getLatLng(), true, 0.3); 
        
        let indexStr = index.toString();
        indexAktif = indexStr; 

        // Kunci kawat jebakan
        detailsContainer.classList.add('sedang-auto-scroll');

        let targetItem = document.getElementById(`item-${index}`);
        if (targetItem) {
          let scrollPos = targetItem.offsetTop; 
          if (scrollPos < 0) scrollPos = 0;
          
          // LANGSUNG GULIRKAN TANPA SETTIMEOUT 300ms LAGI
          detailsContainer.scrollTo({ top: scrollPos, behavior: 'smooth' });
        }
      });
    }
  });

  // Interaksi Klik Tulisan H2 di Panel Linimasa
  detailsContainer.addEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('timeline-date')) {
      let parentDiv = e.target.closest('.timeline-item');
      let indexStr = parentDiv.getAttribute('data-index');
      hentikanPlay(); 

      if (indexStr === '-1') {
        indexAktif = '-1';
        Map.closePopup();
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

  // --------------------------------========================================
  // DETEKTOR UTAMA: MENYALAKAN KEMBALI KAWAT TEPAT SAAT SMOOTH SCROLL SELESAI
  // --------------------------------========================================
  detailsContainer.addEventListener('scrollend', () => {
    detailsContainer.classList.remove('sedang-auto-scroll');
  });

  // --------------------------------========================================
  // MESIN DETEKTOR MODERN: INTERSECTION OBSERVER (RINGAN & ANTI LAG)
  // --------------------------------========================================
  
  // Konfigurasi zona deteksi (menyisakan area aktif 20% di tengah layar)
  // Sangat cocok untuk elemen div Anda yang pendek (~70px)
let observerOptions = {
  root: detailsContainer,
  // Atas 0px (menempel langsung di langit-langit kontainer)
  // Bawah -90% (memblokir 90% area bawah, menyisakan 10% di atas)
  rootMargin: '0px 0px -90% 0px', 
  threshold: 0 
};

  let observer = new IntersectionObserver((entries) => {
    // ABAIKAN deteksi jika pergerakan layar sedang dikendalikan oleh sistem (Play/Klik Marker)
    if (detailsContainer.classList.contains('sedang-auto-scroll')) return;

    entries.forEach(entry => {
      // Jika elemen masuk ke zona tengah layar
      if (entry.isIntersecting) {
        let kandidatTerpilih = entry.target.getAttribute('data-index');

        // Cegah eksekusi berulang jika index yang terbaca masih sama
        if (kandidatTerpilih !== indexAktif) {
          indexAktif = kandidatTerpilih; 
          
          // Pengguna terdeteksi melakukan scroll manual, hentikan mode Play/Musik
          hentikanPlay(); 

          if (indexAktif === '-1') {
            Map.closePopup();
            if (markerBounds.length > 0) {
              Map.flyToBounds(markerBounds, dapatkanOpsiBounds(true));
            }
          } else {
            let indexAngka = parseInt(indexAktif);
            let targetRecord = TimelineRecords[indexAngka];
            
            // Buka popup dan fokuskan peta HANYA jika popup belum terbuka
            if (targetRecord && targetRecord.marker && !targetRecord.marker.isPopupOpen()) {
              targetRecord.marker.openPopup();
              fokusKeMarker(targetRecord.marker.getLatLng(), false); 
            }
          }
        }
      }
    });
  }, observerOptions);

  // Pasang sensor ke semua item linimasa setelah dirender
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
// FUNGSI FOKUS: GERAKAN LANGSUNG 1 LANGKAH (ANTI MEMBAL DUA KALI DI HP)
// =========================================================================
function fokusKeMarker(latlng, keepCurrentZoom = false, durasi = 1.2) {
  let targetZoom = keepCurrentZoom ? Map.getZoom() : 12;
  let koordinatAkhir = latlng;

  if (window.innerWidth <= 800) {
    let targetPoint = Map.project(latlng, targetZoom);
    targetPoint.y += 40; 
    koordinatAkhir = Map.unproject(targetPoint, targetZoom);
  }

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
