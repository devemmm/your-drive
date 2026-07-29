import { useState } from "react";
import { motion } from "framer-motion";
import { useJsApiLoader } from "@react-google-maps/api";
import { LIBRARIES } from "../Map";
import SearchComponent from "../SearchComponent";
import { useNavigate } from "react-router-dom";

export const RideForm = () => {
  const navigate = useNavigate();
  const [isInView, setIsInView] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchParams, setSearchParams] = useState({
    departureCity: "",
    destinationCity: "",
    departureTime: "",
    userLatitude: null,
    userLongitude: null,
    radiusKm: undefined,
  });

  const [filters, setFilters] = useState({
    minContribution: undefined,
    maxContribution: undefined,
    preferences: {
      smoking: false,
      pets: false,
      airConditioning: false,
      ladiesOnly: false,
      gentsOnly: false,
      bicycleSupport: false,
      snowTires: false,
      luggageSize: "NONE",
      luggageCount: 0,
    },
  });

  const [appliedFilters, setAppliedFilters] = useState({
    ...searchParams,
    ...filters,
    preferences: {
      ...filters.preferences,
    },
  });

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_API_KEY,
    libraries: LIBRARIES,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setSearchParams({ ...searchParams, [name]: value });
  };

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked =
      type === "checkbox"
        ? (e as React.ChangeEvent<HTMLInputElement>).target.checked
        : undefined;

    if (name === "minContribution" || name === "maxContribution") {
      setFilters({ ...filters, [name]: value });
      return;
    }

    if (name === "luggageSize" || name === "luggageCount") {
      setFilters({
        ...filters,
        preferences: {
          ...filters.preferences,
          [name]: type === "number" ? parseInt(value) : value,
        },
      });
      return;
    }

    if (name.startsWith("pref-")) {
      const prefKey = name.replace(
        "pref-",
        ""
      ) as keyof typeof filters.preferences;
      setFilters({
        ...filters,
        preferences: {
          ...filters.preferences,
          [prefKey]: checked,
        },
      });
      return;
    }

    if (Object.keys(filters.preferences).includes(name)) {
      setFilters({
        ...filters,
        preferences: {
          ...filters.preferences,
          [name]: checked,
        },
      });
    }
  };

  const handleSearch = () => {
    const filtersToSend = {
      ...searchParams,
      ...filters,
      preferences: {
        ...filters.preferences,
      },
    };

    const query = new URLSearchParams();

    Object.entries(filtersToSend).forEach(([key, value]) => {
      if (typeof value === "object" && value !== null) {
        Object.entries(value).forEach(([subKey, subValue]) => {
          query.append(`${key}.${subKey}`, subValue as any);
        });
      } else if (value !== undefined && value !== null && value !== "") {
        query.append(key, value);
      }
    });

    navigate(`/book-a-ride?${query.toString()}`);
  };

  return (
    <section className="relative py-24 px-6 bg-white">
      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-5xl md:text-6xl font-black text-black mb-6 leading-tight">
            Find Your Perfect Ride
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Search thousands of available rides and connect with drivers heading your way
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-gradient-to-br from-white to-green-50 border-2 border-green-200 p-8 sm:p-12 shadow-xl relative"
        >
          <div className="absolute top-4 right-4 w-32 h-32 opacity-10">
            <img
              src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=200&auto=format&fit=crop&q=80&ixlib=rb-4.1.0"
              alt="Ride illustration"
              className="w-full h-full object-contain"
            />
          </div>
          <SearchComponent
            handleFilterChange={handleFilterChange}
            handleChange={handleChange}
            searchParams={searchParams}
            setSearchParams={setSearchParams}
            isLoaded={isLoaded}
            setShowFilters={setShowFilters}
            showFilters={showFilters}
            filters={filters}
            setAppliedFilters={setAppliedFilters}
            handleSearch={handleSearch}
            home={true}
          />
        </motion.div>
      </div>
    </section>
  );
};
