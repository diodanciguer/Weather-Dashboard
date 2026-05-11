import { getWeatherDetails } from './api.js';

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const weatherContent  = document.getElementById('weather-content');
const globalLoading   = document.getElementById('global-loading');
const errorMessage    = document.getElementById('error-message');
const appEl           = document.getElementById('app');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function lucideIcon(name, extra = '') {
  return `<i data-lucide="${name}" ${extra}></i>`;
}

function rerender() {
  if (window.lucide) window.lucide.createIcons();
}

// ─── Current Weather ──────────────────────────────────────────────────────────
export function updateCurrentWeather(data, cityData) {
  const c      = data.current;
  const isDay  = c.is_day;
  const detail = getWeatherDetails(c.weather_code, isDay);

  document.getElementById('current-city').textContent = cityData.name;
  document.getElementById('current-temp').textContent = Math.round(c.temperature_2m);
  document.getElementById('current-desc').textContent = detail.desc;

  // Date
  const dateOpts = { weekday: 'long', day: 'numeric', month: 'long' };
  document.getElementById('current-date').textContent =
    new Date().toLocaleDateString('pt-BR', dateOpts);

  // Hero icon — Lucide SVG grande
  const hero = document.getElementById('hero-icon');
  hero.innerHTML = lucideIcon(detail.icon);

  // Dynamic theme
  updateTheme(c.weather_code, isDay);
}

// ─── Hourly ───────────────────────────────────────────────────────────────────
export function updateHourlyForecast(data) {
  const container  = document.getElementById('hourly-container');
  container.innerHTML = '';

  const nowHour    = new Date().getHours();
  const startIdx   = nowHour;
  const temps      = data.hourly.temperature_2m.slice(startIdx, startIdx + 24);
  const codes      = data.hourly.weather_code.slice(startIdx, startIdx + 24);
  const times      = data.hourly.time.slice(startIdx, startIdx + 24);

  temps.forEach((temp, i) => {
    const dt     = new Date(times[i]);
    const hr     = dt.getHours();
    const isDayH = hr >= 6 && hr < 19 ? 1 : 0;
    const det    = getWeatherDetails(codes[i], isDayH);
    const isNow  = i === 0;

    const el = document.createElement('div');
    el.className = 'hourly-item' + (isNow ? ' active-hour' : '');
    el.innerHTML = `
      <span class="h-time">${isNow ? 'Agora' : `${String(hr).padStart(2, '0')}h`}</span>
      ${lucideIcon(det.icon)}
      <span class="h-temp">${Math.round(temp)}°</span>
    `;
    container.appendChild(el);
  });
}

// ─── Daily ────────────────────────────────────────────────────────────────────
export function updateDailyForecast(data) {
  const container = document.getElementById('daily-container');
  container.innerHTML = '';

  const { time, weather_code, temperature_2m_max, temperature_2m_min } = data.daily;
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  time.forEach((dateStr, i) => {
    if (i === 0) return; // skip today (already shown)
    const date = new Date(dateStr + 'T12:00:00');
    const det  = getWeatherDetails(weather_code[i], 1);

    const el = document.createElement('div');
    el.className = 'daily-item';
    el.innerHTML = `
      <span class="d-day">${days[date.getDay()]}</span>
      ${lucideIcon(det.icon)}
      <div class="d-temps">
        <span class="d-high">${Math.round(temperature_2m_max[i])}°</span>
        <span class="d-low">${Math.round(temperature_2m_min[i])}°</span>
      </div>
    `;
    container.appendChild(el);
  });
}

// ─── Metrics ──────────────────────────────────────────────────────────────────
export function updateMetrics(data) {
  const c     = data.current;
  const daily = data.daily;

  document.getElementById('feels-like').textContent = Math.round(c.apparent_temperature);
  document.getElementById('humidity').textContent   = Math.round(c.relative_humidity_2m);
  document.getElementById('wind').textContent       = Math.round(c.wind_speed_10m);
  document.getElementById('pressure').textContent   = Math.round(c.surface_pressure);

  // Visibility not always in free tier — fallback
  const vis = c.visibility != null ? Math.round(c.visibility / 1000) : '--';
  document.getElementById('visibility').textContent = vis;

  // UV Index + label
  const uv    = daily.uv_index_max?.[0] != null ? Math.round(daily.uv_index_max[0]) : '--';
  const uvEl  = document.getElementById('uv-index');
  const uvLbl = document.getElementById('uv-label');

  let uvLabel = '';
  if (typeof uv === 'number') {
    if (uv <= 2)       uvLabel = '🟢 Baixo';
    else if (uv <= 5)  uvLabel = '🟡 Moderado';
    else if (uv <= 7)  uvLabel = '🟠 Alto';
    else if (uv <= 10) uvLabel = '🔴 Muito Alto';
    else               uvLabel = '🟣 Extremo';
  }
  uvEl.innerHTML  = `${uv}<span class="metric-unit"></span>`;
  uvLbl.textContent = uvLabel;
}

// ─── UI State Helpers ─────────────────────────────────────────────────────────
export function showLoading() {
  globalLoading.classList.remove('hidden');
  weatherContent.classList.add('hidden');
  errorMessage.classList.add('hidden');
}

export function hideLoading() {
  globalLoading.classList.add('hidden');
  weatherContent.classList.remove('hidden');
  rerender();
}

export function showError(msg) {
  globalLoading.classList.add('hidden');
  errorMessage.classList.remove('hidden');
  weatherContent.classList.add('hidden');
  if (msg) errorMessage.textContent = msg;
}

// ─── Theme ────────────────────────────────────────────────────────────────────
function updateTheme(code, isDay) {
  appEl.className = 'app-container'; // reset

  if (!isDay) { appEl.classList.add('theme-night'); return; }

  if ([95, 96, 99].includes(code))                             appEl.classList.add('theme-storm');
  else if ([45, 48].includes(code))                            appEl.classList.add('theme-fog');
  else if ([51,53,55,61,63,65,80,81,82].includes(code))        appEl.classList.add('theme-rain');
}
