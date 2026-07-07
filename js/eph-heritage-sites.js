'use strict';

function loadPrimaryData() {
  queryWdqsThenProcess(
    SPARQL_RESIDENCE_QUERY,
    function(result) {
      // Ekstraksi tiap baris data
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
      // Urutkan berdasarkan waktu mentah paling awal ke akhir
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
  let indexAktif = '-1';
let kandidatIndexAktif = null;

  // 1. RAKIT KONTEN HTML PANEL
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

  // 2. RENDER MARKER & SIMPAN REFERENSI
  TimelineRecords.forEach((record, index) => {
    if (record.lat && record.lon) {
      let marker = L.marker([record.lat, record.lon]).addTo(Map);
      
      // Simpan langsung di dalam objek record agar lebih rapi
      record.marker = marker; 
      markerBounds.push([record.lat, record.lon]);
      
      let popupContent = `
        <div class="custom-popup">
          ${record.imageUrl ? `<img src="${record.imageUrl}"><br>` : ''}
          <strong class="popup-title">${record.locationName}</strong>
          <span class="popup-date">${record.formattedDate}</span>
        </div>
      `;
      marker.bindPopup(popupContent);
      
      // Interaksi: Klik marker otomatis scroll panel
marker.on('click', function() {
        
        if (typeof window.setMobilePanelExpanded === 'function') {
          window.setMobilePanelExpanded(true); 
        }

        // KUNCI 2: Catat di memori bahwa marker ini sedang kita buka secara manual
        indexAktif = index.toString();

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

  // 3. FITUR: KLIK H2 = BUKA MARKER (Menggunakan Event Delegation - Lebih Ringan)
  detailsContainer.addEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('timeline-date')) {
      let parentDiv = e.target.closest('.timeline-item');
      let index = parseInt(parentDiv.getAttribute('data-index'));
      let targetRecord = TimelineRecords[index];

      if (targetRecord && targetRecord.marker) {
        targetRecord.marker.openPopup();
        Map.panTo(targetRecord.marker.getLatLng()); // Geser peta perlahan
      }
    }
  });

  // 4. FITUR: SCROLLTELLING DENGAN INTERSECTION OBSERVER (Performa Juara!)
  // 4. FITUR: SCROLLTELLING SUPER RINGAN (Optimal untuk HP Spek Rendah)
let observer = new IntersectionObserver((entries) => {
    if (detailsContainer.classList.contains('sedang-auto-scroll')) return;

    let yangMenyentuh = entries.filter(e => e.isIntersecting);
    if (yangMenyentuh.length === 0) return;

    let entryTerpilih = yangMenyentuh[yangMenyentuh.length - 1];
    
    // Sesuaikan ini tergantung Anda memantau .timeline-item atau h2
    let parentDiv = entryTerpilih.target.closest('.timeline-item'); 
    
    // Cukup catat ke memori sementara, JANGAN jalankan timeout di sini
    kandidatIndexAktif = parentDiv.getAttribute('data-index');
    
  }, {
    root: detailsContainer,
    rootMargin: '0px 0px -80% 0px', 
    threshold: 0
  });

  // Pasang sensor (Sesuaikan dengan elemen target Anda)
  document.querySelectorAll('.timeline-date').forEach(item => {
    observer.observe(item);
  });

  // ==========================================
  // 2. SCROLL EVENT UNTUK DETEKSI BERHENTI TOTAL
  // ==========================================
detailsContainer.addEventListener('scroll', () => {
    
    if (detailsContainer.classList.contains('sedang-auto-scroll')) return;
    
    clearTimeout(jedaScroll);
    
    jedaScroll = setTimeout(() => {
      if (kandidatIndexAktif !== null && kandidatIndexAktif !== indexAktif) {
        indexAktif = kandidatIndexAktif;
        let indexAngka = parseInt(indexAktif);
        let targetRecord = TimelineRecords[indexAngka];
        
        if (targetRecord && targetRecord.marker && !targetRecord.marker.isPopupOpen()) {
          targetRecord.marker.openPopup();
          Map.panTo(targetRecord.marker.getLatLng());
        }
      }
    }, 300); 

  }, { passive: true });

  // Matikan animasi loading dan tampilkan panel details
  document.getElementById('loading').style.display = 'none';
  detailsContainer.style.display = 'block';

  // Sesuaikan zoom peta
  if (markerBounds.length > 0) {
    Map.fitBounds(markerBounds, { padding: [40, 40] });
  }
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
