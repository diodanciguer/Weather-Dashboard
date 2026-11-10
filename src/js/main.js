import {
  searchCity,
  searchCities,
  getWeatherData,
  getReverseGeocoding,
  getAirQuality,
} from "./api.js";
import {
  updateCurrentWeather,
  updateHourlyForecast,
  updateDailyForecast,
  updateMetrics,
  showLoading,
  hideLoading,
  showError,
  setUnit,
  showToast,
} from "./ui.js";
import { initMap, updateMap } from "./map.js";
import { initCompare } from "./compare.js";

let currentCityData = null;
let cachedWeather = null;
let cachedAqi = null;
let requestVersion = 0;
const defaultCity = {
  name: "São Paulo",
  country: "Brasil",
  latitude: -23.5505,
  longitude: -46.6333,
};
const $ = (id) => document.getElementById(id);
const icons = () => window.lucide?.createIcons();
function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage is optional. */
  }
}
let favorites = read("wd-favs", []);
if (!Array.isArray(favorites)) favorites = [];
let history = read("wd-history", []);
if (!Array.isArray(history)) history = [];

function updateFavorites() {
  const active =
    currentCityData && favorites.some((f) => f.name === currentCityData.name);
  $("fav-toggle-btn").classList.toggle("active", Boolean(active));
  $("fav-toggle-btn").setAttribute("aria-pressed", String(Boolean(active)));
  $("fav-toggle-btn").setAttribute(
    "aria-label",
    active ? "Remover cidade dos favoritos" : "Salvar cidade como favorita",
  );
  $("favs-empty").classList.toggle("hidden", favorites.length > 0);
  $("favs-list").replaceChildren();
  favorites.forEach((city) => {
    const li = document.createElement("li");
    li.className = "fav-item";
    const load = document.createElement("button");
    load.className = "fav-item-name";
    load.textContent = city.name;
    load.addEventListener("click", () => {
      $("favs-dropdown").classList.add("hidden");
      $("favs-btn").setAttribute("aria-expanded", "false");
      fetchAndRender(city.lat, city.lon, {
        name: city.name,
        country: city.country,
      });
    });
    const remove = document.createElement("button");
    remove.className = "fav-item-del";
    remove.setAttribute("aria-label", `Remover ${city.name} dos favoritos`);
    remove.innerHTML = '<i data-lucide="x"></i>';
    remove.addEventListener("click", () => {
      favorites = favorites.filter((f) => f.name !== city.name);
      save("wd-favs", favorites);
      updateFavorites();
    });
    li.append(load, remove);
    $("favs-list").append(li);
  });
  icons();
}
function rememberCity(city) {
  history = history.filter((item) => item.name !== city.name);
  history.unshift(city);
  history = history.slice(0, 5);
  save("wd-history", history);
}
function renderWeather() {
  updateCurrentWeather(cachedWeather, currentCityData);
  updateHourlyForecast(cachedWeather);
  updateDailyForecast(cachedWeather);
  updateMetrics(cachedWeather, cachedAqi);
  updateFavorites();
  hideLoading();
  const currentTemp = cachedWeather.current.temperature_2m;
  let isF = false;
  try {
    isF = localStorage.getItem("wd-unit") === "F";
  } catch {
    /* Celsius by default. */
  }
  updateMap(
    currentCityData.latitude,
    currentCityData.longitude,
    currentCityData.name,
    isF ? (currentTemp * 9) / 5 + 32 : currentTemp,
  );
  $("compare-btn").disabled = false;
}
export async function fetchAndRender(lat, lon, city) {
  const version = ++requestVersion;
  showLoading();
  try {
    const [weather, aqi] = await Promise.all([
      getWeatherData(lat, lon),
      getAirQuality(lat, lon),
    ]);
    if (version !== requestVersion) return;
    if (!weather.current || !weather.daily || !weather.hourly)
      throw new Error("Previsão indisponível");
    currentCityData = { ...city, latitude: lat, longitude: lon };
    cachedWeather = weather;
    cachedAqi = aqi;
    renderWeather();
  } catch {
    if (version !== requestVersion) return;
    showError(
      "Não foi possível carregar a previsão. Confira sua conexão e busque a cidade novamente.",
    );
    $("last-updated").textContent = "Não foi possível atualizar";
  }
}
async function handleSearch(query) {
  showLoading();
  try {
    const city = await searchCity(query);
    rememberCity(city);
    await fetchAndRender(city.latitude, city.longitude, city);
  } catch {
    showError("Cidade não encontrada. Confira o nome e tente novamente.");
  }
}
function handleGeolocation() {
  if (!navigator.geolocation) {
    showToast("Seu navegador não oferece localização. Busque uma cidade.");
    return;
  }
  $("location-btn").disabled = true;
  showToast("Aguardando sua permissão de localização…");
  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      $("location-btn").disabled = false;
      const city = await getReverseGeocoding(coords.latitude, coords.longitude);
      await fetchAndRender(coords.latitude, coords.longitude, city);
    },
    () => {
      $("location-btn").disabled = false;
      showToast(
        "Localização indisponível. Você pode buscar a cidade pelo nome.",
      );
    },
    { timeout: 10000, maximumAge: 300000 },
  );
}

document.addEventListener("DOMContentLoaded", () => {
  icons();
  const root = document.documentElement;
  function applyTheme(theme) {
    root.dataset.theme = theme;
    $("icon-sun")?.classList.toggle("hidden", theme === "light");
    $("icon-moon")?.classList.toggle("hidden", theme === "dark");
    $("theme-toggle").setAttribute(
      "aria-label",
      theme === "light" ? "Ativar tema escuro" : "Ativar tema claro",
    );
    document.querySelector('meta[name="theme-color"]').content =
      theme === "light" ? "#f3f4f2" : "#151d21";
  }
  let savedTheme = "light";
  try {
    savedTheme = localStorage.getItem("wd-theme") || "light";
  } catch {
    /* Use the default. */
  }
  applyTheme(savedTheme === "dark" ? "dark" : "light");
  $("theme-toggle").addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem("wd-theme", next);
    } catch {
      /* Theme still works. */
    }
  });
  let isF = false;
  try {
    isF = localStorage.getItem("wd-unit") === "F";
  } catch {
    /* Celsius by default. */
  }
  setUnit(isF);
  $("unit-toggle").textContent = isF ? "°F" : "°C";
  $("unit-toggle").addEventListener("click", () => {
    isF = !isF;
    try {
      localStorage.setItem("wd-unit", isF ? "F" : "C");
    } catch {
      /* Conversion still works. */
    }
    $("unit-toggle").textContent = isF ? "°F" : "°C";
    setUnit(isF);
    if (cachedWeather) renderWeather();
  });
  $("compare-btn").disabled = true;
  $("fav-toggle-btn").addEventListener("click", () => {
    if (!currentCityData) return;
    if (favorites.some((f) => f.name === currentCityData.name))
      favorites = favorites.filter((f) => f.name !== currentCityData.name);
    else
      favorites.push({
        name: currentCityData.name,
        country: currentCityData.country,
        lat: currentCityData.latitude,
        lon: currentCityData.longitude,
      });
    save("wd-favs", favorites);
    updateFavorites();
  });
  $("favs-btn").setAttribute("aria-expanded", "false");
  $("favs-btn").addEventListener("click", () => {
    const closed = $("favs-dropdown").classList.toggle("hidden");
    $("favs-btn").setAttribute("aria-expanded", String(!closed));
  });
  updateFavorites();
  $("share-btn").addEventListener("click", async () => {
    if (!currentCityData) return;
    const url = new URL(location.href);
    url.searchParams.set("city", currentCityData.name);
    try {
      await navigator.clipboard.writeText(url.toString());
      showToast("Link da previsão copiado.");
    } catch {
      showToast("Não foi possível copiar o link. Tente novamente.");
    }
  });
  $("alert-close").addEventListener("click", () =>
    $("alert-banner").classList.add("hidden"),
  );
  const input = $("search-input"),
    list = $("autocomplete-list");
  let timer;
  function fillSuggestions(cities, historyMode = false) {
    list.replaceChildren();
    cities.forEach((city) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "suggestion-button";
      const icon = document.createElement("i");
      icon.dataset.lucide = historyMode ? "history" : "map-pin";
      const name = document.createElement("span");
      name.textContent = city.name;
      const country = document.createElement("span");
      country.className = "auto-country";
      country.textContent = [city.admin1, city.country]
        .filter(Boolean)
        .join(", ");
      button.append(icon, name, country);
      li.append(button);
      button.addEventListener("click", () => {
        input.value = city.name;
        list.classList.add("hidden");
        rememberCity(city);
        fetchAndRender(city.latitude, city.longitude, city);
        input.focus();
      });
      button.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          list.classList.add("hidden");
          input.focus();
        }
      });
      list.append(li);
    });
    list.classList.toggle("hidden", !cities.length);
    icons();
  }
  input.addEventListener("focus", () => {
    if (input.value.trim().length < 2) fillSuggestions(history, true);
  });
  input.addEventListener("input", () => {
    clearTimeout(timer);
    const query = input.value.trim();
    if (query.length < 2) {
      fillSuggestions(history, true);
      return;
    }
    timer = setTimeout(async () => {
      try {
        const cities = await searchCities(query, 5);
        if (input.value.trim() === query) fillSuggestions(cities);
      } catch {
        list.classList.add("hidden");
      }
    }, 300);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      clearTimeout(timer);
      list.classList.add("hidden");
      if (input.value.trim()) handleSearch(input.value.trim());
    }
    if (event.key === "ArrowDown" && !list.classList.contains("hidden")) {
      event.preventDefault();
      list.querySelector("button")?.focus();
    }
    if (event.key === "Escape") list.classList.add("hidden");
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".search-wrapper")) list.classList.add("hidden");
    if (
      !event.target.closest("#favs-dropdown") &&
      !event.target.closest("#favs-btn")
    ) {
      $("favs-dropdown").classList.add("hidden");
      $("favs-btn").setAttribute("aria-expanded", "false");
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      $("favs-dropdown").classList.add("hidden");
      $("favs-btn").setAttribute("aria-expanded", "false");
    }
  });
  $("location-btn").addEventListener("click", handleGeolocation);
  $("motion-toggle").addEventListener("click", () => {
    const paused = root.dataset.motion !== "paused";
    root.dataset.motion = paused ? "paused" : "playing";
    $("motion-toggle").setAttribute("aria-pressed", String(paused));
    $("motion-toggle").textContent = paused
      ? "Retomar animações"
      : "Pausar animações";
  });
  document.addEventListener(
    "visibilitychange",
    () => (root.dataset.pageHidden = String(document.hidden)),
  );
  initMap();
  initCompare();
  const cityParam = new URLSearchParams(location.search).get("city");
  if (cityParam) handleSearch(cityParam);
  else fetchAndRender(defaultCity.latitude, defaultCity.longitude, defaultCity);
});
