import { searchCity, searchCities, getWeatherData, getReverseGeocoding } from './api.js';
import {
  updateCurrentWeather, updateHourlyForecast, updateDailyForecast,
  updateMetrics, showLoading, hideLoading, showError
} from './ui.js';

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

  // ── Autocomplete ──────────────────────────────────────────
  const input   = document.getElementById('search-input');
  const listEl  = document.getElementById('autocomplete-list');
  let acTimer   = null;

  input.addEventListener('input', () => {
    clearTimeout(acTimer);
    const q = input.value.trim();
    if (q.length < 2) { listEl.classList.add('hidden'); return; }
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
            fetchAndRender(city.latitude, city.longitude, { name: city.name, country: city.country });
          });
          listEl.appendChild(li);
        });
        listEl.classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons();
      } catch { listEl.classList.add('hidden'); }
    }, 300);
  });

  // Close autocomplete on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrapper')) listEl.classList.add('hidden');
  });

  // Enter key search
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      listEl.classList.add('hidden');
      const q = input.value.trim();
      if (q) handleSearch(q);
    }
  });

  // Location button
  document.getElementById('location-btn').addEventListener('click', () => handleGeolocation());

  // Auto-init
  handleGeolocation(true);
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

async function fetchAndRender(lat, lon, cityData) {
  const weather = await getWeatherData(lat, lon);
  updateCurrentWeather(weather, cityData);
  updateHourlyForecast(weather);
  updateDailyForecast(weather);
  updateMetrics(weather);
  hideLoading();
}
