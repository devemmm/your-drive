/**
 * Google Maps custom style used when the app is in dark mode. Mirrors Google's
 * recommended "Night mode" sample (Maps Platform docs) with our background hue
 * lined up to colors.background so the map blends into the rest of the UI.
 *
 * Pass to <MapView customMapStyle={...} /> only when resolved theme is "dark".
 */
export const mapStyleDark = [
  { elementType: "geometry", stylers: [{ color: "#1d2330" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8b93a7" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1d2330" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#c2c9d6" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8b93a7" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#1f3a2e" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6cdba6" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2a3142" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212635" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ec0ff" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3a4358" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212635" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#cfd5e3" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2a3142" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#cfd5e3" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0f1115" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4f8cff" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#0f1115" }],
  },
];
