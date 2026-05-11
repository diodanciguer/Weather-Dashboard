import { getWeatherDetails, getWindDir } from './api.js';

const weatherContent = document.getElementById('weather-content');
const globalLoading  = document.getElementById('global-loading');
const errorMessage   = document.getElementById('error-message');
const appEl          = document.getElementById('app');
const bgEl           = document.getElementById('weather-bg');

function rerender() { if (window.lucide) window.lucide.createIcons(); }

// ─── Current Weather ──────────────────────────────────────
export function updateCurrentWeather(data, cityData) {
  const c      = data.current;
  const isDay  = c.is_day;
  const detail = getWeatherDetails(c.weather_code, isDay);

  document.getElementById('current-city').textContent    = cityData.name;
  document.getElementById('current-country').textContent = cityData.country || '';
  document.getElementById('current-temp').textContent    = Math.round(c.temperature_2m);
  document.getElementById('current-desc').textContent    = detail.desc;
  document.getElementById('current-date').textContent    = new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});

  // Hi / Lo from daily[0]
  const hi = data.daily?.temperature_2m_max?.[0];
  const lo = data.daily?.temperature_2m_min?.[0];
  document.getElementById('current-hilo').textContent =
    hi != null ? `Máx ${Math.round(hi)}° · Mín ${Math.round(lo)}°` : '';

  // Pills
  document.getElementById('hero-precip').textContent = data.daily?.precipitation_probability_max?.[0] ?? '--';
  document.getElementById('hero-wind').textContent   = Math.round(c.wind_speed_10m);
  document.getElementById('hero-hum').textContent    = Math.round(c.relative_humidity_2m);

  // Hero icon
  document.getElementById('hero-icon').innerHTML = `<i data-lucide="${detail.icon}"></i>`;

  updateTheme(c.weather_code, isDay);
  initParticles(c.weather_code, isDay);
}

// ─── Hourly + Sparkline ───────────────────────────────────
export function updateHourlyForecast(data) {
  const container = document.getElementById('hourly-container');
  container.innerHTML = '';

  const nowH  = new Date().getHours();
  const slice = (arr) => arr.slice(nowH, nowH + 24);

  const temps = slice(data.hourly.temperature_2m);
  const codes = slice(data.hourly.weather_code);
  const times = slice(data.hourly.time);
  const rains = data.hourly.precipitation_probability ? slice(data.hourly.precipitation_probability) : [];

  temps.forEach((temp, i) => {
    const hr     = new Date(times[i]).getHours();
    const isDayH = hr >= 6 && hr < 19 ? 1 : 0;
    const det    = getWeatherDetails(codes[i], isDayH);
    const rain   = rains[i];
    const rainHtml = rain > 10 ? `<span class="h-rain">${rain}%</span>` : '';

    const el = document.createElement('li');
    el.className = 'hourly-item' + (i === 0 ? ' now' : '');
    el.innerHTML = `
      <span class="h-time">${i === 0 ? 'Agora' : String(hr).padStart(2,'0') + 'h'}</span>
      <i data-lucide="${det.icon}"></i>
      <span class="h-temp">${Math.round(temp)}°</span>
      ${rainHtml}
    `;
    container.appendChild(el);
  });

  drawSparkline(temps);
}

function drawSparkline(temps) {
  const W = 700, H = 60, PAD = 6;
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const range = max - min || 1;

  const pts = temps.map((t, i) => {
    const x = (i / (temps.length - 1)) * W;
    const y = PAD + (1 - (t - min) / range) * (H - PAD * 2);
    return [x, y];
  });

  const linePath = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const areaPath = linePath + ` L${W},${H} L0,${H} Z`;

  document.getElementById('spark-line').setAttribute('d', linePath);
  document.getElementById('spark-area').setAttribute('d', areaPath);
}

// ─── Daily Forecast ───────────────────────────────────────
export function updateDailyForecast(data) {
  const container = document.getElementById('daily-container');
  container.innerHTML = '';

  const { time, weather_code, temperature_2m_max, temperature_2m_min, precipitation_probability_max } = data.daily;
  const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  time.forEach((dateStr, i) => {
    if (i === 0) return;
    const date  = new Date(dateStr + 'T12:00:00');
    const det   = getWeatherDetails(weather_code[i], 1);
    const rain  = precipitation_probability_max?.[i];
    const rainHtml = rain > 10 ? `<span class="d-rain">${rain}%</span>` : '<span class="d-rain"></span>';

    const li = document.createElement('li');
    li.className = 'daily-item';
    li.innerHTML = `
      <span class="d-day">${days[date.getDay()]}</span>
      <i data-lucide="${det.icon}"></i>
      ${rainHtml}
      <div class="d-temps"><span class="d-hi">${Math.round(temperature_2m_max[i])}°</span><span class="d-lo">${Math.round(temperature_2m_min[i])}°</span></div>
    `;
    container.appendChild(li);
  });

  // Sunrise / Sunset
  const fmt = iso => iso ? new Date(iso).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : '--';
  document.getElementById('sunrise-time').textContent = fmt(data.daily?.sunrise?.[0]);
  document.getElementById('sunset-time').textContent  = fmt(data.daily?.sunset?.[0]);
}

// ─── Metrics ──────────────────────────────────────────────
export function updateMetrics(data) {
  const c     = data.current;
  const daily = data.daily;

  // Feels like
  const fl = Math.round(c.apparent_temperature);
  document.getElementById('feels-like').textContent = fl;
  const diff = fl - Math.round(c.temperature_2m);
  document.getElementById('feels-desc').textContent =
    diff < -1 ? `${Math.abs(diff)}° mais frio` : diff > 1 ? `${diff}° mais quente` : 'Similar à temperatura';

  // Humidity ring
  const hum = Math.round(c.relative_humidity_2m);
  document.getElementById('humidity').textContent = hum;
  const circumference = 188.5;
  const offset = circumference - (hum / 100) * circumference;
  document.getElementById('humidity-ring').style.strokeDashoffset = offset;

  // Wind + compass
  const ws  = Math.round(c.wind_speed_10m);
  const dir = getWindDir(c.wind_direction_10m ?? 0);
  document.getElementById('wind-speed').textContent = ws;
  document.getElementById('wind-dir').textContent   = dir.label;
  // Rotate compass needle
  const needle = document.getElementById('compass-needle');
  if (needle) needle.setAttribute('transform', `rotate(${dir.rotation} 40 40)`);

  // UV arc
  const uv    = daily.uv_index_max?.[0];
  const uvNum = uv != null ? Math.round(uv) : null;
  document.getElementById('uv-val').textContent = uvNum ?? '—';
  if (uvNum != null) {
    const arcLen = 125.7;
    const uvOff  = arcLen - Math.min((uvNum / 11), 1) * arcLen;
    document.getElementById('uv-arc').style.strokeDashoffset = uvOff;
    const uvMap = [[0,2,'🟢 Baixo','#4ade80'],[3,5,'🟡 Moderado','#facc15'],[6,7,'🟠 Alto','#fb923c'],[8,10,'🔴 Muito Alto','#f87171'],[11,20,'🟣 Extremo','#c084fc']];
    const match = uvMap.find(([lo,hi]) => uvNum >= lo && uvNum <= hi);
    if (match) {
      document.getElementById('uv-label').textContent = match[2];
      document.getElementById('uv-arc').style.stroke  = match[3];
    }
  }

  // Pressure
  const pres = Math.round(c.surface_pressure);
  document.getElementById('pressure').textContent = pres;
  document.getElementById('pressure-label').textContent =
    pres < 1000 ? '↓ Baixa — possível chuva' : pres > 1020 ? '↑ Alta — tempo estável' : 'Normal';

  // Visibility
  const vis = c.visibility != null ? (c.visibility / 1000).toFixed(1) : '--';
  document.getElementById('visibility').textContent = vis;
  const visNum = parseFloat(vis);
  const visPct = !isNaN(visNum) ? Math.min((visNum / 20) * 100, 100) : 0;
  document.getElementById('vis-bar').style.width = visPct + '%';
}

// ─── UI State ─────────────────────────────────────────────
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

// ─── Theme ────────────────────────────────────────────────
function updateTheme(code, isDay) {
  ['theme-night','theme-rain','theme-storm','theme-fog','theme-snow'].forEach(c => {
    appEl.classList.remove(c); bgEl.classList.remove(c);
  });
  const add = (cls) => { appEl.classList.add(cls); bgEl.classList.add(cls); };

  if (!isDay)                                            { add('theme-night'); return; }
  if ([95,96,99].includes(code))                          add('theme-storm');
  else if ([45,48].includes(code))                        add('theme-fog');
  else if ([71,73,75,77,85,86].includes(code))            add('theme-snow');
  else if ([51,53,55,61,63,65,80,81,82].includes(code))   add('theme-rain');
}

// ─── Particles ────────────────────────────────────────────
export function initParticles(code, isDay) {
  const container = document.getElementById('particles-container');
  container.innerHTML = '';

  // Remove existing special bg elements
  document.querySelectorAll('.sun-glow,.lightning').forEach(el => el.remove());

  if (!isDay) {
    // Stars
    for (let i = 0; i < 120; i++) {
      const s = document.createElement('span');
      s.className = 'star';
      s.style.cssText = `left:${Math.random()*100}vw;top:${Math.random()*100}vh;width:${1+Math.random()*2}px;height:${1+Math.random()*2}px;animation-duration:${1+Math.random()*3}s;animation-delay:${-Math.random()*3}s`;
      container.appendChild(s);
    }
    return;
  }

  if ([0,1].includes(code)) {
    // Sun glow
    const glow = document.createElement('div');
    glow.className = 'sun-glow';
    bgEl.appendChild(glow);
    return;
  }

  if ([51,53,55,61,63,65,80,81,82,95,96,99].includes(code)) {
    const count = [95,96,99].includes(code) ? 120 : 80;
    for (let i = 0; i < count; i++) {
      const d = document.createElement('span');
      d.className = 'rain-drop';
      d.style.cssText = `left:${Math.random()*110-5}vw;animation-duration:${0.4+Math.random()*0.4}s;animation-delay:${-Math.random()*2}s;opacity:${0.3+Math.random()*0.4}`;
      container.appendChild(d);
    }
    if ([95,96,99].includes(code)) {
      const flash = document.createElement('div');
      flash.className = 'lightning';
      bgEl.appendChild(flash);
    }
    return;
  }

  if ([71,73,75,77,85,86].includes(code)) {
    for (let i = 0; i < 70; i++) {
      const f = document.createElement('span');
      f.className = 'snow-flake';
      const sz = 2 + Math.random() * 4;
      f.style.cssText = `left:${Math.random()*100}vw;width:${sz}px;height:${sz}px;animation-duration:${3+Math.random()*5}s;animation-delay:${-Math.random()*5}s;opacity:${0.5+Math.random()*0.5}`;
      container.appendChild(f);
    }
  }
}
