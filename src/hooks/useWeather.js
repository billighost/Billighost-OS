import { useState, useEffect } from 'react';

const WEATHER_CACHE_KEY = 'billighost_weather_cache';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function mapWeatherCode(code) {
  if (code === 0) return { label: 'Clear', condition: 'clear' };
  if (code >= 1 && code <= 3) return { label: 'Partly Cloudy', condition: 'cloudy' };
  if (code === 45 || code === 48) return { label: 'Foggy', condition: 'fog' };
  if (code >= 51 && code <= 67) return { label: 'Rain', condition: 'rain' };
  if (code >= 71 && code <= 77) return { label: 'Snow', condition: 'snow' };
  if (code >= 80 && code <= 82) return { label: 'Showers', condition: 'rain' };
  if (code >= 95) return { label: 'Thunderstorm', condition: 'storm' };
  return { label: 'Clear', condition: 'clear' };
}

function getFallbackLocation() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London';
    const parts = tz.split('/');
    const city = parts[parts.length - 1].replace(/_/g, ' ');

    // Typical default coordinates for primary major timezones
    const coordsMap = {
      London: { lat: 51.5074, lon: -0.1278 },
      New_York: { lat: 40.7128, lon: -74.006 },
      Los_Angeles: { lat: 34.0522, lon: -118.2437 },
      Chicago: { lat: 41.8781, lon: -87.6298 },
      Paris: { lat: 48.8566, lon: 2.3522 },
      Berlin: { lat: 52.52, lon: 13.405 },
      Tokyo: { lat: 35.6762, lon: 139.6503 },
      Singapore: { lat: 1.3521, lon: 103.8198 },
      Sydney: { lat: -33.8688, lon: 151.2093 },
      Lagos: { lat: 6.5244, lon: 3.3792 },
      Johannesburg: { lat: -26.2041, lon: 28.0473 },
      Dubai: { lat: 25.2048, lon: 55.2708 },
    };

    const cleanKey = parts[parts.length - 1];
    const coords = coordsMap[cleanKey] || { lat: 51.5074, lon: -0.1278 };
    return { city, lat: coords.lat, lon: coords.lon };
  } catch {
    return { city: 'London', lat: 51.5074, lon: -0.1278 };
  }
}

export function useWeather() {
  const [weather, setWeather] = useState(() => {
    try {
      const cached = localStorage.getItem(WEATHER_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          return parsed.data;
        }
      }
    } catch {
      // ignore
    }
    return {
      temperature: null,
      tempText: '--°C',
      label: 'Locating...',
      condition: 'clear',
      city: 'Local',
      humidity: null,
      windSpeed: null,
      loading: true,
    };
  });

  useEffect(() => {
    let isMounted = true;

    const fetchForecast = async (lat, lon, cityName) => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;
        const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
        if (!res.ok) throw new Error('Weather fetch failed');
        const data = await res.json();
        const cur = data.current || {};
        const temp = Math.round(cur.temperature_2m ?? 20);
        const { label, condition } = mapWeatherCode(cur.weather_code ?? 0);

        const weatherData = {
          temperature: temp,
          tempText: `${temp}°C`,
          label,
          condition,
          city: cityName,
          humidity: cur.relative_humidity_2m,
          windSpeed: cur.wind_speed_10m,
          loading: false,
        };

        if (isMounted) {
          setWeather(weatherData);
          try {
            localStorage.setItem(
              WEATHER_CACHE_KEY,
              JSON.stringify({ timestamp: Date.now(), data: weatherData })
            );
          } catch {
            // ignore
          }
        }
      } catch (err) {
        if (isMounted) {
          setWeather(prev => ({
            ...prev,
            tempText: prev.temperature !== null ? `${prev.temperature}°C` : '21°C',
            loading: false,
            label: prev.label || 'Clear',
          }));
        }
      }
    };

    const resolveCoordsAndFetch = async () => {
      const fallback = getFallbackLocation();

      /*
       * Never call getCurrentPosition() unprompted.
       *
       * Two reasons: Chrome logs "[Violation] Only request geolocation
       * information in response to a user gesture", and an unsolicited
       * permission prompt on boot is hostile. The timezone fallback is good
       * enough to render immediately; precise coordinates are only requested
       * when permission has ALREADY been granted.
       */
      const hasGeo = typeof navigator !== 'undefined' && !!navigator.geolocation;

      let granted = false;
      try {
        if (hasGeo && navigator.permissions?.query) {
          const status = await navigator.permissions.query({ name: 'geolocation' });
          granted = status.state === 'granted';
        }
      } catch {
        granted = false;   // Permissions API unavailable — treat as not granted
      }

      if (hasGeo && granted) {
        navigator.geolocation.getCurrentPosition(
          (pos) => fetchForecast(pos.coords.latitude, pos.coords.longitude, fallback.city),
          () => fetchForecast(fallback.lat, fallback.lon, fallback.city),
          { timeout: 4000 }
        );
        return;
      }

      fetchForecast(fallback.lat, fallback.lon, fallback.city);
    };

    resolveCoordsAndFetch();

    // Refresh every 30 minutes
    const interval = setInterval(resolveCoordsAndFetch, CACHE_TTL_MS);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return weather;
}
