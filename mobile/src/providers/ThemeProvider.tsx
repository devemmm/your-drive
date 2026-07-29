import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useFonts,
  Jost_400Regular,
  Jost_500Medium,
  Jost_600SemiBold,
  Jost_700Bold,
} from "@expo-google-fonts/jost";
import { lightColors, darkColors, ColorPalette } from "@/lib/theme";

type Preference = "system" | "light" | "dark";
const STORAGE_KEY = "@yourdrive/theme";

interface ThemeContextValue {
  colors: ColorPalette;
  preference: Preference;
  resolved: "light" | "dark";
  fontsLoaded: boolean;
  setPreference: (p: Preference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<Preference>("system");
  const [fontsLoaded] = useFonts({
    Jost_400Regular,
    Jost_500Medium,
    Jost_600SemiBold,
    Jost_700Bold,
  });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setPreferenceState(stored);
      }
    });
  }, []);

  const resolved: "light" | "dark" =
    preference === "system" ? (system === "dark" ? "dark" : "light") : preference;
  const colors = resolved === "dark" ? darkColors : lightColors;

  const setPreference = async (p: Preference) => {
    setPreferenceState(p);
    await AsyncStorage.setItem(STORAGE_KEY, p);
  };

  return (
    <ThemeContext.Provider value={{ colors, preference, resolved, fontsLoaded, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
