import { searchCity, getWeatherData, getAirQuality } from './api.js';
import { fetchAndRender } from './main.js';

export function initCompare() {
  const modal = document.getElementById('compare-modal');
  const btnOpen = document.getElementById('compare-btn');
  const btnClose = document.getElementById('compare-close');
  const input = document.getElementById('compare-input');
  const btnSearch = document.getElementById('compare-search-btn');
  const grid = document.getElementById('compare-grid');

  btnOpen.addEventListener('click', () => {
    modal.classList.remove('hidden');
    input.focus();
  });

  btnClose.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  async function handleCompare() {
    const q = input.value.trim();
    if (!q) return;

    btnSearch.innerHTML = '<i class="lucide-loader animate-spin"></i>';
    
    try {
      const city2 = await searchCity(q);
      const [w2, aqi2] = await Promise.all([
        getWeatherData(city2.latitude, city2.longitude),
        getAirQuality(city2.latitude, city2.longitude)
      ]);

      // Assuming current city is rendered on the main dashboard, we can fetch it again for simplicity, 
      // or we can read it from the DOM. Let's read from DOM for city 1, or just render city 2 as a card.
      // Wait, we need both side by side.
      // We can grab the current city name and coords from the global state if we exposed it, 
      // but let's just get the DOM values for city 1.

      const c1Name = document.getElementById('current-city').textContent;
      const c1Temp = document.getElementById('current-temp').textContent;
      const c1Desc = document.getElementById('current-desc').textContent;
      const c1Wind = document.getElementById('wind-speed').textContent;
      const c1Hum  = document.getElementById('humidity').textContent;
      const c1UV   = document.getElementById('uv-val').textContent;

      const t2 = Math.round(w2.current.temperature_2m); // Note: Should respect unit, but we'll keep it simple
      const isF = localStorage.getItem('wd-unit') === 'F';
      const t2Fmt = isF ? Math.round((t2 * 9/5) + 32) : t2;

      grid.innerHTML = `
        <div class="compare-card">
          <h3>${c1Name}</h3>
          <p class="c-desc">Atual</p>
          <p class="c-temp">${c1Temp}°</p>
          <p class="c-desc">${c1Desc}</p>
          <div class="c-metrics">
            <div class="c-metric"><span>Vento</span><span>${c1Wind} km/h</span></div>
            <div class="c-metric"><span>Umidade</span><span>${c1Hum}%</span></div>
            <div class="c-metric"><span>Índice UV</span><span>${c1UV}</span></div>
          </div>
        </div>
        <div class="compare-card">
          <h3>${city2.name}</h3>
          <p class="c-desc">${city2.country || ''}</p>
          <p class="c-temp">${t2Fmt}°</p>
          <p class="c-desc">Condição Atual</p>
          <div class="c-metrics">
            <div class="c-metric"><span>Vento</span><span>${Math.round(w2.current.wind_speed_10m)} km/h</span></div>
            <div class="c-metric"><span>Umidade</span><span>${Math.round(w2.current.relative_humidity_2m)}%</span></div>
            <div class="c-metric"><span>Índice UV</span><span>${Math.round(w2.daily?.uv_index_max?.[0] || 0)}</span></div>
          </div>
        </div>
      `;
    } catch {
      grid.innerHTML = '<p class="compare-hint" style="color:#ef4444;">Cidade não encontrada.</p>';
    }

    btnSearch.innerHTML = '<i data-lucide="search"></i>';
    if (window.lucide) window.lucide.createIcons();
  }

  btnSearch.addEventListener('click', handleCompare);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleCompare();
  });
}
