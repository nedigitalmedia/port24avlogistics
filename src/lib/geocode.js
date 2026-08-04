/**
 * Free address lookup (Nominatim/OpenStreetMap, no key required) and drive
 * distance (OpenRouteService, free key required) — no Google Maps billing.
 */

// Nominatim usage policy: identify the app, keep request volume light (callers
// should debounce), max ~1 req/sec.
const NOMINATIM_HEADERS = { 'Accept-Language': 'en' };

/** Search for an address. Returns up to 5 candidates. */
export async function searchAddress(query) {
  const q = query?.trim();
  if (!q || q.length < 3) return [];

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=us,ca&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: NOMINATIM_HEADERS });
  if (!res.ok) throw new Error('Address lookup failed');
  const results = await res.json();

  return results.map(r => {
    const a = r.address || {};
    return {
      label: r.display_name,
      address: [a.house_number, a.road].filter(Boolean).join(' ') || a.amenity || a.building || '',
      city: a.city || a.town || a.village || a.hamlet || '',
      state: a.state_code || a.state || '',
      zip: a.postcode || '',
      country: a.country_code ? a.country_code.toUpperCase() : '',
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
    };
  });
}

/** Geocode a single free-text address string to coordinates (best match). */
export async function geocodeAddress(addressText) {
  const results = await searchAddress(addressText);
  return results[0] || null;
}

/**
 * Drive distance/time between two {lat, lon} points via OpenRouteService.
 * Requires VITE_ORS_API_KEY — returns null if not configured.
 */
export async function getDriveDistance(origin, destination) {
  const apiKey = import.meta.env.VITE_ORS_API_KEY;
  if (!apiKey) return null;
  if (!origin || !destination) return null;

  const url = 'https://api.openrouteservice.org/v2/directions/driving-car';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      coordinates: [
        [origin.lon, origin.lat],
        [destination.lon, destination.lat],
      ],
    }),
  });
  if (!res.ok) throw new Error('Distance lookup failed');
  const data = await res.json();
  const summary = data?.routes?.[0]?.summary;
  if (!summary) return null;

  return {
    miles: summary.distance / 1609.34,
    minutes: summary.duration / 60,
  };
}

/** Google Maps search link for an address or lat/lon — no API key needed. */
export function googleMapsLink({ lat, lon, address }) {
  if (lat != null && lon != null) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || '')}`;
}
