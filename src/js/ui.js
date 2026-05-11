import { getWeatherDetails, getWindDir } from './api.js';

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const weatherContent = document.getElementById('weather-content');
const globalLoading  = document.getElementById('global-loading');
const errorMessage   = document.getElementById('error-message');
const appEl          = document.getElementById('app');

function rerender() {
  if (window.lucide) window.lucide.createIcons();
}

// ─── Current Weather ──────────────────────────────────────────────────────────
export function updateCurrentWeather(data, cityData) {
  const c      = data.current;
  const isDay  = c.is_day;
  const detail = getWeatherDetails(c.weather_code, isDay);

  // City & country
  document.getElementById('current-city').textContent    = cityData.name;
  document.getElementById('current-country').textContent = cityData.country || '';

  // Temp & desc
  document.getElementById('current-temp').textContent = Math.round(c.temperature_2m);
  document.getElementById('current-desc').textContent = detail.desc;

  // Date
  document.getElementById('current-date').textContent = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  // Hero extras — precipitation chance today + wind
  const precipToday = data.daily?.precipitation_probability_max?.[0] ?? '--';
  document.getElementById('precip-chance').textContent = precipToday;
  document.getElementById('hero-wind').textContent     = Math.round(c.wind_speed_10m);

  // Hero icon (Lucide, grande)
  const hero = document.getElementById('hero-icon');
  hero.innerHTML = `<i data-lucide="${detail.icon}"></i>`;

  // Theme
  updateTheme(c.weather_code, isDay);
}

// ─── Hourly ───────────────────────────────────────────────────────────────────
export function updateHourlyForecast(data) {
  const container = document.getElementById('hourly-container');
  container.innerHTML = '';

  const nowHour = new Date().getHours();
  const temps   = data.hourly.temperature_2m.slice(nowHour, nowHour + 24);
  const codes   = data.hourly.weather_code.slice(nowHour, nowHour + 24);
  const times   = data.hourly.time.slice(nowHour, nowHour + 24);
  const rains   = data.hourly.precipitation_probability?.slice(nowHour, nowHour + 24) ?? [];

  temps.forEach((temp, i) => {
    const dt     = new Date(times[i]);
    const hr     = dt.getHours();
    const isDayH = hr >= 6 && hr < 19 ? 1 : 0;
    const det    = getWeatherDetails(codes[i], isDayH);
    const rain   = rains[i];
    const isNow  = i === 0;

    const rainHtml = rain != null && rain > 10
      ? `<span class="h-rain"><i data-lucide="droplets"></i>${rain}%</span>`
      : '';

    const el = document.createElement('div');
    el.className = 'hourly-item' + (isNow ? ' active-hour' : '');
    el.innerHTML = `
      <span class="h-time">${isNow ? 'Agora' : `${String(hr).padStart(2,'0')}h`}</span>
      <i data-lucide="${det.icon}"></i>
      <span class="h-temp">${Math.round(temp)}°</span>
      ${rainHtml}
    `;
    container.appendChild(el);
  });
}

// ─── Daily ────────────────────────────────────────────────────────────────────
export function updateDailyForecast(data) {
  const container = document.getElementById('daily-container');
  container.innerHTML = '';

  const { time, weather_code, temperature_2m_max, temperature_2m_min,
          precipitation_probability_max } = data.daily;
  const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  time.forEach((dateStr, i) => {
    if (i === 0) return; // skip today
    const date  = new Date(dateStr + 'T12:00:00');
    const det   = getWeatherDetails(weather_code[i], 1);
    const rain  = precipitation_probability_max?.[i];

    const rainHtml = rain != null && rain > 10
      ? `<span class="d-rain"><i data-lucide="droplets"></i>${rain}%</span>`
      : '';

    const el = document.createElement('div');
    el.className = 'daily-item';
    el.innerHTML = `
      <span class="d-day">${days[date.getDay()]}</span>
      <i data-lucide="${det.icon}"></i>
      ${rainHtml}
      <div class="d-temps">
        <span class="d-high">${Math.round(temperature_2m_max[i])}°</span>
        <span class="d-low">${Math.round(temperature_2m_min[i])}°</span>
      </div>
    `;
    container.appendChild(el);
  });

  // Sunrise / Sunset
  const sr = data.daily?.sunrise?.[0];
  const ss = data.daily?.sunset?.[0];

  const fmt = (iso) => iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }) : '--';
  document.getElementById('sunrise-time').textContent = fmt(sr);
  document.getElementById('sunset-time').textContent  = fmt(ss);
}

// ─── Metrics ──────────────────────────────────────────────────────────────────
export function updateMetrics(data) {
  const c     = data.current;
  const daily = data.daily;

  document.getElementById('feels-like').textContent = Math.round(c.apparent_temperature);
  document.getElementById('humidity').textContent   = Math.round(c.relative_humidity_2m);
  document.getElementById('wind').textContent       = Math.round(c.wind_speed_10m);
  document.getElementById('pressure').textContent   = Math.round(c.surface_pressure);

  // Wind direction label
  const dir = getWindDir(c.wind_direction_10m ?? 0);
  document.getElementById('wind-dir-label').textContent = `Direção: ${dir.label}`;

  // Visibility (API returns meters, convert to km)
  const vis = c.visibility != null ? (c.visibility / 1000).toFixed(1) : '--';
  document.getElementById('visibility').textContent = vis;

  // UV Index
  const uv    = daily.uv_index_max?.[0];
  const uvNum = uv != null ? Math.round(uv) : null;
  document.getElementById('uv-value').innerHTML =
    uvNum != null ? `${uvNum}<span class="metric-unit"></span>` : '<span style="font-size:1.5rem">—</span>';

  const uvLabels = [
    [0,2,'🟢 Baixo','#69db7c'],
    [3,5,'🟡 Moderado','#ffd43b'],
    [6,7,'🟠 Alto','#ff9f43'],
    [8,10,'🔴 Muito Alto','#ff6b6b'],
    [11,99,'🟣 Extremo','#cc5de8'],
  ];
  const match = uvLabels.find(([lo,hi]) => uvNum >= lo && uvNum <= hi);
  document.getElementById('uv-label').textContent = match ? match[2] : '';
  const barWidth = uvNum != null ? Math.min((uvNum / 11) * 100, 100) : 0;
  document.getElementById('uv-bar').style.width = barWidth + '%';
}

// ─── UI State ─────────────────────────────────────────────────────────────────
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
  // Remove weather theme classes (not the light/dark ones)
  ['theme-night','theme-rain','theme-storm','theme-fog','theme-snow'].forEach(
    cls => appEl.classList.remove(cls)
  );

  if (!isDay)                                            { appEl.classList.add('theme-night'); return; }
  if ([95,96,99].includes(code))                          appEl.classList.add('theme-storm');
  else if ([45,48].includes(code))                        appEl.classList.add('theme-fog');
  else if ([71,73,75,77,85,86].includes(code))            appEl.classList.add('theme-snow');
  else if ([51,53,55,61,63,65,80,81,82].includes(code))   appEl.classList.add('theme-rain');
}
