/**
 * Weather data provider interface
 * 
 * This module defines the interface for weather services and provides
 * a mock implementation. Real implementations can be added for:
 * - OpenWeatherMap
 * - WeatherAPI
 * - NOAA
 */

// ============================================================================
// Types
// ============================================================================

export interface WeatherCondition {
  timestamp: Date;
  condition: 'clear' | 'rain' | 'snow' | 'ice' | 'fog' | 'other';
  temperature_c?: number;
  precipitation_mm?: number;
  visibility_m?: number;
}

export interface WeatherRequest {
  lat: number;
  lon: number;
  start_time: Date;
  end_time: Date;
}

// ============================================================================
// Interface
// ============================================================================

export interface WeatherProvider {
  /**
   * Get historical weather conditions for a time range and location
   */
  getHistoricalWeather(request: WeatherRequest): Promise<WeatherCondition[]>;
}

// ============================================================================
// Mock Implementation
// ============================================================================

/**
 * Mock weather provider for testing and development
 * Returns clear weather by default
 * 
 * TODO: Replace with real implementation using:
 * - OpenWeatherMap: https://openweathermap.org/api/one-call-3
 * - WeatherAPI: https://www.weatherapi.com/docs/
 * - NOAA: https://www.weather.gov/documentation/services-web-api
 */
export class MockWeatherProvider implements WeatherProvider {
  async getHistoricalWeather(
    request: WeatherRequest,
  ): Promise<WeatherCondition[]> {
    // Mock: return clear weather for the entire period
    return [{
      timestamp: request.start_time,
      condition: 'clear',
      temperature_c: 20,
      precipitation_mm: 0,
      visibility_m: 10000,
    }];
  }
}

// ============================================================================
// Real Provider Implementations (TODO)
// ============================================================================

/**
 * TODO: OpenWeatherMap implementation
 * 
 * Required environment variables:
 * - OPENWEATHER_API_KEY
 * 
 * Implementation notes:
 * - Use One Call API 3.0 for historical data
 * - Historical data may require a paid plan
 * - Handle rate limiting
 * 
 * Reference: https://openweathermap.org/api/one-call-3
 */
export class OpenWeatherMapProvider implements WeatherProvider {
  constructor(private apiKey: string) {}

  async getHistoricalWeather(
    _request: WeatherRequest,
  ): Promise<WeatherCondition[]> {
    throw new Error(
      'OpenWeatherMapProvider not implemented. Set up OpenWeatherMap API key.',
    );
    // TODO: Implement using OpenWeatherMap API
  }
}

/**
 * TODO: WeatherAPI.com implementation
 * 
 * Required environment variables:
 * - WEATHERAPI_KEY
 * 
 * Implementation notes:
 * - Use History API for past weather data
 * - Free tier allows 7 days of history
 * 
 * Reference: https://www.weatherapi.com/docs/
 */
export class WeatherAPIProvider implements WeatherProvider {
  constructor(private apiKey: string) {}

  async getHistoricalWeather(
    _request: WeatherRequest,
  ): Promise<WeatherCondition[]> {
    throw new Error(
      'WeatherAPIProvider not implemented. Set up WeatherAPI key.',
    );
    // TODO: Implement using WeatherAPI
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a weather provider based on environment configuration
 * Falls back to MockWeatherProvider if no real provider is configured
 */
export function createWeatherProvider(): WeatherProvider {
  const openWeatherKey = Deno.env.get('OPENWEATHER_API_KEY');
  const weatherApiKey = Deno.env.get('WEATHERAPI_KEY');

  if (openWeatherKey) {
    console.log('Using OpenWeatherMap provider');
    return new OpenWeatherMapProvider(openWeatherKey);
  }

  if (weatherApiKey) {
    console.log('Using WeatherAPI provider');
    return new WeatherAPIProvider(weatherApiKey);
  }

  console.warn('No weather provider configured, using mock provider');
  return new MockWeatherProvider();
}

// ============================================================================
// Helper: Calculate weather penalty minutes
// ============================================================================

/**
 * Calculate weather penalty minutes based on weather conditions
 * Rain: +0.5x minutes, Snow/Ice: +1x minutes
 */
export function calculateWeatherPenalty(
  weatherConditions: WeatherCondition[],
  tripDurationMinutes: number,
): number {
  if (weatherConditions.length === 0) return 0;

  let penaltyMinutes = 0;

  for (const condition of weatherConditions) {
    switch (condition.condition) {
      case 'rain':
        penaltyMinutes += tripDurationMinutes * 0.5;
        break;
      case 'snow':
      case 'ice':
        penaltyMinutes += tripDurationMinutes * 1.0;
        break;
      case 'fog':
        penaltyMinutes += tripDurationMinutes * 0.3;
        break;
      default:
        // Clear or other: no penalty
        break;
    }
  }

  return penaltyMinutes;
}

/**
 * Get dominant weather condition from a list
 */
export function getDominantWeatherCondition(
  weatherConditions: WeatherCondition[],
): string {
  if (weatherConditions.length === 0) return 'unknown';

  const counts: Record<string, number> = {};
  for (const condition of weatherConditions) {
    counts[condition.condition] = (counts[condition.condition] || 0) + 1;
  }

  let maxCount = 0;
  let dominant = 'clear';
  for (const [condition, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      dominant = condition;
    }
  }

  return dominant;
}



