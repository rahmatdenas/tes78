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
  detailsContainer.innerHTML = ''; // Bersihkan panel sebelum diisi
  let markerBounds = [];

  TimelineRecords.forEach((record, index) => {
    // ---------------------------------------------------------
    // 1. RENDER KONTEN PANEL SAMPING (Sesuai hierarki yang diminta)
    // ---------------------------------------------------------
let panelHtml = `
      <div class="timeline-item" id="item-${index}">
        
        <h2 class="timeline-date">${record.formattedDate}</h2>
        
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
    detailsContainer.innerHTML += panelHtml;

    // 2. RENDER MARKER & LEAFLET POPUP
    if (record.lat && record.lon) {
      let marker = L.marker([record.lat, record.lon]).addTo(Map);
      markerBounds.push([record.lat, record.lon]);
      
      // Popup UI (Bersih dari CSS)
      let popupContent = `
        <div class="custom-popup">
          ${record.imageUrl ? `<img src="${record.imageUrl}"><br>` : ''}
          <strong class="popup-title">${record.locationName}</strong>
          <span class="popup-date">${record.formattedDate}</span>
        </div>
      `;
      marker.bindPopup(popupContent);
      
      // Interaksi: Klik marker di peta akan melakukan auto-scroll panel samping ke item terkait
marker.on('click', function() {
 
        let detailsContainer = document.getElementById('details');
        let targetItem = document.getElementById(`item-${index}`);
        
        // Kita beri jeda 300ms agar animasi panel yang naik ke 50% selesai dulu
        setTimeout(function() {
          // KUNCI PERBAIKAN: Kurangi posisi item dengan posisi wadahnya
          // Dikurangi lagi 10px agar tahun tidak terlalu menempel ke garis header
          let scrollPos = targetItem.offsetTop - detailsContainer.offsetTop - 10; 
          
          // Pastikan angka tidak negatif (jika item pertama yang diklik)
          if (scrollPos < 0) scrollPos = 0;
          
          detailsContainer.scrollTo({
            top: scrollPos,
            behavior: 'smooth'
          });
        }, 300);
        
      });
    }
});

  // Matikan animasi loading dan tampilkan panel details
  document.getElementById('loading').style.display = 'none';
  detailsContainer.style.display = 'block';

  // Sesuaikan zoom peta agar semua marker terlihat sekaligus
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
