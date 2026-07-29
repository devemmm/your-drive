import React, { useEffect, useState } from "react";
import { FixedSizeList as List } from "react-window";

import { Combobox } from "@headlessui/react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useReactItems } from "@/lib/ReactTranslation";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

// Curated list of common car manufacturers for better reliability
const COMMON_MANUFACTURERS = [
  "Toyota",
  "Honda",
  "Ford",
  "Chevrolet",
  "Nissan",
  "BMW",
  "Mercedes-Benz",
  "Audi",
  "Volkswagen",
  "Hyundai",
  "Kia",
  "Mazda",
  "Subaru",
  "Lexus",
  "Acura",
  "Infiniti",
  "Buick",
  "Cadillac",
  "Chrysler",
  "Dodge",
  "Jeep",
  "Ram",
  "GMC",
  "Lincoln",
  "Porsche",
  "Ferrari",
  "Lamborghini",
  "McLaren",
  "Bentley",
  "Rolls-Royce",
  "Aston Martin",
  "Jaguar",
  "Land Rover",
  "Mini",
  "Fiat",
  "Alfa Romeo",
  "Maserati",
  "Tesla",
  "Rivian",
  "Lucid",
  "Polestar",
  "Genesis",
  "Volvo",
  "Saab",
  "Scion",
  "Saturn",
  "Pontiac",
  "Oldsmobile",
  "Plymouth",
  "Eagle",
  "Hummer",
  "Suzuki",
  "Mitsubishi",
  "Isuzu",
  "Daihatsu",
  "Smart",
  "Fisker",
  "Canoo",
  "Lordstown",
  "Nikola",
  "Arrival",
  "Bollinger",
  "Rimac",
  "Pininfarina",
  "Koenigsegg",
  "Pagani",
  "Bugatti",
  "Lotus",
  "Caterham",
  "Morgan",
  "Noble",
  "Ariel",
  "BAC",
  "McLaren",
  "Gordon Murray",
  "Rimac",
  "Pininfarina",
  "Koenigsegg",
  "Pagani",
  "Bugatti",
  "Lotus",
];

// Restricted list of manufacturers as provided by the user
const RESTRICTED_MANUFACTURERS = [
  "Acura",
  "Alfa Romeo",
  "Aston Martin",
  "Audi",
  "Bentley",
  "BMW",
  "Buick",
  "Cadillac",
  "Chevrolet",
  "Chrysler",
  "Citroen",
  "Daewoo",
  "Dodge",
  "Eagle",
  "Ferrari",
  "Fiat",
  "Fisker",
  "Ford",
  "GMC",
  "Honda",
  "Hummer",
  "Hyundai",
  "Infiniti",
  "Isuzu",
  "Jaguar",
  "Jeep",
  "Kia",
  "Lada",
  "Lamborghini",
  "Land Rover",
  "Lexus",
  "Lincoln",
  "Lotus",
  "Maserati",
  "Maybach",
  "Mazda",
  "Mercedes Benz",
  "Mercury",
  "Mini",
  "Mitsubishi",
  "Nissan",
  "Oldsmobile",
  "Opel",
  "Peugeot",
  "Plymouth",
  "Pontiac",
  "Porsche",
  "Renault",
  "Rolls Royce",
  "Saab",
  "Saturn",
  "Scion",
  "Smart",
  "Subaru",
  "Suzuki",
  "Tesla",
  "Toyota",
  "VinFast",
  "Volkswagen",
  "Volvo",
];

export function VehicleMakesSearchable({ value, onChange }) {
  const [makes, setMakes] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { t } = useReactItems();

  useEffect(() => {
    const fetchMakes = async () => {
      try {
        setLoading(true);
        setError(false);

        // Try to fetch from NHTSA API first
        const response = await fetch(
          "https://vpic.nhtsa.dot.gov/api/vehicles/GetAllMakes?format=json"
        );

        if (!response.ok) {
          throw new Error("Failed to fetch from NHTSA API");
        }

        const data = await response.json();

        if (data.Results && data.Results.length > 0) {
          // Filter out any invalid entries and sort alphabetically
          const validMakes = data.Results.filter(
            (make) => make.Make_Name && make.Make_Name.trim()
          ).sort((a, b) => a.Make_Name.localeCompare(b.Make_Name));

          setMakes(validMakes);
        } else {
          // Fallback to curated list
          const curatedMakes = COMMON_MANUFACTURERS.map((name, index) => ({
            Make_ID: index + 1,
            Make_Name: name,
          }));
          setMakes(curatedMakes);
        }
      } catch (err) {
        console.error("Failed to fetch vehicle makes:", err);
        setError(true);

        // Fallback to curated list
        const curatedMakes = COMMON_MANUFACTURERS.map((name, index) => ({
          Make_ID: index + 1,
          Make_Name: name,
        }));
        setMakes(curatedMakes);
      } finally {
        setLoading(false);
      }
    };

    fetchMakes();
  }, []);

  const filteredMakes = makes.filter((make) =>
    make.Make_Name.toLowerCase().includes(query.toLowerCase())
  );

  const itemCount = filteredMakes.length;

  return (
    <Combobox value={value} onChange={onChange}>
      <div className="relative mt-1">
        <div className="relative w-full cursor-default overflow-hidden rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-left shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
          <Combobox.Input
            className="w-full border-none py-2 pl-3 pr-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-0"
            onChange={(event) => setQuery(event.target.value)}
            displayValue={(make: any) => make}
            placeholder={
              loading
                ? t("common_.small.loadManufacturers")
                : t("common_.small.manufacturer")
            }
            disabled={loading}
          />
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronsUpDownIcon
              className="h-5 w-5 text-gray-400 dark:text-gray-300"
              aria-hidden="true"
            />
          </Combobox.Button>
        </div>
        {filteredMakes.length > 0 && (
          <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {error && (
              <div className="px-3 py-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20">
                Using fallback manufacturer list
              </div>
            )}
            <List
              height={200} // Adjust based on your design
              itemCount={itemCount}
              itemSize={35} // Adjust based on your design
              width="100%"
            >
              {({ index, style }) => {
                const make = filteredMakes[index];
                return (
                  <Combobox.Option
                    key={make.Make_ID}
                    value={make.Make_Name}
                    className={({ active }) =>
                      classNames(
                        "relative cursor-default select-none py-2 pl-10 pr-4",
                        active
                          ? "bg-primary-600 text-white"
                          : "text-gray-900 dark:text-gray-100"
                      )
                    }
                  >
                    {({ selected }) => (
                      <>
                        <span
                          className={classNames(
                            "block truncate",
                            selected ? "font-semibold" : ""
                          )}
                        >
                          {make.Make_Name}
                        </span>
                        {selected && (
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600">
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        )}
                      </>
                    )}
                  </Combobox.Option>
                );
              }}
            </List>
          </Combobox.Options>
        )}
        {error && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Using fallback manufacturer list
          </p>
        )}
      </div>
    </Combobox>
  );
}

export function RestrictedVehicleMakesSearchable({ value, onChange }) {
  const [query, setQuery] = useState("");
  const { t } = useReactItems();

  const filteredMakes = RESTRICTED_MANUFACTURERS.filter((make) =>
    make.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Combobox value={value} onChange={onChange}>
      <div className="relative mt-1">
        <div className="relative w-full cursor-default overflow-hidden rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-left shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
          <Combobox.Input
            className="w-full border-none py-2 pl-3 pr-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-0"
            onChange={(event) => setQuery(event.target.value)}
            displayValue={(make: any) => make}
            placeholder={t("common_.small.manufacturerSearchPlaceholder")}
          />
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronsUpDownIcon
              className="h-5 w-5 text-gray-400 dark:text-gray-300"
              aria-hidden="true"
            />
          </Combobox.Button>
        </div>
        {filteredMakes.length > 0 && (
          <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {filteredMakes.map((make) => (
              <Combobox.Option
                key={make}
                value={make}
                className={({ active }) =>
                  classNames(
                    "relative cursor-default select-none py-2 pl-10 pr-4",
                    active
                      ? "bg-primary-600 text-white"
                      : "text-gray-900 dark:text-gray-100"
                  )
                }
              >
                {({ selected }) => (
                  <>
                    <span
                      className={classNames(
                        "block truncate",
                        selected ? "font-medium" : "font-normal"
                      )}
                    >
                      {make}
                    </span>
                    {selected ? (
                      <span
                        className={classNames(
                          "absolute inset-y-0 left-0 flex items-center pl-3",
                          "text-primary-600"
                        )}
                      >
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </Combobox.Option>
            ))}
          </Combobox.Options>
        )}
      </div>
    </Combobox>
  );
}

export function VehicleModelsSearchable({ make, value, onChange }) {
  const [models, setModels] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useReactItems();

  useEffect(() => {
    const fetchModels = async () => {
      if (!make) {
        setModels([]);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(
          `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/${encodeURIComponent(
            make
          )}?format=json`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch models");
        }

        const data = await response.json();

        if (data.Results && data.Results.length > 0) {
          // Filter out any invalid entries and sort alphabetically
          const validModels = data.Results.filter(
            (model) => model.Model_Name && model.Model_Name.trim()
          ).sort((a, b) => a.Model_Name.localeCompare(b.Model_Name));

          setModels(validModels);
        } else {
          setModels([]);
        }
      } catch (err) {
        console.error("Failed to fetch vehicle models:", err);
        setModels([]);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, [make]);

  // Update query when value changes from parent
  useEffect(() => {
    if (value && value !== query) {
      setQuery(value);
    }
  }, [value, query]);

  const filteredModels = models.filter((model) =>
    model.Model_Name.toLowerCase().includes(query.toLowerCase())
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;
    setQuery(inputValue);

    // Auto-select if there's an exact match
    const exactMatch = models.find(
      (model) => model.Model_Name.toLowerCase() === inputValue.toLowerCase()
    );

    if (exactMatch) {
      onChange(exactMatch.Model_Name);
    } else {
      // Allow manual input
      onChange(inputValue);
    }
  };

  return (
    <Combobox value={value} onChange={onChange}>
      <div className="relative mt-1">
        <div className="relative w-full cursor-default overflow-hidden rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-left shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
          <Combobox.Input
            className="w-full border-none py-2 pl-3 pr-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-0"
            onChange={handleInputChange}
            displayValue={(model: any) => model}
            placeholder={
              loading
                ? t("common_.small.loading")
                : t("common_.small.searching")
            }
            disabled={loading || !make}
          />
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronsUpDownIcon
              className="h-5 w-5 text-gray-400 dark:text-gray-300"
              aria-hidden="true"
            />
          </Combobox.Button>
        </div>
        {/* Show dropdown when there are models available, regardless of query */}
        {filteredModels.length > 0 && (
          <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {filteredModels.map((model) => (
              <Combobox.Option
                key={model.Model_ID}
                value={model.Model_Name}
                className={({ active }) =>
                  classNames(
                    "relative cursor-default select-none py-2 pl-10 pr-4",
                    active
                      ? "bg-primary-600 text-white"
                      : "text-gray-900 dark:text-gray-100"
                  )
                }
              >
                {({ selected }) => (
                  <>
                    <span
                      className={classNames(
                        "block truncate",
                        selected ? "font-semibold" : ""
                      )}
                    >
                      {model.Model_Name}
                    </span>
                    {selected && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600">
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                  </>
                )}
              </Combobox.Option>
            ))}
          </Combobox.Options>
        )}
        {/* Show message when no models found and user has typed something */}
        {query && filteredModels.length === 0 && models.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-md bg-white dark:bg-gray-800 py-2 px-3 text-sm text-gray-500 dark:text-gray-400 shadow-lg ring-1 ring-black ring-opacity-5">
            {t("general.noResults", "No models found")}.{" "}
            {t(
              "common_.small.typingCustomAllowed",
              "You can type a custom model name."
            )}
          </div>
        )}
      </div>
    </Combobox>
  );
}

export const VehicleYearSelector = ({
  value,
  onChange,
  label = "Year",
  startYear = new Date().getFullYear(),
  numberOfYears = 20,
}) => {
  const years = Array.from({ length: numberOfYears }, (_, i) => startYear - i);

  return (
    <div>
      <label
        htmlFor="year"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        {label}
      </label>
      <select
        id="year"
        name="year"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        required
        className="block w-full py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 dark:text-white"
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
};
