// Open-Meteo API doesn't require an API Key! Perfect for portfolio projects.
const GEO_API_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';

/**
 * Mapeia os códigos de clima (WMO) para texto em português e ícones SVG animados (se tivermos) ou Lucide icons.
 * Open-Meteo WMO codes: https://open-meteo.com/en/docs
 */
export function getWeatherDetails(code, isDay = 1) {
  const weatherMap = {
    0: { desc: 'Céu Limpo', icon: isDay ? 'sun' : 'moon' },
    1: { desc: 'Predominantemente Limpo', icon: isDay ? 'sun' : 'moon' },
    2: { desc: 'Parcialmente Nublado', icon: 'cloud-sun' },
    3: { desc: 'Nublado', icon: 'cloud' },
    45: { desc: 'Nevoeiro', icon: 'cloud-fog' },
    48: { desc: 'Nevoeiro com Geada', icon: 'cloud-fog' },
    51: { desc: 'Chuvisco Leve', icon: 'cloud-drizzle' },
    53: { desc: 'Chuvisco Moderado', icon: 'cloud-drizzle' },
    55: { desc: 'Chuvisco Forte', icon: 'cloud-drizzle' },
    61: { desc: 'Chuva Leve', icon: 'cloud-rain' },
    63: { desc: 'Chuva Moderada', icon: 'cloud-rain' },
    65: { desc: 'Chuva Forte', icon: 'cloud-rain' },
    71: { desc: 'Neve Leve', icon: 'cloud-snow' },
    73: { desc: 'Neve Moderada', icon: 'cloud-snow' },
    75: { desc: 'Neve Forte', icon: 'cloud-snow' },
    80: { desc: 'Pancadas de Chuva Leves', icon: 'cloud-rain' },
    81: { desc: 'Pancadas de Chuva', icon: 'cloud-rain' },
    82: { desc: 'Pancadas de Chuva Fortes', icon: 'cloud-lightning' },
    95: { desc: 'Tempestade', icon: 'cloud-lightning' },
    96: { desc: 'Tempestade com Granizo', icon: 'cloud-lightning' },
    99: { desc: 'Tempestade Forte com Granizo', icon: 'cloud-lightning' },
  };

  return weatherMap[code] || { desc: 'Desconhecido', icon: 'cloud' };
}

export async function searchCity(query) {
  try {
    const response = await fetch(`${GEO_API_URL}?name=${encodeURIComponent(query)}&count=1&language=pt&format=json`);
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      throw new Error('Cidade não encontrada');
    }
    
    return data.results[0]; // Retorna o primeiro resultado {name, latitude, longitude, country...}
  } catch (error) {
    console.error('Erro na busca de cidade:', error);
    throw error;
  }
}

export async function getReverseGeocoding(lat, lon) {
    try {
        // Open-Meteo reverse geocoding approach using timezone or generic name isn't perfect, 
        // we'll use a free reverse geocode API (BigDataCloud) for getting city name from coords
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pt`);
        const data = await response.json();
        return {
            name: data.city || data.locality || 'Sua Localização',
            latitude: lat,
            longitude: lon,
            country: data.countryName
        };
    } catch (error) {
        console.error('Erro ao pegar nome da cidade por coords:', error);
        return { name: 'Sua Localização', latitude: lat, longitude: lon };
    }
}

export async function getWeatherData(lat, lon) {
  try {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m',
      hourly: 'temperature_2m,weather_code',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,uv_index_max',
      timezone: 'auto'
    });

    const response = await fetch(`${WEATHER_API_URL}?${params.toString()}`);
    const data = await response.json();
    
    return data;
  } catch (error) {
    console.error('Erro ao buscar dados do clima:', error);
    throw error;
  }
}
