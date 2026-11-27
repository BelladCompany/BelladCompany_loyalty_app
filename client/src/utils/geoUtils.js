/**
 * geoUtils.js
 * Geolocation & Territory Resolution Engine for Bellad & Company Dealerships
 * Computes closest Bellad dealership hub via Haversine distance without third-party paid APIs.
 */

export const BELLAD_CITY_HUBS = [
  {
    id: 'Bangalore',
    name: 'Bangalore',
    displayName: 'Bangalore',
    areaDesc: 'Sarjapur, Bommasandra, Electronic City',
    lat: 12.9716,
    lng: 77.5946,
    aliases: ['bangalore', 'bengaluru', 'sarjapur', 'bommasandra', 'electronic city', 'whitefield', 'hosur', 'attibele'],
  },
  {
    id: 'Hubli',
    name: 'Hubli',
    displayName: 'Hubli-Dharwad',
    areaDesc: 'Hubballi, Dharwad TRZ, Gokul Road, Gadag',
    lat: 15.3647,
    lng: 75.1240,
    aliases: ['hubli', 'hubballi', 'dharwad', 'gadag', 'haveri', 'dandeli', 'karwar'],
  },
  {
    id: 'Belgaum',
    name: 'Belgaum',
    displayName: 'Belgaum',
    areaDesc: 'Belagavi, Tilakwadi TRZ, Chikkodi',
    lat: 15.8497,
    lng: 74.4977,
    aliases: ['belgaum', 'belagavi', 'tilakwadi', 'chikkodi', 'gokak', 'khanapur', 'bailhongal', 'nipani'],
  },
  {
    id: 'Bellary',
    name: 'Bellary',
    displayName: 'Bellary-Hospet',
    areaDesc: 'Ballari, Hospet, Koppal, Gangavathi',
    lat: 15.1394,
    lng: 76.9214,
    aliases: ['bellary', 'ballari', 'hospet', 'hosapete', 'koppal', 'gangavathi', 'sandur'],
  },
  {
    id: 'Gulbarga',
    name: 'Gulbarga',
    displayName: 'Gulbarga-Raichur',
    areaDesc: 'Kalaburagi, Raichur, Sindhnoor',
    lat: 17.3297,
    lng: 76.8343,
    aliases: ['gulbarga', 'kalaburagi', 'raichur', 'sindhnoor', 'sindhanur', 'yadgir'],
  },
];

const STORAGE_KEY_DETECTED_CITY = 'bellad_detected_city';
const STORAGE_KEY_PROMPT_DISMISSED = 'bellad_location_prompt_dismissed';

/**
 * Calculates great-circle distance between two points in km (Haversine formula).
 */
export function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Resolves user GPS coordinates to the nearest Bellad dealership hub.
 * @param {number} userLat
 * @param {number} userLng
 * @param {number} maxRadiusKm default 120km
 * @returns {{ hub: object, distanceKm: number, isDirectMatch: boolean }}
 */
export function resolveNearestBelladHub(userLat, userLng, maxRadiusKm = 120) {
  let nearest = null;
  let minDistance = Infinity;

  for (const hub of BELLAD_CITY_HUBS) {
    const dist = calculateHaversineDistanceKm(userLat, userLng, hub.lat, hub.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = hub;
    }
  }

  return {
    hub: nearest,
    distanceKm: Math.round(minDistance),
    isDirectMatch: minDistance <= maxRadiusKm,
  };
}

/**
 * Returns currently cached city or null
 */
export function getCachedUserCity() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_DETECTED_CITY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

/**
 * Saves user selected or detected city in session storage
 */
export function setCachedUserCity(cityObj) {
  try {
    sessionStorage.setItem(STORAGE_KEY_DETECTED_CITY, JSON.stringify(cityObj));
  } catch (_) {}
}

/**
 * Checks if location permission prompt was dismissed in this session
 */
export function isLocationPromptDismissed() {
  try {
    return sessionStorage.getItem(STORAGE_KEY_PROMPT_DISMISSED) === 'true';
  } catch (_) {
    return false;
  }
}

/**
 * Marks location permission prompt as dismissed
 */
export function setLocationPromptDismissed() {
  try {
    sessionStorage.setItem(STORAGE_KEY_PROMPT_DISMISSED, 'true');
  } catch (_) {}
}
