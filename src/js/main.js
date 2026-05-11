import { searchCity, searchCities, getWeatherData, getReverseGeocoding, getAirQuality } from './api.js';
import {
  updateCurrentWeather, updateHourlyForecast, updateDailyForecast,
  updateMetrics, showLoading, hideLoading, showError, setUnit, showToast
} from './ui.js';
import { initMap, updateMap } from './map.js';
import { initCompare } from './compare.js';

let currentCityData = null;

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) window.lucide.createIcons();

  // ── Theme ─────────────────────────────────────────────────
  const html     = document.documentElement;
  const toggle   = document.getElementById('theme-toggle');
  const iconSun  = document.getElementById('icon-sun');
  const iconMoon = document.getElementById('icon-moon');

  function applyTheme(t) {
    html.setAttribute('data-theme', t);
    iconSun.classList.toggle('hidden', t === 'light');
    iconMoon.classList.toggle('hidden', t === 'dark');
  }
  applyTheme(localStorage.getItem('wd-theme') || 'dark');
  toggle.addEventListener('click', () => {
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('wd-theme', next);
  });

  // ── Toggle °C / °F ────────────────────────────────────────
  const unitBtn = document.getElementById('unit-toggle');
  let isF = localStorage.getItem('wd-unit') === 'F';
  unitBtn.textContent = isF ? '°F' : '°C';
  unitBtn.addEventListener('click', () => {
    isF = !isF;
    localStorage.setItem('wd-unit', isF ? 'F' : 'C');
    unitBtn.textContent = isF ? '°F' : '°C';
    setUnit(isF);
    if (currentCityData) fetchAndRender(currentCityData.latitude, currentCityData.longitude, currentCityData);
  });

  // ── Favorites ─────────────────────────────────────────────
  const favBtn = document.getElementById('fav-toggle-btn');
  const favDropdownBtn = document.getElementById('favs-btn');
  const favDropdown = document.getElementById('favs-dropdown');
  const favList = document.getElementById('favs-list');
  const favEmpty = document.getElementById('favs-empty');

  let favorites = JSON.parse(localStorage.getItem('wd-favs') || '[]');

  function saveFavs() { localStorage.setItem('wd-favs', JSON.stringify(favorites)); }
  function isFav(name) { return favorites.some(f => f.name === name); }

  function updateFavUI() {
    if (!currentCityData) return;
    const isf = isFav(currentCityData.name);
    favBtn.classList.toggle('active', isf);
    favBtn.innerHTML = `<i data-lucide="star" ${isf ? 'fill="currentColor"' : ''}></i>`;
    if (window.lucide) window.lucide.createIcons();
    
    favList.innerHTML = '';
    if (favorites.length === 0) {
      favEmpty.classList.remove('hidden');
    } else {
      favEmpty.classList.add('hidden');
      favorites.forEach(f => {
        const li = document.createElement('li');
        li.className = 'fav-item';
        li.innerHTML = `<span class="fav-item-name">${f.name}</span><button class="fav-item-del"><i data-lucide="trash-2"></i></button>`;
        li.querySelector('.fav-item-name').addEventListener('click', () => {
          favDropdown.classList.add('hidden');
          fetchAndRender(f.lat, f.lon, { name: f.name, country: f.country });
        });
        li.querySelector('.fav-item-del').addEventListener('click', (e) => {
          e.stopPropagation();
          favorites = favorites.filter(fav => fav.name !== f.name);
          saveFavs();
          updateFavUI();
        });
        favList.appendChild(li);
      });
    }
    if (window.lucide) window.lucide.createIcons();
  }

  favBtn.addEventListener('click', () => {
    if (!currentCityData) return;
    if (isFav(currentCityData.name)) {
      favorites = favorites.filter(f => f.name !== currentCityData.name);
    } else {
      favorites.push({ name: currentCityData.name, country: currentCityData.country, lat: currentCityData.latitude, lon: currentCityData.longitude });
    }
    saveFavs();
    updateFavUI();
  });

  favDropdownBtn.addEventListener('click', () => {
    favDropdown.classList.toggle('hidden');
  });

  // ── Share ─────────────────────────────────────────────────
  document.getElementById('share-btn').addEventListener('click', () => {
    if (!currentCityData) return;
    const url = new URL(window.location.href);
    url.searchParams.set('city', currentCityData.name);
    navigator.clipboard.writeText(url.toString());
    showToast('Link copiado! ✓');
  });

  // ── Alert Close ───────────────────────────────────────────
  document.getElementById('alert-close').addEventListener('click', () => {
    document.getElementById('alert-banner').classList.add('hidden');
  });

  // ── Autocomplete & History ────────────────────────────────
  const input   = document.getElementById('search-input');
  const listEl  = document.getElementById('autocomplete-list');
  let acTimer   = null;
  let history   = JSON.parse(localStorage.getItem('wd-history') || '[]');

  function saveHistory(city) {
    history = history.filter(h => h.name !== city.name);
    history.unshift(city);
    if (history.length > 5) history.pop();
    localStorage.setItem('wd-history', JSON.stringify(history));
  }

  function showHistory() {
    listEl.innerHTML = '';
    if (!history.length) return;
    history.forEach(city => {
      const li = document.createElement('li');
      li.innerHTML = `<i data-lucide="history"></i><span>${city.name}</span><span class="auto-country">${city.country ?? ''}</span>`;
      li.addEventListener('click', () => {
        input.value = city.name;
        listEl.classList.add('hidden');
        fetchAndRender(city.latitude, city.longitude, city);
      });
      listEl.appendChild(li);
    });
    listEl.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  input.addEventListener('focus', () => {
    if (input.value.trim().length < 2) showHistory();
  });

  input.addEventListener('input', () => {
    clearTimeout(acTimer);
    const q = input.value.trim();
    if (q.length < 2) { showHistory(); return; }
    acTimer = setTimeout(async () => {
      try {
        const cities = await searchCities(q, 5);
        listEl.innerHTML = '';
        if (!cities.length) { listEl.classList.add('hidden'); return; }
        cities.forEach(city => {
          const li = document.createElement('li');
          li.innerHTML = `<i data-lucide="map-pin"></i><span>${city.name}</span><span class="auto-country">${city.country ?? ''}</span>`;
          li.addEventListener('click', () => {
            input.value = city.name;
            listEl.classList.add('hidden');
            saveHistory(city);
            fetchAndRender(city.latitude, city.longitude, { name: city.name, country: city.country });
          });
          listEl.appendChild(li);
        });
        listEl.classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons();
      } catch { listEl.classList.add('hidden'); }
    }, 300);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrapper')) listEl.classList.add('hidden');
    if (!e.target.closest('#favs-dropdown') && !e.target.closest('#favs-btn')) {
      favDropdown.classList.add('hidden');
    }
  });

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      listEl.classList.add('hidden');
      const q = input.value.trim();
      if (q) handleSearch(q);
    }
  });

  document.getElementById('location-btn').addEventListener('click', () => handleGeolocation());

  // Init Modules
  initMap();
  initCompare();

  // Auto-init logic (Check URL params first)
  const urlParams = new URLSearchParams(window.location.search);
  const cityParam = urlParams.get('city');
  if (cityParam) {
    handleSearch(cityParam);
  } else {
    handleGeolocation(true);
  }
});

// ── Handlers ──────────────────────────────────────────────
async function handleSearch(query) {
  try {
    showLoading();
    const city = await searchCity(query);
    await fetchAndRender(city.latitude, city.longitude, city);
  } catch {
    showError('Cidade não encontrada. Verifique o nome e tente novamente.');
  }
}

function handleGeolocation(isInit = false) {
  if (!navigator.geolocation) { if (isInit) handleSearch('São Paulo'); return; }
  if (!isInit) showLoading();

  navigator.geolocation.getCurrentPosition(
    async ({ coords: { latitude: lat, longitude: lon } }) => {
      try {
        if (isInit) showLoading();
        const [city] = await Promise.all([getReverseGeocoding(lat, lon)]);
        await fetchAndRender(lat, lon, city);
      } catch {
        if (isInit) handleSearch('São Paulo');
        else showError('Erro ao buscar sua localização.');
      }
    },
    () => { if (isInit) handleSearch('São Paulo'); else showError('Localização negada.'); }
  );
}

export async function fetchAndRender(lat, lon, cityData) {
  currentCityData = cityData;
  const [weather, aqiData] = await Promise.all([
    getWeatherData(lat, lon),
    getAirQuality(lat, lon)
  ]);
  updateCurrentWeather(weather, cityData);
  updateHourlyForecast(weather);
  updateDailyForecast(weather);
  updateMetrics(weather, aqiData);
  
  // Fav update
  document.getElementById('fav-toggle-btn').classList.toggle('active', JSON.parse(localStorage.getItem('wd-favs') || '[]').some(f => f.name === cityData.name));
  const isf = JSON.parse(localStorage.getItem('wd-favs') || '[]').some(f => f.name === cityData.name);
  document.getElementById('fav-icon').setAttribute('fill', isf ? 'currentColor' : 'none');
  
  // Map update
  updateMap(lat, lon, cityData.name, weather.current.temperature_2m);
  
  hideLoading();
}
