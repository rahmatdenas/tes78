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
      marker.bindPopup(popupContent);
      
      // Event saat Marker di Klik
      marker.on('click', function() {
        
        // Sengaja Dihapus/Komen agar klik marker tidak memaksa buka panel
        // if (typeof window.setMobilePanelExpanded === 'function') {
        //   window.setMobilePanelExpanded(true); 
        // }

        let indexStr = index.toString();
        indexAktif = indexStr; // Sinkronkan memori

        detailsContainer.classList.add('sedang-auto-scroll');
        clearTimeout(jedaAutoScroll);
        
        jedaAutoScroll = setTimeout(() => {
          detailsContainer.classList.remove('sedang-auto-scroll');
        }, 1200); 

        // Gulir panel ke target yang diklik
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
        // Geser peta
        targetRecord.marker.openPopup();
        Map.panTo(targetRecord.marker.getLatLng()); 

        indexAktif = indexStr; // Sinkronkan memori

        // Gulir panel ke H2 yang sedang diklik
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
    
    // Jika sistem yang sedang auto-scroll (karena klik), abaikan agar tidak bentrok
    if (detailsContainer.classList.contains('sedang-auto-scroll')) return;
    
    clearTimeout(jedaScroll);
    
    // Timer 300ms: Hanya jalankan ini kalau scroll SUDAH BERHENTI TOTAL
    jedaScroll = setTimeout(() => {
      
      // 1. Buat "Garis Pemicu" di posisi 15% dari atas layar saat ini
      // Artinya, elemen baru dianggap aktif kalau jaraknya sudah mencapai area ini
      let batasAktif = detailsContainer.scrollTop + (detailsContainer.clientHeight * 0.15); 
      
      let items = document.querySelectorAll('.timeline-item');
      let kandidatTerpilih = null;

      // 2. Scan semua item dari atas ke bawah
      for (let i = 0; i < items.length; i++) {
        let item = items[i];
        
        // offsetTop adalah jarak asli elemen dari paling atas kontainer.
        // Selama elemen masih berada di atas "Garis Pemicu", jadikan dia kandidat.
        // Karena loop dari atas ke bawah, yang terakhir lolos pasti yang sedang dilihat.
        if (item.offsetTop <= batasAktif) {
          kandidatTerpilih = item.getAttribute('data-index');
        } else {
          // Kalau sudah ketemu elemen yang posisinya di bawah garis pemicu,
          // langsung HENTIKAN pencarian untuk menghemat memori (performa).
          break; 
        }
      }

      // Jaga-jaga jika scroll mentok di paling atas (belum ada yang menyentuh batas)
      if (kandidatTerpilih === null && items.length > 0) {
        kandidatTerpilih = items[0].getAttribute('data-index');
      }

      // 3. Tembak ke Peta! Jika kandidat berubah, perbarui peta.
      if (kandidatTerpilih !== null && kandidatTerpilih !== indexAktif) {
        indexAktif = kandidatTerpilih; 
        let indexAngka = parseInt(indexAktif);
        let targetRecord = TimelineRecords[indexAngka];
        
        if (targetRecord && targetRecord.marker && !targetRecord.marker.isPopupOpen()) {
          targetRecord.marker.openPopup();
          Map.panTo(targetRecord.marker.getLatLng());
        }
      }
      
    }, 300); 

  }, { passive: true });

  // ==========================================
  // 6. FINALIZE UI
  // ==========================================
  document.getElementById('loading').style.display = 'none';
  detailsContainer.style.display = 'block';

  // Sesuaikan zoom peta agar semua marker terlihat di awal
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
