let map = null;
let marker = null;
let layerControl = null;
let tempLayer = null;

export function initMap() {
  if (typeof L === 'undefined') return;
  map = L.map('map-container', { zoomControl: false }).setView([0, 0], 2);
  
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  const baseLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  }).addTo(map);

  tempLayer = L.tileLayer('https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=YOUR_OPENWEATHER_KEY', {
    opacity: 0.5
  });

  // Open-Meteo doesn't have tile layers, openweathermap needs an API key which we don't have.
  // Instead, let's just show the base map with the marker for the portfolio.
}

export function updateMap(lat, lon, cityName, temp) {
  if (!map) return;
  map.setView([lat, lon], 10);
  
  if (marker) map.removeLayer(marker);
  
  const icon = L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="background:var(--t1);color:#000;padding:4px 8px;border-radius:12px;font-weight:700;font-size:12px;box-shadow:0 2px 10px rgba(0,0,0,0.2);white-space:nowrap;">${cityName}: ${Math.round(temp)}°</div>`,
    iconSize: [0, 0],
    iconAnchor: [50, 30]
  });

  marker = L.marker([lat, lon], { icon }).addTo(map);
}
