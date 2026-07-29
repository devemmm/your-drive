import { useUserPreference } from "@/data";
import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: userPreference, error } = useUserPreference();

  // Log any errors but don't let them crash the component
  if (error) {
    console.warn("Failed to load user preferences:", error);
  }

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("theme") as Theme | null;
      if (storedTheme && ["light", "dark"].includes(storedTheme)) {
        return storedTheme;
      }
      const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      return systemPrefersDark ? "dark" : "light";
    }
    return "light";
  });

  // Apply theme to HTML document
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  // Apply user preference from API if available
  useEffect(() => {
    if (userPreference?.common?.theme && typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("theme");
      if (!storedTheme) {
        const normalized =
          userPreference.common.theme.toLowerCase() === "dark"
            ? "dark"
            : "light";
        setTheme(normalized);
        localStorage.setItem("theme", normalized);
      }
    }
  }, [userPreference]);

  // Custom setTheme function that also saves to localStorage
  const setThemeWithStorage = (newTheme: Theme) => {
    setTheme(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeWithStorage }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
