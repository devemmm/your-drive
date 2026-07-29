type ColorPalette = {
  primary: string;
  primaryDark: string;
  primaryDarker: string;
  primaryLight: string;
  primaryMid: string;
  secondary: string;
  secondaryDark: string;
  secondaryLight: string;
  background: string;
  surface: string;
  surfaceSoftGreen: string;
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
  };
  border: string;
  borderLight: string;
  error: string;
  warning: string;
  success: string;
  star: string;
};

export const lightColors: ColorPalette = {
  primary: "#4CAF50",
  primaryDark: "#3D8C40",
  primaryDarker: "#2F6B32",
  primaryLight: "#EAF5EA",
  primaryMid: "#D5EAD6",
  secondary: "#1A6373",
  secondaryDark: "#154F5C",
  secondaryLight: "#E6F0F2",
  background: "#FFFFFF",
  surface: "#F8FAFB",
  surfaceSoftGreen: "#F4FBF4",
  text: {
    primary: "#0F1F12",
    secondary: "#6B7280",
    tertiary: "#9CA3AF",
    inverse: "#FFFFFF",
  },
  border: "#E5E7EB",
  borderLight: "#F0F0F0",
  error: "#EF4444",
  warning: "#F59E0B",
  success: "#4CAF50",
  star: "#FBBF24",
};

export const darkColors: ColorPalette = {
  primary: "#4CAF50",
  primaryDark: "#3D8C40",
  primaryDarker: "#2F6B32",
  primaryLight: "#1A2F1C",
  primaryMid: "#23402A",
  secondary: "#3FA2B5",
  secondaryDark: "#2A7889",
  secondaryLight: "#1A2F33",
  background: "#0B0F14",
  surface: "#111827",
  surfaceSoftGreen: "#12211A",
  text: {
    primary: "#F9FAFB",
    secondary: "#9CA3AF",
    tertiary: "#6B7280",
    inverse: "#0F1F12",
  },
  border: "#1F2937",
  borderLight: "#162033",
  error: "#F87171",
  warning: "#FBBF24",
  success: "#4CAF50",
  star: "#FBBF24",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  h2: 24,
  xxxl: 28,
  title: 32,
} as const;
export const borderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  card: 14,
  pill: 12,
  nav: 20,
  full: 9999,
} as const;

export type { ColorPalette };
