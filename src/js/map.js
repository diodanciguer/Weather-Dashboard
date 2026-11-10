let map = null;
let marker = null;
let pendingFrame = 0;

export function initMap() {
  if (typeof L === "undefined") return;
  map = L.map("map-container", {
    zoomControl: false,
    scrollWheelZoom: false,
  }).setView([0, 0], 2);
  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);
  const resizeObserver = new ResizeObserver(() =>
    map.invalidateSize({ pan: false }),
  );
  resizeObserver.observe(document.getElementById("map-container"));
}

export function updateMap(lat, lon, cityName, temp) {
  if (!map) return;
  cancelAnimationFrame(pendingFrame);
  pendingFrame = requestAnimationFrame(() => {
    map.invalidateSize({ pan: false });
    map.setView([lat, lon], 10);
    if (marker) map.removeLayer(marker);
    const label = document.createElement("div");
    label.className = "map-weather-label";
    label.textContent = `${cityName}: ${Math.round(temp)}°`;
    const icon = L.divIcon({
      className: "custom-map-marker",
      html: label,
      iconSize: [0, 0],
      iconAnchor: [50, 30],
    });
    marker = L.marker([lat, lon], {
      icon,
      title: `${cityName}: ${Math.round(temp)}°`,
    }).addTo(map);
  });
}
