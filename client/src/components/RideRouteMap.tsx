import {
  GoogleMap,
  Marker,
  Polyline,
  useJsApiLoader,
} from "@react-google-maps/api";
import { FC, useMemo } from "react";
import { useTheme } from "@/providers/ThemeProvider";
import { LIBRARIES } from "./Map";

const containerStyle = {
  width: "100%",
  height: "300px",
  borderRadius: "0.5rem",
};

type Location = {
  latitude: number;
  longitude: number;
  locationName?: string;
  city?: string;
  address?: string;
};

type RideRouteMapProps = {
  departure: Location;
  destination: Location;
  stopovers?: Location[];
};

const RideRouteMap: FC<RideRouteMapProps> = ({
  departure,
  destination,
  stopovers = [],
}) => {
  const { theme } = useTheme();

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_API_KEY,
    libraries: LIBRARIES,
  });

  const path = useMemo(() => {
    const points = [
      { lat: departure.latitude, lng: departure.longitude },
      ...stopovers.map((s) => ({
        lat: s.latitude,
        lng: s.longitude,
      })),
      { lat: destination.latitude, lng: destination.longitude },
    ];
    return points;
  }, [departure, destination, stopovers]);

  const center = useMemo(() => {
    return path[Math.floor(path.length / 2)];
  }, [path]);

  if (loadError) return <div>Error loading map</div>;
  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={6}
      options={{
        styles: theme === "dark" ? darkMapStyle : undefined,
        mapTypeControl: false,
        fullscreenControl: false,
      }}
    >
      {/* Departure Marker */}
      <Marker
        position={{ lat: departure.latitude, lng: departure.longitude }}
        label="A"
      />
      {/* Stopover Markers */}
      {stopovers.map((stop, index) => (
        <Marker
          key={index}
          position={{ lat: stop.latitude, lng: stop.longitude }}
          label={`${index + 1}`}
        />
      ))}
      {/* Destination Marker */}
      <Marker
        position={{ lat: destination.latitude, lng: destination.longitude }}
        label="B"
      />

      {/* Route Line */}
      <Polyline
        path={path}
        options={{
          strokeColor: "#1E90FF",
          strokeOpacity: 0.8,
          strokeWeight: 4,
        }}
      />
    </GoogleMap>
  );
};

export default RideRouteMap;

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];
