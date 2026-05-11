import { searchCity, getWeatherData, getReverseGeocoding } from './api.js';
import { 
  updateCurrentWeather, 
  updateHourlyForecast, 
  updateDailyForecast, 
  updateMetrics, 
  showLoading, 
  hideLoading, 
  showError 
} from './ui.js';

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  // Inicia os ícones
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Elementos
  const searchInput = document.getElementById('search-input');
  const locationBtn = document.getElementById('location-btn');

  // Event Listeners
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const query = searchInput.value.trim();
      if (query) {
        handleSearch(query);
      }
    }
  });

  locationBtn.addEventListener('click', () => {
    handleGeolocation();
  });

  // Tenta buscar o clima local ao iniciar
  handleGeolocation(true);
});

async function handleSearch(query) {
  try {
    showLoading();
    // 1. Busca Lat/Lon da cidade
    const cityData = await searchCity(query);
    
    // 2. Busca dados climáticos
    const weatherData = await getWeatherData(cityData.latitude, cityData.longitude);
    
    // 3. Atualiza UI
    updateAllUI(weatherData, cityData);
    hideLoading();
  } catch (error) {
    showError('Cidade não encontrada. Verifique o nome e tente novamente.');
  }
}

function handleGeolocation(isInitial = false) {
  if (!navigator.geolocation) {
    if (!isInitial) showError('Geolocalização não é suportada pelo seu navegador.');
    // Fallback para uma cidade padrão
    if (isInitial) handleSearch('São Paulo');
    return;
  }

  if(!isInitial) showLoading();

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        if(isInitial) showLoading();
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        // Pega os dados do clima
        const weatherData = await getWeatherData(lat, lon);
        
        // Tenta descobrir o nome da cidade baseada nas coordenadas
        const cityData = await getReverseGeocoding(lat, lon);
        
        updateAllUI(weatherData, cityData);
        hideLoading();
      } catch (error) {
        showError('Erro ao buscar dados da sua localização.');
        if(isInitial) handleSearch('São Paulo'); // Fallback
      }
    },
    (error) => {
      if (!isInitial) showError('Acesso à localização negado.');
      if (isInitial) handleSearch('São Paulo'); // Fallback para SP se negar a localização
    }
  );
}

function updateAllUI(weatherData, cityData) {
  updateCurrentWeather(weatherData, cityData);
  updateHourlyForecast(weatherData);
  updateDailyForecast(weatherData);
  updateMetrics(weatherData);
}
