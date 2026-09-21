const API_KEY = "fdd533266e28101881f610f2b8f1ebe1";
const API_URL = "https://api.openweathermap.org/data/2.5/weather";
const GEOCODING_URL = "https://api.openweathermap.org/geo/1.0/direct";

const searchForm = document.querySelector("#search-form");
const cityInput = document.querySelector("#city-input");
const searchButton = document.querySelector("#search-button");
const statusMessage = document.querySelector("#status-message");
const emptyState = document.querySelector("#empty-state");
const weatherCards = document.querySelector("#weather-cards");
const autocompleteList = document.querySelector("#autocomplete-list");
let autocompleteTimer;
let autocompleteController;

cityInput.addEventListener("input", () => {
  clearTimeout(autocompleteTimer);
  const search = cityInput.value.trim();

  if (search.length < 2) {
    hideSuggestions();
    return;
  }

  autocompleteTimer = setTimeout(() => loadSuggestions(search), 300);
});

cityInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    hideSuggestions();
  }
});

autocompleteList.addEventListener("click", (event) => {
  const suggestion = event.target.closest("[data-city]");
  if (!suggestion) return;

  cityInput.value = suggestion.dataset.city;
  hideSuggestions();
  searchForm.requestSubmit();
});

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const city = cityInput.value.trim();
  if (!city) {
    showStatus("Ingresa el nombre de una ciudad.");
    cityInput.focus();
    return;
  }

  hideSuggestions();
  setLoading(true);
  showStatus("Consultando el clima...");

  try {
    const weather = await getWeather(city);
    addWeatherCard(weather);
    showStatus("");
  } catch (error) {
    showStatus(error.message);
  } finally {
    setLoading(false);
  }
});

weatherCards.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-remove-card]");
  if (!closeButton) return;

  closeButton.closest(".weather-card").remove();
  emptyState.hidden = weatherCards.children.length > 0;
});

async function loadSuggestions(search) {
  if (autocompleteController) autocompleteController.abort();
  autocompleteController = new AbortController();

  const query = new URLSearchParams({ q: search, limit: "5", appid: API_KEY });

  try {
    const response = await fetch(`${GEOCODING_URL}?${query}`, {
      signal: autocompleteController.signal
    });
    if (!response.ok) throw new Error("No se pudieron cargar las sugerencias.");

    const cities = await response.json();
    renderSuggestions(cities);
  } catch (error) {
    if (error.name !== "AbortError") hideSuggestions();
  }
}

function renderSuggestions(cities) {
  autocompleteList.innerHTML = "";
  if (!cities.length) {
    hideSuggestions();
    return;
  }

  cities.forEach((city) => {
    const suggestion = document.createElement("button");
    suggestion.type = "button";
    suggestion.dataset.city = `${city.name}, ${city.country}`;
    suggestion.setAttribute("role", "option");
    suggestion.innerHTML = `<strong>${city.name}</strong><span>${city.state ? `${city.state}, ` : ""}${city.country}</span>`;
    autocompleteList.append(suggestion);
  });

  autocompleteList.classList.add("is-visible");
}

function hideSuggestions() {
  autocompleteList.classList.remove("is-visible");
}

async function getWeather(city) {
  const query = new URLSearchParams({
    q: city,
    appid: API_KEY,
    units: "metric",
    lang: "es"
  });
  const response = await fetch(`${API_URL}?${query}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("No encontramos esa ciudad. Revisa el nombre e intenta otra vez.");
    }
    throw new Error("No pudimos obtener el clima. Intenta nuevamente.");
  }

  return response.json();
}

function addWeatherCard(weather) {
  const iconCode = weather.weather[0].icon;
  const roundedTemperature = Math.round(weather.main.temp);
  const roundedFeelsLike = Math.round(weather.main.feels_like);
  const formattedDate = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date()).toUpperCase();
  const card = document.createElement("article");
  card.className = "weather-card is-visible";
  card.innerHTML = `
    <button class="remove-card" type="button" data-remove-card aria-label="Descartar ${weather.name}">&times;</button>
    <div class="card-topline">
      <span>${formattedDate}</span>
      <span class="location-pin" aria-hidden="true">&#9679;</span>
    </div>
    <div class="location-row">
      <div>
        <p class="country-label">${weather.sys.country}</p>
        <h2>${weather.name}</h2>
      </div>
      <img src="https://openweathermap.org/img/wn/${iconCode}@2x.png" alt="${weather.weather[0].description}" width="88" height="88">
    </div>
    <div class="temperature-row">
      <strong>${roundedTemperature}</strong><span>&deg;C</span>
    </div>
    <p class="weather-description">${weather.weather[0].description}</p>
    <div class="details-grid">
      <div class="detail-item"><span class="detail-label">Sensacion</span><strong>${roundedFeelsLike}&deg;C</strong></div>
      <div class="detail-item"><span class="detail-label">Humedad</span><strong>${weather.main.humidity}%</strong></div>
      <div class="detail-item"><span class="detail-label">Viento</span><strong>${Math.round(weather.wind.speed * 3.6)} km/h</strong></div>
    </div>`;

  weatherCards.prepend(card);
  emptyState.hidden = true;
}

function setLoading(isLoading) {
  searchButton.disabled = isLoading;
  searchButton.querySelector("span:first-child").textContent = isLoading ? "Buscando..." : "Buscar clima";
}

function showStatus(message) {
  statusMessage.textContent = message;
}
