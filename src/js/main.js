import { searchCity, getWeatherData, getReverseGeocoding } from './api.js';
import {
  updateCurrentWeather, updateHourlyForecast, updateDailyForecast,
  updateMetrics, showLoading, hideLoading, showError
} from './ui.js';

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Render static lucide icons (header buttons, metric labels, etc.)
  if (window.lucide) window.lucide.createIcons();

  // ── Theme Toggle ────────────────────────────────────────────────────────────
  const html          = document.documentElement;
  const themeToggle   = document.getElementById('theme-toggle');
  const iconLight     = document.getElementById('theme-icon-light');
  const iconDark      = document.getElementById('theme-icon-dark');

  // Read saved preference or default to dark
  const savedTheme = localStorage.getItem('wd-theme') || 'dark';
  applyTheme(savedTheme);

  themeToggle.addEventListener('click', () => {
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('wd-theme', next);
  });

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    if (theme === 'light') {
      iconLight.classList.add('hidden');
      iconDark.classList.remove('hidden');
    } else {
      iconDark.classList.add('hidden');
      iconLight.classList.remove('hidden');
    }
  }

  // ── Search ──────────────────────────────────────────────────────────────────
  const searchInput = document.getElementById('search-input');
  const locationBtn = document.getElementById('location-btn');

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const q = searchInput.value.trim();
      if (q) handleSearch(q);
    }
  });

  locationBtn.addEventListener('click', () => handleGeolocation());

  // Auto-detect location on first load
  handleGeolocation(true);
});

// ─── Handlers ─────────────────────────────────────────────────────────────────
async function handleSearch(query) {
  try {
    showLoading();
    const city    = await searchCity(query);
    const weather = await getWeatherData(city.latitude, city.longitude);
    updateAll(weather, city);
    hideLoading();
  } catch {
    showError('Cidade não encontrada. Verifique o nome e tente novamente.');
  }
}

function handleGeolocation(isInit = false) {
  if (!navigator.geolocation) {
    if (isInit) handleSearch('São Paulo');
    else showError('Geolocalização não suportada neste navegador.');
    return;
  }

  if (!isInit) showLoading();

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        if (isInit) showLoading();
        const { latitude: lat, longitude: lon } = pos.coords;
        const [weather, city] = await Promise.all([
          getWeatherData(lat, lon),
          getReverseGeocoding(lat, lon),
        ]);
        updateAll(weather, city);
        hideLoading();
      } catch {
        if (isInit) handleSearch('São Paulo');
        else showError('Erro ao buscar clima da sua localização.');
      }
    },
    () => {
      if (isInit) handleSearch('São Paulo');
      else showError('Acesso à localização negado.');
    }
  );
}

// ─── Update all UI sections ───────────────────────────────────────────────────
function updateAll(weatherData, cityData) {
  updateCurrentWeather(weatherData, cityData);
  updateHourlyForecast(weatherData);
  updateDailyForecast(weatherData);
  updateMetrics(weatherData);
}
