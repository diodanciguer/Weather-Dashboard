import { getWeatherDetails, getWindDir } from './api.js';

const weatherContent = document.getElementById('weather-content');
const globalLoading  = document.getElementById('skeleton-loading');
const errorMessage   = document.getElementById('error-message');
const appEl          = document.getElementById('app');
const bgEl           = document.getElementById('weather-bg');

let isFahrenheit = localStorage.getItem('wd-unit') === 'F';

export function setUnit(isF) {
  isFahrenheit = isF;
}

function fmtTemp(celsius) {
  const t = isFahrenheit ? (celsius * 9/5) + 32 : celsius;
  return Math.round(t);
}

function rerender() { if (window.lucide) window.lucide.createIcons(); }

// ─── Current Weather ──────────────────────────────────────
export function updateCurrentWeather(data, cityData) {
  const c      = data.current;
  const isDay  = c.is_day;
  const detail = getWeatherDetails(c.weather_code, isDay);

  document.getElementById('current-city').textContent    = cityData.name;
  document.getElementById('current-country').textContent = cityData.country || '';
  document.getElementById('current-temp').textContent    = fmtTemp(c.temperature_2m);
  document.getElementById('temp-unit-label').textContent = isFahrenheit ? '°F' : '°C';
  document.getElementById('current-desc').textContent    = detail.desc;
  document.getElementById('current-date').textContent    = new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});

  // Hi / Lo from daily[0]
  const hi = data.daily?.temperature_2m_max?.[0];
  const lo = data.daily?.temperature_2m_min?.[0];
  document.getElementById('current-hilo').textContent =
    hi != null ? `Máx ${fmtTemp(hi)}° · Mín ${fmtTemp(lo)}°` : '';

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
      <span class="h-temp">${fmtTemp(temp)}°</span>
      ${rainHtml}
    `;
    container.appendChild(el);
  });

  drawSparkline(temps.map(fmtTemp));
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

// ─── Daily Forecast & Weekly Chart ────────────────────────
export function updateDailyForecast(data) {
  const container = document.getElementById('daily-container');
  container.innerHTML = '';

  const { time, weather_code, temperature_2m_max, temperature_2m_min, precipitation_probability_max } = data.daily;
  const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  const maxTemps = [];

  time.forEach((dateStr, i) => {
    if (i === 0) return;
    const date  = new Date(dateStr + 'T12:00:00');
    const det   = getWeatherDetails(weather_code[i], 1);
    const rain  = precipitation_probability_max?.[i];
    const rainHtml = rain > 10 ? `<span class="d-rain">${rain}%</span>` : '<span class="d-rain"></span>';

    const tMax = fmtTemp(temperature_2m_max[i]);
    const tMin = fmtTemp(temperature_2m_min[i]);
    maxTemps.push(tMax);

    const li = document.createElement('li');
    li.className = 'daily-item';
    li.innerHTML = `
      <span class="d-day">${days[date.getDay()]}</span>
      <i data-lucide="${det.icon}"></i>
      ${rainHtml}
      <div class="d-temps"><span class="d-hi">${tMax}°</span><span class="d-lo">${tMin}°</span></div>
    `;
    container.appendChild(li);
  });

  drawWeeklyChart(maxTemps);

  // Sunrise / Sunset
  const fmt = iso => iso ? new Date(iso).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : '--';
  document.getElementById('sunrise-time').textContent = fmt(data.daily?.sunrise?.[0]);
  document.getElementById('sunset-time').textContent  = fmt(data.daily?.sunset?.[0]);
}

function drawWeeklyChart(temps) {
  const W = 260, H = 70, PAD = 10;
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

  document.getElementById('wk-line').setAttribute('d', linePath);
  document.getElementById('wk-area').setAttribute('d', areaPath);

  const dotsGroup = document.getElementById('wk-dots');
  const labelsGroup = document.getElementById('wk-labels');
  dotsGroup.innerHTML = '';
  labelsGroup.innerHTML = '';

  pts.forEach((p, i) => {
    dotsGroup.innerHTML += `<circle cx="${p[0]}" cy="${p[1]}" r="3" class="wk-dot"/>`;
    labelsGroup.innerHTML += `<text x="${p[0]}" y="${p[1] - 8}" class="wk-lbl">${temps[i]}°</text>`;
  });
}

// ─── Metrics & AQI ────────────────────────────────────────
export function updateMetrics(data, aqiData) {
  const c     = data.current;
  const daily = data.daily;

  // Feels like
  const fl = fmtTemp(c.apparent_temperature);
  document.getElementById('feels-like').textContent = fl;
  document.getElementById('feels-unit').textContent = isFahrenheit ? '°F' : '°C';
  const diff = c.apparent_temperature - c.temperature_2m;
  document.getElementById('feels-desc').textContent =
    diff < -1 ? `${Math.abs(Math.round(diff))}° mais frio` : diff > 1 ? `${Math.round(diff)}° mais quente` : 'Similar à temperatura';

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

  // Precipitation Today
  const precip = c.precipitation || 0;
  document.getElementById('precip-mm').textContent = precip;
  document.getElementById('precip-label').textContent = precip > 0 ? 'Chovendo agora' : 'Sem chuva recente';

  // Moon Phase
  const moon = getMoonPhase();
  document.getElementById('moon-emoji').textContent = moon.emoji;
  document.getElementById('moon-label').textContent = moon.label;

  // AQI
  if (aqiData) {
    const aqi = aqiData.us_aqi;
    document.getElementById('aqi-val').textContent = aqi;
    const aqiMap = [
      [0,50,'Boa','#4ade80'],[51,100,'Moderada','#facc15'],
      [101,150,'Ruim (Grupos Sensíveis)','#fb923c'],
      [151,200,'Ruim','#ef4444'],[201,500,'Muito Ruim','#a855f7']
    ];
    const match = aqiMap.find(([lo,hi]) => aqi >= lo && aqi <= hi) || aqiMap[4];
    document.getElementById('aqi-label').textContent = match[2];
    document.getElementById('aqi-label').style.color = match[3];
    document.getElementById('aqi-bar').style.width = Math.min((aqi/300)*100, 100) + '%';
  } else {
    document.getElementById('aqi-val').textContent = '—';
    document.getElementById('aqi-label').textContent = 'Sem dados';
    document.getElementById('aqi-bar').style.width = '0%';
  }

  // Alerts Check
  checkAlerts(data, aqiData);
}

function getMoonPhase() {
  const lp = 2551443;
  const now = new Date();
  const newMoon = new Date(1970, 0, 7, 20, 35, 0);
  const phase = ((now.getTime() - newMoon.getTime()) / 1000) % lp;
  const pct = phase / lp;
  
  if (pct < 0.03 || pct > 0.97) return { emoji: '🌑', label: 'Nova' };
  if (pct < 0.22) return { emoji: '🌒', label: 'Crescente' };
  if (pct < 0.28) return { emoji: '🌓', label: 'Quarto Crescente' };
  if (pct < 0.47) return { emoji: '🌔', label: 'Gibosa Crescente' };
  if (pct < 0.53) return { emoji: '🌕', label: 'Cheia' };
  if (pct < 0.72) return { emoji: '🌖', label: 'Gibosa Minguante' };
  if (pct < 0.78) return { emoji: '🌗', label: 'Quarto Minguante' };
  return { emoji: '🌘', label: 'Minguante' };
}

// ─── Alerts & UI State ────────────────────────────────────
function checkAlerts(data, aqi) {
  const uv = data.daily?.uv_index_max?.[0] || 0;
  const rain = data.daily?.precipitation_probability_max?.[0] || 0;
  const temp = data.current?.temperature_2m || 15;
  const aq = aqi?.us_aqi || 0;

  if (aq > 150) showAlert('⚠️ Qualidade do ar ruim — Evite atividades ao ar livre');
  else if (uv >= 7) showAlert('☀️ Índice UV muito alto — Use protetor solar');
  else if (rain > 70) showAlert('🌧️ Alta probabilidade de chuva hoje — Leve guarda-chuva');
  else if (temp < 5) showAlert('🥶 Frio extremo — Agasalhe-se bem');
  else hideAlert();
}

let alertTimeout;
export function showAlert(msg) {
  const el = document.getElementById('alert-banner');
  document.getElementById('alert-text').textContent = msg;
  el.classList.remove('hidden');
  
  clearTimeout(alertTimeout);
  alertTimeout = setTimeout(() => {
    hideAlert();
  }, 6000);
}
export function hideAlert() {
  document.getElementById('alert-banner').classList.add('hidden');
}

export function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

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

  document.querySelectorAll('.sun-glow,.lightning').forEach(el => el.remove());

  if (!isDay) {
    for (let i = 0; i < 120; i++) {
      const s = document.createElement('span');
      s.className = 'star';
      s.style.cssText = `left:${Math.random()*100}vw;top:${Math.random()*100}vh;width:${1+Math.random()*2}px;height:${1+Math.random()*2}px;animation-duration:${1+Math.random()*3}s;animation-delay:${-Math.random()*3}s`;
      container.appendChild(s);
    }
    return;
  }

  if ([0,1].includes(code)) {
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
