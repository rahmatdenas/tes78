'use strict';

window.addEventListener('load', init);

// Inisialisasi aplikasi
function init() {
  initMap();
  loadPrimaryData(); // Dipanggil dari JS 3
}

// Inisialisasi Peta Leaflet (Tanpa Cluster)
function initMap() {
  // TAMBAHAN: Masukkan opsi { minZoom: 2 } di sini
  Map = new L.map('map', { 
    minZoom: 2 
  }).setView([-0.789, 113.921], 5); // Default view (Indonesia)

  let cartoLayer = new L.tileLayer(CARTO_LAYER_URL, {
    attribution : CARTO_LAYER_ATTRIBUTION,
    maxZoom     : TILE_LAYER_MAX_ZOOM,
  }).addTo(Map);

  let osmLayer = new L.tileLayer(OSM_LAYER_URL, {
    attribution : OSM_LAYER_ATTRIBUTION,
    maxZoom     : TILE_LAYER_MAX_ZOOM,
  });

  let baseMaps = {
    'CARTO Voyager'       : cartoLayer,
    'OpenStreetMap Carto' : osmLayer,
  };
  
  L.control.layers(baseMaps, null, {position: 'topleft'}).addTo(Map);
}

// Fungsi inti untuk menembak API Wikidata
function queryWdqsThenProcess(query, processEachResult, postprocessCallback) {
  let promise = new Promise((resolve, reject) => {
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState !== xhr.DONE) return;
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(xhr.status);
      }
    };
    xhr.open('POST', WDQS_API_URL, true);
    xhr.overrideMimeType('text/plain');
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.send('format=json&query=' + encodeURIComponent(query));
  });

  promise = promise.then(data => {
    if (data.results && data.results.bindings) {
      data.results.bindings.forEach(processEachResult);
    }
  });

  if (postprocessCallback) promise = promise.then(postprocessCallback);
  return promise;
}
