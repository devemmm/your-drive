import { Fragment } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";

const DropdownSelect = ({
  options = [],
  value,
  onChange,
  className = "",
  label = "",
}) => {
  return (
    <div className={`${className}`}>
      {label && (
        <label className="w-full hidden lg:inline mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
          {label} :
        </label>
      )}
      <Listbox value={value} onChange={onChange}>
        <div className="relative sm:w-[50%] w-full">
          <Listbox.Button className="relative w-full cursor-pointer rounded-md bg-white dark:bg-gray-900 py-2 pl-3 pr-10 text-left text-sm border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 shadow-sm focus:outline-none">
            <span className="block truncate">{value}</span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-300" />
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-900 py-1 text-sm shadow-lg ring-1 ring-black/10 dark:ring-white/10 focus:outline-none">
              {options.map((option) => (
                <Listbox.Option
                  key={option}
                  value={option}
                  className={({ active }) =>
                    `relative cursor-pointer select-none py-2 pl-4 pr-4 ${
                      active
                        ? "bg-primary text-white"
                        : "text-gray-900 dark:text-gray-100"
                    }`
                  }
                >
                  {({ selected }) => (
                    <>
                      <span
                        className={`block truncate ${
                          selected ? "font-medium" : "font-normal"
                        }`}
                      >
                        {option}
                      </span>
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
};

export default DropdownSelect;
