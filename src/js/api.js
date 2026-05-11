// Open-Meteo API — sem necessidade de chave! Perfeito para portfólio.
const GEO_API_URL     = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';

// Mapa de códigos WMO → descrição PT-BR + ícone Lucide
export function getWeatherDetails(code, isDay = 1) {
  const map = {
    0:  { desc: 'Céu Limpo',                   icon: isDay ? 'sun'              : 'moon'            },
    1:  { desc: 'Predominantemente Limpo',      icon: isDay ? 'sun'              : 'moon'            },
    2:  { desc: 'Parcialmente Nublado',         icon: isDay ? 'cloud-sun'        : 'cloud-moon'      },
    3:  { desc: 'Nublado',                      icon: 'cloud'                                        },
    45: { desc: 'Nevoeiro',                     icon: 'cloud-fog'                                    },
    48: { desc: 'Nevoeiro com Geada',           icon: 'cloud-fog'                                    },
    51: { desc: 'Chuvisco Leve',                icon: 'cloud-drizzle'                                },
    53: { desc: 'Chuvisco Moderado',            icon: 'cloud-drizzle'                                },
    55: { desc: 'Chuvisco Forte',               icon: 'cloud-drizzle'                                },
    61: { desc: 'Chuva Leve',                   icon: 'cloud-rain'                                   },
    63: { desc: 'Chuva Moderada',               icon: 'cloud-rain'                                   },
    65: { desc: 'Chuva Forte',                  icon: 'cloud-rain'                                   },
    71: { desc: 'Neve Leve',                    icon: 'cloud-snow'                                   },
    73: { desc: 'Neve Moderada',                icon: 'cloud-snow'                                   },
    75: { desc: 'Neve Forte',                   icon: 'cloud-snow'                                   },
    77: { desc: 'Grãos de Neve',                icon: 'cloud-snow'                                   },
    80: { desc: 'Pancadas de Chuva Leves',      icon: 'cloud-rain-wind'                              },
    81: { desc: 'Pancadas de Chuva',            icon: 'cloud-rain-wind'                              },
    82: { desc: 'Pancadas de Chuva Fortes',     icon: 'cloud-rain-wind'                              },
    85: { desc: 'Pancadas de Neve Leves',       icon: 'cloud-snow'                                   },
    86: { desc: 'Pancadas de Neve Fortes',      icon: 'cloud-snow'                                   },
    95: { desc: 'Tempestade',                   icon: 'cloud-lightning'                              },
    96: { desc: 'Tempestade c/ Granizo',        icon: 'cloud-hail'                                   },
    99: { desc: 'Tempestade Forte c/ Granizo',  icon: 'cloud-hail'                                   },
  };
  return map[code] ?? { desc: 'Desconhecido', icon: 'cloud' };
}

// Converte graus de direção do vento em rótulo e ícone girado
export function getWindDir(deg) {
  const dirs = ['N','NE','L','SE','S','SO','O','NO'];
  const label = dirs[Math.round(deg / 45) % 8];
  return { label, rotation: deg };
}

// Geocodificação direta — 1 resultado (busca direta)
export async function searchCity(query) {
  const res  = await fetch(`${GEO_API_URL}?name=${encodeURIComponent(query)}&count=1&language=pt&format=json`);
  const data = await res.json();
  if (!data.results?.length) throw new Error('Cidade não encontrada');
  return data.results[0];
}

// Autocomplete — múltiplos resultados
export async function searchCities(query, count = 5) {
  const res  = await fetch(`${GEO_API_URL}?name=${encodeURIComponent(query)}&count=${count}&language=pt&format=json`);
  const data = await res.json();
  return data.results ?? [];
}

// Geocodificação reversa (lat/lon → nome da cidade)
export async function getReverseGeocoding(lat, lon) {
  try {
    const res  = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pt`);
    const data = await res.json();
    return { name: data.city || data.locality || 'Minha Localização', latitude: lat, longitude: lon, country: data.countryName };
  } catch {
    return { name: 'Minha Localização', latitude: lat, longitude: lon };
  }
}

// Dados climáticos completos (inclui nascer/pôr do sol e direção do vento)
export async function getWeatherData(lat, lon) {
  const params = new URLSearchParams({
    latitude:  lat,
    longitude: lon,
    current:   [
      'temperature_2m', 'relative_humidity_2m', 'apparent_temperature',
      'is_day', 'precipitation', 'weather_code', 'cloud_cover',
      'surface_pressure', 'wind_speed_10m', 'wind_direction_10m', 'visibility'
    ].join(','),
    hourly: 'temperature_2m,weather_code,precipitation_probability',
    daily:  'weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,sunrise,sunset,precipitation_probability_max',
    timezone: 'auto',
  });

  const res  = await fetch(`${WEATHER_API_URL}?${params}`);
  const data = await res.json();
  return data;
}
