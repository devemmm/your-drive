// Approximate coordinates for major Rwandan cities — used as fallback until
// Google Places autocomplete is integrated (Phase 2C).

export interface CityInfo {
  city: string;
  region: string;
  latitude: number;
  longitude: number;
}

export const RWANDA_CITIES: Record<string, CityInfo> = {
  kigali: { city: "Kigali", region: "Kigali City", latitude: -1.9441, longitude: 30.0619 },
  musanze: { city: "Musanze", region: "Northern Province", latitude: -1.4995, longitude: 29.6349 },
  rubavu: { city: "Rubavu", region: "Western Province", latitude: -1.6777, longitude: 29.2664 },
  huye: { city: "Huye", region: "Southern Province", latitude: -2.5964, longitude: 29.7395 },
  butare: { city: "Huye", region: "Southern Province", latitude: -2.5964, longitude: 29.7395 },
  muhanga: { city: "Muhanga", region: "Southern Province", latitude: -2.0848, longitude: 29.7521 },
  nyanza: { city: "Nyanza", region: "Southern Province", latitude: -2.3511, longitude: 29.7508 },
  rwamagana: { city: "Rwamagana", region: "Eastern Province", latitude: -1.9489, longitude: 30.4342 },
  kayonza: { city: "Kayonza", region: "Eastern Province", latitude: -1.8835, longitude: 30.6188 },
  nyagatare: { city: "Nyagatare", region: "Eastern Province", latitude: -1.2979, longitude: 30.3271 },
  karongi: { city: "Karongi", region: "Western Province", latitude: -2.0605, longitude: 29.3488 },
  kibuye: { city: "Karongi", region: "Western Province", latitude: -2.0605, longitude: 29.3488 },
  nyamagabe: { city: "Nyamagabe", region: "Southern Province", latitude: -2.4729, longitude: 29.5594 },
  gisenyi: { city: "Rubavu", region: "Western Province", latitude: -1.6777, longitude: 29.2664 },
};

export function lookupCity(cityName: string): CityInfo {
  const key = cityName.trim().toLowerCase();
  if (RWANDA_CITIES[key]) return RWANDA_CITIES[key];
  // Default to Kigali coordinates if unknown
  return {
    city: cityName.trim() || "Kigali",
    region: "Kigali City",
    latitude: -1.9441,
    longitude: 30.0619,
  };
}
