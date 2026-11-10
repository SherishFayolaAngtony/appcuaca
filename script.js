/* ============================================================
   Weatherly – Weather Forecast Application
   script.js
   ============================================================ */

/* ===== Konstanta API Endpoints ===== */
const GEOCODING_API_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast";

/* ===== Pemetaan Kode Cuaca WMO ke deskripsi dan ikon ===== */
const WEATHER_CODE_MAP = {
    0:  { desc: "Cerah",                  icon: "☀️", iconNight: "🌙" },
    1:  { desc: "Hampir Cerah",            icon: "🌤️", iconNight: "🌙" },
    2:  { desc: "Sebagian Berawan",        icon: "⛅",  iconNight: "☁️" },
    3:  { desc: "Mendung",                icon: "☁️",  iconNight: "☁️" },
    45: { desc: "Kabut",                  icon: "🌫️", iconNight: "🌫️" },
    48: { desc: "Kabut Berembun Beku",     icon: "🌫️", iconNight: "🌫️" },
    51: { desc: "Gerimis Ringan",          icon: "🌦️", iconNight: "🌧️" },
    53: { desc: "Gerimis Sedang",          icon: "🌦️", iconNight: "🌧️" },
    55: { desc: "Gerimis Lebat",           icon: "🌧️", iconNight: "🌧️" },
    56: { desc: "Gerimis Membeku",         icon: "🌧️", iconNight: "🌧️" },
    57: { desc: "Gerimis Membeku Lebat",   icon: "🌧️", iconNight: "🌧️" },
    61: { desc: "Hujan Ringan",            icon: "🌦️", iconNight: "🌧️" },
    63: { desc: "Hujan Sedang",            icon: "🌧️", iconNight: "🌧️" },
    65: { desc: "Hujan Lebat",             icon: "🌧️", iconNight: "🌧️" },
    66: { desc: "Hujan Membeku",           icon: "🌧️", iconNight: "🌧️" },
    67: { desc: "Hujan Membeku Lebat",     icon: "🌧️", iconNight: "🌧️" },
    71: { desc: "Salju Ringan",            icon: "🌨️", iconNight: "🌨️" },
    73: { desc: "Salju Sedang",            icon: "🌨️", iconNight: "🌨️" },
    75: { desc: "Salju Lebat",             icon: "❄️",  iconNight: "❄️"  },
    77: { desc: "Butiran Salju",           icon: "🌨️", iconNight: "🌨️" },
    80: { desc: "Hujan Lokal Ringan",      icon: "🌦️", iconNight: "🌧️" },
    81: { desc: "Hujan Lokal Sedang",      icon: "🌧️", iconNight: "🌧️" },
    82: { desc: "Hujan Lokal Lebat",       icon: "⛈️",  iconNight: "⛈️"  },
    85: { desc: "Hujan Salju Ringan",      icon: "🌨️", iconNight: "🌨️" },
    86: { desc: "Hujan Salju Lebat",       icon: "❄️",  iconNight: "❄️"  },
    95: { desc: "Badai Petir",             icon: "⛈️",  iconNight: "⛈️"  },
    96: { desc: "Badai Petir + Hujan Es",  icon: "⛈️",  iconNight: "⛈️"  },
    99: { desc: "Badai Petir Berat",       icon: "⛈️",  iconNight: "⛈️"  },
};

/* ===== Elemen DOM ===== */
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const searchResults = document.getElementById("searchResults");
const loadingIndicator = document.getElementById("loadingIndicator");
const errorMessage = document.getElementById("errorMessage");
const errorText = document.getElementById("errorText");
const offlineMessage = document.getElementById("offlineMessage");
const emptyState = document.getElementById("emptyState");
const weatherData = document.getElementById("weatherData");

const cityName = document.getElementById("cityName");
const countryName = document.getElementById("countryName");
const dateTime = document.getElementById("dateTime");
const weatherIcon = document.getElementById("weatherIcon");
const currentTemp = document.getElementById("currentTemp");
const weatherDescription = document.getElementById("weatherDescription");
const feelsLike = document.getElementById("feelsLike");
const humidity = document.getElementById("humidity");
const windSpeed = document.getElementById("windSpeed");
const precipitation = document.getElementById("precipitation");
const dayNightIcon = document.getElementById("dayNightIcon");
const dayNightText = document.getElementById("dayNightText");
const uvIndex = document.getElementById("uvIndex");
const uvLevel = document.getElementById("uvLevel");
const sunriseEl = document.getElementById("sunrise");
const sunsetEl = document.getElementById("sunset");
const hourlyContainer = document.getElementById("hourlyContainer");
const dailyContainer = document.getElementById("dailyContainer");

/* ===== Variabel untuk debounce pencarian ===== */
let debounceTimer = null;

/* ============================================================
   FUNGSI UTILITAS
   ============================================================ */

/** Mengambil info cuaca dari kode WMO. */
function getWeatherInfo(code, isDay = 1) {
    const info = WEATHER_CODE_MAP[code];
    if (!info) {
        return { desc: "Tidak diketahui", icon: "❓" };
    }
    const icon = isDay === 1 ? info.icon : (info.iconNight || info.icon);
    return { desc: info.desc, icon };
}

/** Membuat deskripsi level UV Index. */
function getUVLevel(uv) {
    if (uv === null || uv === undefined) return "—";
    if (uv < 3) return "Rendah";
    if (uv < 6) return "Sedang";
    if (uv < 8) return "Tinggi";
    if (uv < 11) return "Sangat Tinggi";
    return "Ekstrem";
}

/** Memformat tanggal dan waktu dalam locale Indonesia. */
function formatDateTime(isoString, timezone) {
    const date = new Date(isoString);
    const options = {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone,
        hour12: false,
    };
    return new Intl.DateTimeFormat("id-ID", options).format(date);
}

/** Memformat jam saja dari ISO string (HH:MM). */
function formatHour(isoString, timezone) {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone,
        hour12: false,
    }).format(date);
}

/** Mengambil nama hari dari ISO string. */
function getDayName(isoString, timezone, short = true) {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("id-ID", {
        weekday: short ? "short" : "long",
        timeZone: timezone,
    }).format(date);
}

/** Memformat waktu sunrise/sunset menjadi HH:MM. */
function formatSunTime(isoString, timezone) {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone,
        hour12: false,
    }).format(date);
}

/** Membulatkan suhu ke integer dan menambahkan °C. */
function formatTemp(temp) {
    if (temp === null || temp === undefined) return "—";
    return `${Math.round(temp)}°C`;
}

/* ============================================================
   MANAJEMEN TAMPILAN (UI State)
   ============================================================ */

function showLoading() {
    hideAllPanels();
    loadingIndicator.classList.remove("hidden");
}

function showError(message) {
    hideAllPanels();
    errorText.textContent = message;
    errorMessage.classList.remove("hidden");
}

function showOffline() {
    hideAllPanels();
    offlineMessage.classList.remove("hidden");
}

function showEmptyState() {
    hideAllPanels();
    emptyState.classList.remove("hidden");
}

function showWeatherData() {
    hideAllPanels();
    weatherData.classList.remove("hidden");
}

/** Menyembunyikan semua panel utama. */
function hideAllPanels() {
    loadingIndicator.classList.add("hidden");
    errorMessage.classList.add("hidden");
    offlineMessage.classList.add("hidden");
    emptyState.classList.add("hidden");
    weatherData.classList.add("hidden");
}

/* ============================================================
   API: PENCARIAN KOTA (Geocoding)
   ============================================================ */

/**
 * Mencari kota berdasarkan nama menggunakan Open-Meteo Geocoding API.
 * @param {string} query - Nama kota yang dicari
 * @returns {Promise<Array>} - Daftar hasil pencarian
 */
async function searchCity(query) {
    const url = `${GEOCODING_API_URL}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Geocoding API gagal (HTTP ${response.status})`);
    }

    const data = await response.json();

    // Open-Meteo mengembalikan { results: [...] } jika ditemukan, atau {} jika kosong
    return data.results || [];
}

/**
 * Menampilkan hasil pencarian kota dalam dropdown.
 * @param {Array} results - Daftar hasil dari API geocoding
 */
function renderSearchResults(results) {
    searchResults.innerHTML = "";

    if (results.length === 0) {
        searchResults.innerHTML =
            '<div class="search-no-result">Kota tidak ditemukan. Coba nama lain.</div>';
        searchResults.classList.remove("hidden");
        return;
    }

    results.forEach((city) => {
        const item = document.createElement("div");
        item.className = "search-result-item";
        item.innerHTML = `
            <span class="search-result-icon">📍</span>
            <div>
                <div class="search-result-name">${city.name}</div>
                <div class="search-result-country">
                    ${city.country || "—"}${city.admin1 ? ", " + city.admin1 : ""}
                </div>
            </div>
        `;
        // Saat item diklik, ambil data cuaca untuk kota tersebut
        item.addEventListener("click", () => {
            searchResults.classList.add("hidden");
            searchInput.value = city.name;
            fetchWeather(city);
        });
        searchResults.appendChild(item);
    });

    searchResults.classList.remove("hidden");
}

/* ============================================================
   API: PENGAMBILAN DATA CUACA
   ============================================================ */

/**
 * Mengambil data prakiraan cuaca dari Open-Meteo Forecast API.
 * @param {number} lat - Latitude lokasi
 * @param {number} lon - Longitude lokasi
 * @returns {Promise<Object>} - Data cuaca lengkap
 */
async function fetchWeatherData(lat, lon) {
    const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
        hourly: "temperature_2m,precipitation_probability",
        daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max",
        timezone: "auto",
        forecast_days: "7",
    });

    const url = `${WEATHER_API_URL}?${params.toString()}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Weather API gagal (HTTP ${response.status})`);
    }

    return await response.json();
}

/* ============================================================
   RENDER: CUACA SAAT INI
   ============================================================ */

/**
 * Merender data cuaca saat ini ke card current weather.
 * @param {Object} current - Data current dari API
 * @param {Object} cityInfo - Info kota dari geocoding
 * @param {string} timezone - Zona waktu lokasi
 */
function renderCurrentWeather(current, cityInfo, timezone) {
    const info = getWeatherInfo(current.weather_code, current.is_day);

    cityName.textContent = cityInfo.name;
    countryName.textContent = `${cityInfo.country || "—"}${cityInfo.admin1 ? ", " + cityInfo.admin1 : ""}`;
    dateTime.textContent = formatDateTime(new Date().toISOString(), timezone);

    weatherIcon.textContent = current.is_day === 1 ? info.icon : (info.iconNight || info.icon);
    currentTemp.textContent = `${Math.round(current.temperature_2m)}°`;
    weatherDescription.textContent = info.desc;
    feelsLike.textContent = `${Math.round(current.apparent_temperature)}°C`;
    humidity.textContent = `${current.relative_humidity_2m}%`;
    windSpeed.textContent = `${current.wind_speed_10m} km/h`;
    precipitation.textContent = `${current.precipitation} mm`;

    // Indikator siang / malam
    if (current.is_day === 1) {
        dayNightIcon.textContent = "☀️";
        dayNightText.textContent = "Siang";
    } else {
        dayNightIcon.textContent = "🌙";
        dayNightText.textContent = "Malam";
    }
}

/* ============================================================
   RENDER: INFORMASI TAMBAHAN (UV, SUNRISE, SUNSET)
   ============================================================ */

/**
 * Merender informasi tambahan: UV index, matahari terbit & terbenam.
 * @param {Object} daily - Data daily dari API
 * @param {string} timezone - Zona waktu lokasi
 */
function renderAdditionalInfo(daily, timezone) {
    const todayUV = daily.uv_index_max?.[0];
    uvIndex.textContent = todayUV !== null && todayUV !== undefined ? todayUV.toFixed(1) : "—";
    uvLevel.textContent = getUVLevel(todayUV);

    sunriseEl.textContent = daily.sunrise?.[0] ? formatSunTime(daily.sunrise[0], timezone) : "--:--";
    sunsetEl.textContent = daily.sunset?.[0] ? formatSunTime(daily.sunset[0], timezone) : "--:--";
}

/* ============================================================
   RENDER: PRAKIRAAN PER JAM
   ============================================================ */

/**
 * Merender prakiraan cuaca per jam (24 jam ke depan mulai dari jam saat ini).
 * @param {Object} hourly - Data hourly dari API
 * @param {Object} current - Data current untuk menentukan is_day
 * @param {string} timezone - Zona waktu lokasi
 */
function renderHourlyForecast(hourly, current, timezone) {
    hourlyContainer.innerHTML = "";

    // Cari indeks jam terdekat dari waktu sekarang
    const now = Date.now();
    let startIndex = 0;
    for (let i = 0; i < hourly.time.length; i++) {
        if (new Date(hourly.time[i]).getTime() >= now - 3600000) {
            startIndex = i;
            break;
        }
    }

    // Tampilkan 24 jam ke depan
    const maxItems = 24;
    const endIndex = Math.min(startIndex + maxItems, hourly.time.length);

    for (let i = startIndex; i < endIndex; i++) {
        // Tentukan ikon berdasarkan siang/malam untuk jam tersebut
        // Gunakan waktu lokal untuk menentukan siang/malam (jam 06-18 = siang)
        const localHour = parseInt(
            new Intl.DateTimeFormat("id-ID", { hour: "2-digit", hour12: false, timeZone: timezone }).format(
                new Date(hourly.time[i])
            ),
            10
        );
        const isDayHour = localHour >= 6 && localHour < 18 ? 1 : 0;

        // Karena hourly tidak punya weather_code, gunakan current weather_code sebagai perkiraan
        const info = getWeatherInfo(current.weather_code, isDayHour);

        const item = document.createElement("div");
        item.className = "hourly-item";

        const timeLabel = i === startIndex ? "Sekarang" : formatHour(hourly.time[i], timezone);

        item.innerHTML = `
            <span class="hourly-time">${timeLabel}</span>
            <span class="hourly-icon">${info.icon}</span>
            <span class="hourly-temp">${Math.round(hourly.temperature_2m[i])}°</span>
            <span class="hourly-rain">💧 ${hourly.precipitation_probability?.[i] ?? 0}%</span>
        `;
        hourlyContainer.appendChild(item);
    }
}

/* ============================================================
   RENDER: PRAKIRAAN 7 HARI
   ============================================================ */

/**
 * Merender prakiraan cuaca 7 hari ke depan.
 * @param {Object} daily - Data daily dari API
 * @param {string} timezone - Zona waktu lokasi
 */
function renderDailyForecast(daily, timezone) {
    dailyContainer.innerHTML = "";

    for (let i = 0; i < daily.time.length; i++) {
        const info = getWeatherInfo(daily.weather_code[i], 1); // daily selalu pakai ikon siang
        const dayLabel = i === 0 ? "Hari ini" : getDayName(daily.time[i], timezone, true);

        const item = document.createElement("div");
        item.className = "daily-item";
        item.innerHTML = `
            <span class="daily-day">${dayLabel}</span>
            <span class="daily-icon">${info.icon}</span>
            <span class="daily-desc">${info.desc}</span>
            <span class="daily-temps">
                <span class="daily-max">${Math.round(daily.temperature_2m_max[i])}°</span>
                <span class="daily-min">${Math.round(daily.temperature_2m_min[i])}°</span>
            </span>
        `;
        dailyContainer.appendChild(item);
    }
}

/* ============================================================
   FUNGSI UTAMA: MENGAMBIL & MENAMPILKAN CUACA
   ============================================================ */

/**
 * Fungsi utama untuk mengambil data cuaca dan menampilkannya.
 * @param {Object} cityInfo - Objek info kota dari geocoding {name, country, latitude, longitude, admin1}
 */
async function fetchWeather(cityInfo) {
    // Cek koneksi internet sebelum request
    if (!navigator.onLine) {
        showOffline();
        return;
    }

    showLoading();

    try {
        const weather = await fetchWeatherData(cityInfo.latitude, cityInfo.longitude);

        // Validasi data minimum
        if (!weather.current || !weather.daily) {
            throw new Error("Data cuaca tidak lengkap dari API.");
        }

        const timezone = weather.timezone || "auto";

        // Render semua bagian
        renderCurrentWeather(weather.current, cityInfo, timezone);
        renderAdditionalInfo(weather.daily, timezone);
        renderHourlyForecast(weather.hourly, weather.current, timezone);
        renderDailyForecast(weather.daily, timezone);

        showWeatherData();
    } catch (error) {
        console.error("Error fetching weather:", error);

        // Jika error karena koneksi
        if (!navigator.onLine) {
            showOffline();
        } else {
            showError(
                "Gagal mengambil data cuaca. Pastikan koneksi internet stabil dan coba lagi."
            );
        }
    }
}

/* ============================================================
   HANDLER PENCARIAN
   ============================================================ */

/** Menangani proses pencarian kota dari input. */
async function handleSearch() {
    const query = searchInput.value.trim();

    if (query.length < 2) {
        searchResults.classList.add("hidden");
        return;
    }

    // Cek koneksi
    if (!navigator.onLine) {
        searchResults.classList.add("hidden");
        showOffline();
        return;
    }

    try {
        const results = await searchCity(query);
        renderSearchResults(results);
    } catch (error) {
        console.error("Error searching city:", error);
        searchResults.innerHTML =
            '<div class="search-no-result">Gagal mencari kota. Coba lagi.</div>';
        searchResults.classList.remove("hidden");
    }
}

/** Menangani submit pencarian (klik tombol Cari atau Enter). */
async function handleSearchSubmit() {
    const query = searchInput.value.trim();

    if (query.length < 2) {
        return;
    }

    if (!navigator.onLine) {
        showOffline();
        return;
    }

    showLoading();

    try {
        const results = await searchCity(query);

        if (results.length === 0) {
            hideAllPanels();
            emptyState.classList.remove("hidden");
            searchResults.innerHTML =
                '<div class="search-no-result">Kota tidak ditemukan. Coba nama lain.</div>';
            searchResults.classList.remove("hidden");
            return;
        }

        // Jika hanya ada 1 hasil, langsung tampilkan cuacanya
        if (results.length === 1) {
            searchResults.classList.add("hidden");
            searchInput.value = results[0].name;
            fetchWeather(results[0]);
        } else {
            // Jika ada beberapa hasil, tampilkan dropdown
            hideAllPanels();
            emptyState.classList.remove("hidden");
            renderSearchResults(results);
        }
    } catch (error) {
        console.error("Error in search submit:", error);
        showError("Gagal mencari kota. Pastikan koneksi internet stabil.");
    }
}

/* ============================================================
   EVENT LISTENERS
   ============================================================ */

// Tombol "Cari" diklik
searchBtn.addEventListener("click", handleSearchSubmit);

// Enter ditekan di input
searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        handleSearchSubmit();
    }
});

// Input berubah dengan debounce (pencarian live saat mengetik)
searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const query = searchInput.value.trim();

    if (query.length < 2) {
        searchResults.classList.add("hidden");
        return;
    }

    // Debounce 400ms agar tidak request terlalu sering
    debounceTimer = setTimeout(() => {
        handleSearch();
    }, 400);
});

// Klik di luar dropdown menutup hasil pencarian
document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-section")) {
        searchResults.classList.add("hidden");
    }
});

// Deteksi perubahan status koneksi internet
window.addEventListener("online", () => {
    offlineMessage.classList.add("hidden");
});

window.addEventListener("offline", () => {
    showOffline();
});

/* ============================================================
   INISIALISASI
   ============================================================ */

// Tampilkan empty state saat pertama kali dibuka
showEmptyState();
