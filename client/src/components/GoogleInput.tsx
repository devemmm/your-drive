import { useEffect, useRef } from "react";

interface GooglePlacesInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPlaceSelected: (data: {
    latitude: number;
    longitude: number;
    city: string;
    region: string;
    locationName: string;
    address?: string;
  }) => void;
  placeholder?: string;
  className?: string;
  googleReady: boolean; // ✅ new prop
}

const GooglePlacesInput: React.FC<GooglePlacesInputProps> = ({
  value,
  onChange,
  onPlaceSelected,
  placeholder = "Search for a location...",
  className = "",
  googleReady, // ✅ new prop
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!googleReady || !window.google || !inputRef.current) return;

    if (autocompleteRef.current) return;

    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current!,
      {
        componentRestrictions: { country: "rw" }, // ✅ Restrict to Rwanda only
      }
    );

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace();
      if (!place?.geometry?.location) return;

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

      const addressComponents = place.address_components || [];

      const getComponent = (types: string[]) =>
        addressComponents.find((c) => types.some((t) => c.types.includes(t)))
          ?.long_name || "";

      const city =
        getComponent(["locality"]) ||
        getComponent(["administrative_area_level_2"]);
      const region = getComponent(["administrative_area_level_1"]);

      const locationName = place.name || place.formatted_address || "";
      const address = place.formatted_address || place.name || "";

      onPlaceSelected({
        latitude: lat,
        longitude: lng,
        city,
        region,
        locationName,
        address,
      });
    });
  }, [googleReady, inputRef.current]);

  return (
    <div className="relative w-full">
      {/* <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"></div> */}
      <input
        ref={inputRef}
        type="text"
        className="w-full px-1 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

export default GooglePlacesInput;
