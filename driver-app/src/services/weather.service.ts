import * as Location from 'expo-location';

export interface WeatherData {
  city: string;
  country: string;
  temp: number | string;
  condition: string;
  dateStr: string;
  iconName: 'sunny' | 'partly-sunny' | 'cloudy' | 'rainy' | 'thunderstorm';
}

// In-memory cache
let cachedWeather: { data: WeatherData; timestamp: number; key: string } | null = null;
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

function getWeatherCondition(code: number): { condition: string; iconName: WeatherData['iconName'] } {
  // WMO Weather interpretation codes (WW)
  if (code === 0) return { condition: 'Clear Sky', iconName: 'sunny' };
  if (code === 1 || code === 2) return { condition: 'Partly Cloudy', iconName: 'partly-sunny' };
  if (code === 3) return { condition: 'Overcast', iconName: 'cloudy' };
  if (code >= 45 && code <= 48) return { condition: 'Foggy', iconName: 'cloudy' };
  if (code >= 51 && code <= 67) return { condition: 'Rainy', iconName: 'rainy' };
  if (code >= 80 && code <= 82) return { condition: 'Heavy Rain', iconName: 'rainy' };
  if (code >= 95) return { condition: 'Thunderstorm', iconName: 'thunderstorm' };
  return { condition: 'Clear', iconName: 'sunny' };
}

export async function fetchCurrentWeather(
  lat?: number | null,
  lng?: number | null,
  forceRefresh: boolean = false
): Promise<WeatherData> {
  const todayDate = new Date();
  const dateStr = todayDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  let latitude: number | null = lat ?? null;
  let longitude: number | null = lng ?? null;

  // Try reading active device GPS if lat/lng are not provided
  if (latitude == null || longitude == null) {
    try {
      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.granted) {
        const currentLoc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (currentLoc?.coords) {
          latitude = currentLoc.coords.latitude;
          longitude = currentLoc.coords.longitude;
        }
      } else {
        const req = await Location.requestForegroundPermissionsAsync();
        if (req.granted) {
          const currentLoc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (currentLoc?.coords) {
            latitude = currentLoc.coords.latitude;
            longitude = currentLoc.coords.longitude;
          }
        }
      }
    } catch (e) {
      console.warn('[WeatherService] Unable to acquire location permissions/GPS:', e);
    }
  }

  // If GPS permission is denied or coordinates unavailable, display Location unavailable error
  if (latitude == null || longitude == null) {
    return {
      city: 'Location unavailable',
      country: 'Enable Location Services',
      temp: '--',
      condition: 'GPS Required',
      dateStr,
      iconName: 'cloudy',
    };
  }

  const cacheKey = `${latitude.toFixed(2)}_${longitude.toFixed(2)}`;

  // Return cached weather if valid and not force-refreshed
  if (!forceRefresh && cachedWeather && cachedWeather.key === cacheKey && Date.now() - cachedWeather.timestamp < CACHE_DURATION_MS) {
    return cachedWeather.data;
  }

  let city = 'Current Location';
  let country = 'India';
  let temp: number | string = 27;
  let condition = 'Sunny';
  let iconName: WeatherData['iconName'] = 'sunny';

  try {
    // 1. Fetch current weather from Open-Meteo for exact driver coordinates
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
    );
    if (weatherRes.ok) {
      const weatherJson = await weatherRes.json();
      if (weatherJson?.current_weather) {
        temp = Math.round(weatherJson.current_weather.temperature);
        const code = weatherJson.current_weather.weathercode ?? 0;
        const mapped = getWeatherCondition(code);
        condition = mapped.condition;
        iconName = mapped.iconName;
      }
    }

    // 2. Reverse-geocode driver's exact coordinates to fetch real City & Country
    const geoRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );
    if (geoRes.ok) {
      const geoJson = await geoRes.json();
      const rawCity = geoJson.locality || geoJson.city || geoJson.principalSubdivision || 'Current Location';
      const rawState = geoJson.principalSubdivision ? `, ${geoJson.principalSubdivision}` : '';
      city = `${rawCity}${rawState}`;
      country = geoJson.countryName || 'India';
    }
  } catch (err) {
    console.warn('[WeatherService] Error fetching weather for driver location:', err);
  }

  const result: WeatherData = {
    city,
    country,
    temp,
    condition,
    dateStr,
    iconName,
  };

  cachedWeather = {
    data: result,
    timestamp: Date.now(),
    key: cacheKey,
  };

  return result;
}
