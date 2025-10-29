/**
 * Geocoding Utilities
 * 
 * Convert GPS coordinates to human-readable addresses using Google Maps Geocoding API
 */

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export interface LocationAddress {
  formattedAddress: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  streetAddress?: string;
}

/**
 * Convert coordinates to a human-readable address
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<LocationAddress | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn("Google Maps API key not configured");
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "OK" && data.results && data.results.length > 0) {
      const result = data.results[0];
      
      // Extract address components
      const addressComponents = result.address_components || [];
      let city = "";
      let state = "";
      let country = "";
      let zipCode = "";
      let streetNumber = "";
      let route = "";

      addressComponents.forEach((component: any) => {
        const types = component.types;
        
        if (types.includes("locality")) {
          city = component.long_name;
        } else if (types.includes("administrative_area_level_1")) {
          state = component.short_name;
        } else if (types.includes("country")) {
          country = component.long_name;
        } else if (types.includes("postal_code")) {
          zipCode = component.long_name;
        } else if (types.includes("street_number")) {
          streetNumber = component.long_name;
        } else if (types.includes("route")) {
          route = component.long_name;
        }
      });

      const streetAddress = `${streetNumber} ${route}`.trim();

      return {
        formattedAddress: result.formatted_address,
        city,
        state,
        country,
        zipCode,
        streetAddress,
      };
    }

    console.warn("No geocoding results found");
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

/**
 * Get a short, readable location name (Street address or City, State)
 */
export async function getShortLocationName(
  latitude: number,
  longitude: number
): Promise<string> {
  const address = await reverseGeocode(latitude, longitude);
  
  if (!address) {
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }

  // Priority 1: Street address (e.g., "123 Main St")
  if (address.streetAddress && address.streetAddress.trim().length > 0) {
    // Return street address with city if available
    if (address.city) {
      return `${address.streetAddress}, ${address.city}`;
    }
    return address.streetAddress;
  }

  // Priority 2: City, State
  if (address.city && address.state) {
    return `${address.city}, ${address.state}`;
  } else if (address.city) {
    return address.city;
  }

  // Priority 3: First two parts of formatted address (most specific)
  const parts = address.formattedAddress.split(",").map(p => p.trim());
  if (parts.length >= 2) {
    return `${parts[0]}, ${parts[1]}`;
  }
  
  return parts[0] || address.formattedAddress;
}

/**
 * Batch geocode multiple locations (with caching to avoid duplicate requests)
 */
const geocodeCache = new Map<string, LocationAddress>();

export async function batchReverseGeocode(
  locations: Array<{ latitude: number; longitude: number }>
): Promise<Array<LocationAddress | null>> {
  const results: Array<LocationAddress | null> = [];

  for (const location of locations) {
    const cacheKey = `${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`;
    
    // Check cache first
    if (geocodeCache.has(cacheKey)) {
      results.push(geocodeCache.get(cacheKey)!);
      continue;
    }

    // Fetch from API
    const address = await reverseGeocode(location.latitude, location.longitude);
    
    // Cache the result
    if (address) {
      geocodeCache.set(cacheKey, address);
    }
    
    results.push(address);
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Clear geocoding cache
 */
export function clearGeocodeCache(): void {
  geocodeCache.clear();
}

