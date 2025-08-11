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
    
    // Improve address by adding common street suffixes if missing
    let improvedAddress = address.trim();
    
    // Common abbreviations to expand
    const streetAbbreviations: Record<string, string> = {
      ' Ti': ' Street',
      'Mcallister': 'McAllister',
      'South Van Ness': 'South Van Ness Avenue',
      'Sgt John V Young': 'Sergeant John V Young Lane',
      'Portway': 'Portway Drive',
      'Frida Kahlo': 'Frida Kahlo Way',
      'Carroll': 'Carroll Avenue',
      'Wallace': 'Wallace Avenue',
      'Divisadero': 'Divisadero Street',
      'California': 'California Street',
      'Sacramento': 'Sacramento Street',
      'Market': 'Market Street',
      'Sutter': 'Sutter Street',
      'Mariposa': 'Mariposa Street',
      'Golden Gate': 'Golden Gate Avenue',
      'Columbus': 'Columbus Avenue',
      'Howard': 'Howard Street',
      'Mission': 'Mission Street',
      'Woolsey': 'Woolsey Street',
      'Pacific': 'Pacific Avenue',
      'Cesar Chavez': 'Cesar Chavez Street',
      'Lane': 'Lane Street',
      'Revere': 'Revere Avenue',
      'Maryland': 'Maryland Street',
      'Vidal': 'Vidal Drive',
      'Pine': 'Pine Street',
      'Arballo': 'Arballo Drive',
      'Harriet': 'Harriet Street',
      'Fulton': 'Fulton Street',
      'Van Ness': 'Van Ness Avenue'
    };
    
    // Apply improvements
    for (const [abbr, full] of Object.entries(streetAbbreviations)) {
      if (improvedAddress.includes(abbr) && !improvedAddress.includes(full)) {
        improvedAddress = improvedAddress.replace(abbr, full);
      }
    }
    
    // Skip addresses that are clearly invalid
    if (improvedAddress.includes('0 Situs To Be Assigned')) {
      return null;
    }
    
    const encodedAddress = encodeURIComponent(improvedAddress);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Geocoding API error: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.warn(`No geocoding results for address: ${improvedAddress} (original: ${address})`);
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
