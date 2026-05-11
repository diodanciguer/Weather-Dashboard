import { getWeatherDetails } from './api.js';

// DOM Elements
const appContainer = document.getElementById('app');
const weatherContent = document.getElementById('weather-content');
const globalLoading = document.getElementById('global-loading');
const errorMessage = document.getElementById('error-message');

// Atualiza o clima atual
export function updateCurrentWeather(data, cityData) {
  const current = data.current;
  const isDay = current.is_day;
  const weather = getWeatherDetails(current.weather_code, isDay);

  document.getElementById('current-city').textContent = cityData.name;
  document.getElementById('current-temp').textContent = Math.round(current.temperature_2m);
  document.getElementById('current-desc').textContent = weather.desc;
  
  // Formatar Data
  const dateOptions = { weekday: 'long', day: 'numeric', month: 'long' };
  document.getElementById('current-date').textContent = new Date().toLocaleDateString('pt-BR', dateOptions);

  // Criar icone dinamicamente (Lucide)
  const iconContainer = document.getElementById('current-icon');
  // Usaremos um span no lugar do img para renderizar o icone lucide se necessário, 
  // mas para manter a estrutura vamos colocar o icone ao lado da descrição e atualizar a imagem caso tenhamos SVGs reais.
  // Por ora, ocultamos a imagem e criamos um container para o icone.
  iconContainer.style.display = 'none';
  
  let iconElement = document.getElementById('dynamic-icon');
  if (!iconElement) {
    iconElement = document.createElement('i');
    iconElement.id = 'dynamic-icon';
    iconElement.style.width = '120px';
    iconElement.style.height = '120px';
    iconElement.style.display = 'block';
    iconElement.style.margin = '0 auto';
    // insere após o current-info
    document.querySelector('.current-weather').appendChild(iconElement);
  }
  
  iconElement.setAttribute('data-lucide', weather.icon);

  // Atualizar Tema com base no clima
  updateTheme(current.weather_code, isDay);
}

// Atualiza previsões horárias
export function updateHourlyForecast(data) {
  const container = document.getElementById('hourly-container');
  container.innerHTML = '';

  // Pegar as próximas 24 horas a partir de agora
  const now = new Date();
  const currentHour = now.getHours();
  
  // A API retorna um array de 168 horas (7 dias). Precisamos encontrar o index atual.
  // Uma abordagem simples: o index é o currentHour se for do mesmo dia.
  // A API retorna por padrão as últimas horas começando da meia noite local.
  const startIndex = currentHour;
  const next24Hours = data.hourly.temperature_2m.slice(startIndex, startIndex + 24);
  const next24Codes = data.hourly.weather_code.slice(startIndex, startIndex + 24);
  const next24Times = data.hourly.time.slice(startIndex, startIndex + 24);

  next24Hours.forEach((temp, i) => {
    const timeDate = new Date(next24Times[i]);
    const isDayH = (timeDate.getHours() >= 6 && timeDate.getHours() < 18) ? 1 : 0;
    const weather = getWeatherDetails(next24Codes[i], isDayH);
    const timeString = timeDate.getHours() === currentHour ? 'Agora' : `${timeDate.getHours()}:00`;

    const el = document.createElement('div');
    el.className = 'hourly-item';
    el.innerHTML = `
      <span class="time">${timeString}</span>
      <i data-lucide="${weather.icon}"></i>
      <span class="temp">${Math.round(temp)}°</span>
    `;
    container.appendChild(el);
  });
}

// Atualiza previsão de 7 dias
export function updateDailyForecast(data) {
  const container = document.getElementById('daily-container');
  container.innerHTML = '';

  const daily = data.daily;
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  daily.time.forEach((dateString, i) => {
    if (i === 0) return; // Pula o dia de hoje (já mostrado)

    const date = new Date(dateString + 'T12:00:00'); // Evita erro de fuso horário
    const weather = getWeatherDetails(daily.weather_code[i], 1); // Considera dia para o icone diario

    const el = document.createElement('div');
    el.className = 'daily-item';
    el.innerHTML = `
      <span class="day">${days[date.getDay()]}</span>
      <i data-lucide="${weather.icon}" class="icon"></i>
      <div class="temps">
        <span class="high">${Math.round(daily.temperature_2m_max[i])}°</span>
        <span class="low">${Math.round(daily.temperature_2m_min[i])}°</span>
      </div>
    `;
    container.appendChild(el);
  });
}

// Atualiza Métricas avançadas
export function updateMetrics(data) {
  const current = data.current;
  const daily = data.daily;
  
  document.getElementById('feels-like').textContent = Math.round(current.apparent_temperature);
  document.getElementById('humidity').textContent = Math.round(current.relative_humidity_2m);
  document.getElementById('wind').textContent = Math.round(current.wind_speed_10m);
  document.getElementById('pressure').textContent = Math.round(current.surface_pressure);
  
  // A Open-Meteo não retorna visibilidade no endpoint atual padrão, 
  // usaremos um fallback visual ou mock se não existir.
  const vis = current.visibility ? Math.round(current.visibility / 1000) : '--';
  document.getElementById('visibility').textContent = vis;
  
  // UV Index
  document.getElementById('uv-index').textContent = daily.uv_index_max[0] ? Math.round(daily.uv_index_max[0]) : '--';
}

// Controle de Estados da UI
export function showLoading() {
  globalLoading.classList.remove('hidden');
  weatherContent.classList.add('hidden');
  errorMessage.classList.add('hidden');
}

export function hideLoading() {
  globalLoading.classList.add('hidden');
  weatherContent.classList.remove('hidden');
  
  // Recarrega os ícones Lucide para os novos elementos injetados
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

export function showError(msg) {
  globalLoading.classList.add('hidden');
  errorMessage.classList.remove('hidden');
  if(msg) errorMessage.textContent = msg;
}

// Troca de Temas
function updateTheme(code, isDay) {
  appContainer.className = 'app-container glass-panel'; // reset
  
  if (!isDay) {
    appContainer.classList.add('theme-night');
    return;
  }

  // Chuva / Tempestade / Nevoeiro -> Tema mais escuro/frio
  if ([45, 48, 51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code)) {
    appContainer.classList.add('theme-rain');
  }
}
