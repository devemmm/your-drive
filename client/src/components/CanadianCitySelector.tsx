import React, { useState, useRef, useEffect } from "react";
import { MapPin, X, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { normalizeName } from "@/lib/utils";
import { RWANDAN_CITIES, CANADIAN_CITIES, PROVINCE_NAMES } from "@/constants";

// Helper to convert province name to code
const getProvinceCode = (provinceName: string): string => {
  const normalized = provinceName.trim();
  for (const [code, name] of Object.entries(PROVINCE_NAMES)) {
    if (name.toLowerCase() === normalized.toLowerCase()) {
      return code;
    }
  }
  // If it's already a code, return it
  if (PROVINCE_NAMES[normalized.toUpperCase()]) {
    return normalized.toUpperCase();
  }
  return normalized;
};

interface City {
  name: string;
  province: string;
}

interface CanadianCitySelectorProps {
  value: City | null;
  onChange: (city: City | null) => void;
  placeholder: string;
  label: string;
  googleReady: boolean;
  className?: string;
}

export const CanadianCitySelector: React.FC<CanadianCitySelectorProps> = ({
  value,
  onChange,
  placeholder,
  label,
  className = "",
  googleReady,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const { t } = useTranslation();

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!googleReady || !window.google || !inputRef.current) return;

    if (autocompleteRef.current) return;

    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current!,
      {
        types: ["(cities)"],
        componentRestrictions: { country: "rw" }, // Rwanda only
      },
    );

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace();
      if (!place?.geometry?.location) return;

      const addressComponents = place.address_components || [];

      const getComponent = (types: string[]) =>
        addressComponents.find((c) => types.some((t) => c.types.includes(t)))
          ?.long_name || "";

      const cityName =
        getComponent(["locality"]) ||
        getComponent(["administrative_area_level_2"]) ||
        place.name ||
        "";

      const province = getComponent(["administrative_area_level_1"]) || "";

      if (cityName && province) {
        const selectedCity: any = {
          name: cityName,
          province: province,
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng(),
          locationName: place.formatted_address || place.name || "",
        };

        handleSelect(selectedCity);
      }
    });
  }, [googleReady, inputRef.current]);

  // Fetch suggestions from Google Places API with fallback to static list
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      if (!searchTerm.trim()) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);

      // Fallback function to use static city list
      const fallbackToStaticCityList = () => {
        const searchLower = searchTerm.toLowerCase().trim();
        const filtered = RWANDAN_CITIES.filter((city) => {
          const cityName = city.name.toLowerCase();
          const provinceName =
            PROVINCE_NAMES[city.province]?.toLowerCase() || "";
          const provinceCode = city.province.toLowerCase();

          return (
            cityName.includes(searchLower) ||
            provinceName.includes(searchLower) ||
            provinceCode.includes(searchLower) ||
            `${cityName}, ${provinceName}`.includes(searchLower)
          );
        }).slice(0, 10); // Limit to 10 results

        setSuggestions(filtered);
        setIsLoading(false);
      };

      // Try Google Places API if available
      if (googleReady && window.google) {
        try {
          const service = new google.maps.places.AutocompleteService();

          service.getPlacePredictions(
            {
              input: searchTerm,
              componentRestrictions: { country: "rw" },
              types: ["(cities)"],
            },
            (predictions, status) => {
              if (
                status === google.maps.places.PlacesServiceStatus.OK &&
                predictions
              ) {
                const cities: City[] = predictions
                  .map((prediction) => {
                    // Extract city and province from description
                    // Format is usually "City, Province, Rwanda"
                    const parts = prediction.description.split(", ");
                    const cityName = parts[0];
                    const provinceName = parts[1] || "";
                    const provinceCode = getProvinceCode(provinceName);

                    return {
                      name: cityName,
                      province: provinceCode,
                      locationName: prediction.description,
                    };
                  })
                  .filter((city) => city.name && city.province); // Filter out invalid entries

                setSuggestions(cities);
                setIsLoading(false);
              } else {
                // API failed, use static list as fallback
                fallbackToStaticCityList();
              }
            },
          );
        } catch (error) {
          console.error(
            "Error fetching city suggestions from Google API:",
            error,
          );
          // Use static list as fallback
          fallbackToStaticCityList();
        }
      } else {
        // Google API not ready, use static list
        fallbackToStaticCityList();
      }
    };

    // Debounce the API calls
    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, googleReady]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm, suggestions]);

  // Reset search term when value changes externally
  useEffect(() => {
    if (!value) {
      setSearchTerm("");
    }
  }, [value]);

  const handleSelect = (city: City) => {
    onChange(city);
    setIsOpen(false);
    setSearchTerm("");
    setSuggestions([]);
  };

  const handleClear = () => {
    onChange(null);
    setSearchTerm("");
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown") {
        setIsOpen(true);
        return;
      }
    }

    if (isOpen) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (suggestions[highlightedIndex]) {
            handleSelect(suggestions[highlightedIndex]);
          }
          break;
        case "Escape":
          setIsOpen(false);
          setSuggestions([]);
          break;
      }
    }
  };

  const displayValue = value
    ? `${value.name}, ${PROVINCE_NAMES[value.province] || value.province}`
    : "";

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <MapPin className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        </div>
        <input
          ref={inputRef}
          type="text"
          className="block w-full pl-12 pr-12 py-4 border-2 border-gray-300 dark:border-gray-600  shadow-sm focus:outline-none focus:ring-2 focus:ring-[#30BFDD] focus:border-[#30BFDD] bg-white dark:bg-gray-700 dark:text-white transition-all duration-300 hover:border-gray-400 dark:hover:border-gray-500"
          placeholder={placeholder}
          value={searchTerm || displayValue}
          onChange={(e) => {
            const newValue = e.target.value;
            setSearchTerm(newValue);
            if (!isOpen && newValue.trim()) setIsOpen(true);
          }}
          onFocus={() => {
            if (searchTerm.trim() && suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
        />

        {/* Clear button */}
        {(value || searchTerm) && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-8 flex items-center pr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Dropdown arrow */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600  shadow-lg max-h-60 overflow-auto"
          style={{
            zIndex: 9999,
          }}
        >
          {isLoading ? (
            <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-center">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#30BFDD]"></div>
                <span>Searching cities...</span>
              </div>
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((city: any, index) => (
              <button
                key={`${city.name}-${city.province}-${index}`}
                type="button"
                className={`w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  index === highlightedIndex
                    ? "bg-gray-100 dark:bg-gray-700"
                    : ""
                } ${
                  value?.name === city.name && value?.province === city.province
                    ? "bg-green-50 dark:bg-green-900/20"
                    : ""
                }`}
                onClick={() => handleSelect(city)}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <span className="font-medium text-gray-900 dark:text-white block">
                      {city.name},{" "}
                      {PROVINCE_NAMES[city.province] || city.province}
                    </span>
                    {city.locationName &&
                      city.locationName !==
                        `${city.name}, ${city.province}` && (
                        <span className="text-sm text-gray-500 dark:text-gray-400 block mt-1">
                          {city.locationName}
                        </span>
                      )}
                  </div>
                  {value?.name === city.name &&
                    value?.province === city.province && (
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    )}
                </div>
              </button>
            ))
          ) : searchTerm.trim() ? (
            <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-center">
              {t("general.noResults", "No cities found")}
            </div>
          ) : (
            <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-center">
              Start typing to search for Rwandan cities...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Verify if a location is within a selected Rwandan city using Google Geocoding API
 */
export async function verifyLocationInCity(
  location: any,
  selectedCity: any,
  googleReady: boolean,
): Promise<boolean> {
  if (!googleReady || !window.google) {
    throw new Error("Google Maps API not ready");
  }

  // console.log("Verifying location:", location, "against city:", selectedCity);

  // If no location or no city selected, no mismatch (return true = no issue)
  if (!location || !selectedCity) {
    return true;
  }

  // Handle case where selectedCity is just a string (city name)
  let cityName: string;
  let provinceName: string;

  if (typeof selectedCity === "string") {
    cityName = selectedCity;
    provinceName = "";
  } else {
    cityName = selectedCity.name || "";
    provinceName = selectedCity.province || "";
  }

  // Construct search query from location - use the full location data
  const searchQuery = [
    location.address,
    location.city,
    location.locationName,
    location.region,
  ]
    .filter(Boolean)
    .join(", ");

  if (!searchQuery.trim()) {
    return true; // No location to verify
  }

  return new Promise((resolve, reject) => {
    const geocoder = new google.maps.Geocoder();

    geocoder.geocode(
      {
        address: searchQuery,
        componentRestrictions: { country: "rw" },
      },
      (results, status) => {
        // console.log("Geocoding results:", results, "Status:", status);

        if (
          status !== google.maps.GeocoderStatus.OK ||
          !results ||
          results.length === 0
        ) {
          // console.log("Geocoding failed with status:", status);
          resolve(false);
          return;
        }

        const result = results[0];
        const addressComponents = result.address_components || [];

        // console.log("Address components:", addressComponents);

        // Extract city and province from geocoding result
        const extractedCity = getAddressComponent(addressComponents, [
          "locality",
          "administrative_area_level_2",
        ]);
        const extractedProvince = getAddressComponent(addressComponents, [
          "administrative_area_level_1",
        ]);

        // Normalize names for comparison
        const normalizedSelectedCity = normalizeName(cityName);
        const normalizedSelectedProvince = normalizeName(provinceName);
        const normalizedExtractedCity = normalizeName(extractedCity);
        const normalizedExtractedProvince = normalizeName(extractedProvince);

        let isInCity = false;

        // METHOD 1: Direct city name matching from geocoded result
        if (normalizedExtractedCity && normalizedSelectedCity) {
          if (normalizedExtractedCity === normalizedSelectedCity) {
            isInCity = true;
          } else if (
            normalizedExtractedCity.includes(normalizedSelectedCity) ||
            normalizedSelectedCity.includes(normalizedExtractedCity)
          ) {
            isInCity = true;
          }
        }

        // METHOD 2: Enhanced check for original location data
        if (!isInCity) {
          const locationName = normalizeName(location.locationName || "");
          const locationAddress = normalizeName(location.address || "");
          const locationCity = normalizeName(location.city || "");
          const city = normalizeName(normalizedSelectedCity);

          const containsCityName = (text: string, city: string): boolean => {
            if (!text || !city) return false;
            return text.includes(city);
          };

          if (
            containsCityName(locationName, city) ||
            containsCityName(locationAddress, city) ||
            containsCityName(locationCity, city)
          ) {
            isInCity = true;
          }
        }

        // METHOD 3: Check geocoded formatted address
        if (!isInCity) {
          const formattedAddress =
            result.formatted_address?.toLowerCase() || "";
          const searchQueryLower = searchQuery.toLowerCase();

          if (
            formattedAddress.includes(normalizedSelectedCity) ||
            searchQueryLower.includes(normalizedSelectedCity)
          ) {
            isInCity = true;
            // console.log("Match found in formatted address or search query");
          }
        }

        // METHOD 4: Check administrative areas and regional relationships
        if (!isInCity) {
          const administrativeArea = getAddressComponent(addressComponents, [
            "administrative_area_level_2",
            "administrative_area_level_1",
          ]);
          const normalizedAdminArea = normalizeName(administrativeArea);

          if (
            normalizedAdminArea.includes(normalizedSelectedCity) ||
            normalizedSelectedCity.includes(normalizedAdminArea)
          ) {
            isInCity = true;
            // console.log("Match found in administrative area");
          }
        }

        // METHOD 5: Same province leniency (for nearby cities)
        if (
          !isInCity &&
          normalizedSelectedProvince &&
          areProvincesEquivalent(
            normalizedExtractedProvince,
            normalizedSelectedProvince,
          )
        ) {
          // For ride-sharing, if it's in the same province, be more accepting
          // especially for smaller towns near the main city
          isInCity = true;
        }
        resolve(isInCity);
      },
    );
  });
}

// Enhanced helper function to get address components
const getAddressComponent = (components: any[], types: string[]): string => {
  for (const type of types) {
    const component = components.find((c) => c.types.includes(type));
    if (component) {
      return component.long_name;
    }
  }
  return "";
};

const areProvincesEquivalent = (
  province1: string,
  province2: string,
): boolean => {
  const provinceMap: { [key: string]: string[] } = {
    ontario: ["on", "ont", "ontario"],
    quebec: ["qc", "que", "quebec"],
    "british columbia": ["bc", "b c", "british columbia"],
    alberta: ["ab", "alta", "alberta"],
    manitoba: ["mb", "man", "manitoba"],
    saskatchewan: ["sk", "sask", "saskatchewan"],
    "nova scotia": ["ns", "n s", "nova scotia"],
    "new brunswick": ["nb", "n b", "new brunswick"],
    "newfoundland and labrador": ["nl", "nld", "newfoundland", "labrador"],
    "prince edward island": ["pe", "p e", "pei", "prince edward island"],
    "northwest territories": ["nt", "nwt", "northwest territories"],
    nunavut: ["nu", "nunavut"],
    yukon: ["yt", "yuk", "yukon"],
  };

  const normalized1 = normalizeName(province1);
  const normalized2 = normalizeName(province2);

  // Direct match
  if (normalized1 === normalized2) return true;

  // Check if both map to the same province group
  for (const [canonical, variants] of Object.entries(provinceMap)) {
    if (variants.includes(normalized1) && variants.includes(normalized2)) {
      return true;
    }
  }

  return false;
};
