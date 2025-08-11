interface GeocodeResult {
  lat: number;
  lng: number;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address || address.trim() === '') {
    return null;
  }

  try {
    // Use Google Geocoding API or similar service
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GEOCODING_API_KEY || 'your-geocoding-api-key';
    
    const encodedAddress = encodeURIComponent(address.trim());
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Geocoding API error: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.warn(`No geocoding results for address: ${address}`);
      return null;
    }
    
    const location = data.results[0].geometry.location;
    return {
      lat: location.lat,
      lng: location.lng
    };
    
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GEOCODING_API_KEY || 'your-geocoding-api-key';
    
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Reverse geocoding API error: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.warn(`No reverse geocoding results for coordinates: ${lat}, ${lng}`);
      return null;
    }
    
    return data.results[0].formatted_address;
    
  } catch (error) {
    console.error('Error reverse geocoding coordinates:', error);
    return null;
  }
}
