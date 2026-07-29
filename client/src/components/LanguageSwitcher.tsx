import { useUserPreference } from "@/data";
import { ChevronDown } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

export const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const { data: userPreference } = useUserPreference();

  // Get navbar background color based on current route
  const getNavbarBackgroundColor = () => {
    if (location.pathname === "/post-a-ride") {
      return "bg-black dark:bg-black";
    }
    return "bg-primary dark:bg-primary";
  };

  const languages = [
    { code: "en", name: "English" },
    { code: "rw", name: "Kinyarwanda" },
  ];

  // Set default language
  useEffect(() => {
    if (userPreference?.common?.language) {
      const normalizedLang = userPreference?.common.language.toLowerCase();
      if (i18n.language !== normalizedLang) {
        i18n.changeLanguage(normalizedLang);
      }
    }
  }, [userPreference?.common, i18n]);

  const currentLanguage =
    languages.find((lang) => lang.code === i18n.language) || languages[0];

  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  // Handle click outside to close dropdown
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-between px-3 py-2 w-fit text-sm border transition-colors duration-300 rounded-lg
          bg-white/20 dark:bg-white/20
          border-white/30 dark:border-white/30
          text-white dark:text-white
          hover:bg-white/30 dark:hover:bg-white/30"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="font-medium">{currentLanguage.code.toUpperCase()}</span>
        <ChevronDown size={16} className="ml-2 text-white" />
      </button>

      {isOpen && (
        <div
          className="absolute mt-1 right-0 w-36 shadow-xl z-50 rounded-lg overflow-hidden
            bg-white dark:bg-gray-900
            border-2 border-green-600 dark:border-green-500"
          role="listbox"
        >
          <ul className="py-1">
            {languages.map((language) => (
              <li
                key={language.code}
                className={`px-4 py-2 text-sm cursor-pointer transition-colors
                  ${
                    i18n.language === language.code
                      ? "bg-green-600 text-white font-semibold"
                      : "text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-gray-800"
                  }`}
                onClick={() => changeLanguage(language.code)}
                role="option"
                aria-selected={i18n.language === language.code}
              >
                {language.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
