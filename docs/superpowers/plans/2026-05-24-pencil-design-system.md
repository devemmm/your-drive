# Pencil Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the YourDrive mobile app's tokens and UI primitives with the Pencil design system without redesigning screens.

**Architecture:** Extend the existing `lib/theme.ts` token file additively, load Jost via `@expo-google-fonts/jost`, expose a `fontsLoaded` flag from `ThemeProvider`, introduce a `<ThemedText>` wrapper that defaults to Jost, update the four existing primitives (Button/Card/Input/Badge) to Pencil specs, and add five new primitives (SectionHeading, VehiclePill, LocationDot, SheetHandle, BottomNav). A handful of cards and the screen header migrate to consume the new primitives.

**Tech Stack:** React Native 0.81, Expo SDK 54, Expo Router 6, `@expo-google-fonts/jost`, `@testing-library/react-native`, `jest-expo`.

**Spec:** `docs/superpowers/specs/2026-05-24-pencil-design-system-design.md`

**Branch:** `feat/pencil-design-system` (cut from `origin/main`)

---

## File structure

**Create:**
- `mobile/src/components/ui/Text.tsx` — `<ThemedText>` Jost wrapper
- `mobile/src/components/ui/SectionHeading.tsx`
- `mobile/src/components/ui/VehiclePill.tsx`
- `mobile/src/components/ui/LocationDot.tsx`
- `mobile/src/components/ui/SheetHandle.tsx`
- `mobile/src/components/ui/BottomNav.tsx`
- `mobile/src/components/__tests__/Text.test.tsx`
- `mobile/src/components/__tests__/Button.test.tsx`
- `mobile/src/components/__tests__/Card.test.tsx`
- `mobile/src/components/__tests__/Badge.test.tsx`
- `mobile/src/components/__tests__/SectionHeading.test.tsx`
- `mobile/src/components/__tests__/VehiclePill.test.tsx`
- `mobile/src/components/__tests__/LocationDot.test.tsx`
- `mobile/src/components/__tests__/SheetHandle.test.tsx`
- `mobile/src/components/__tests__/BottomNav.test.tsx`

**Modify:**
- `mobile/package.json` — add `@expo-google-fonts/jost`
- `mobile/src/lib/theme.ts` — additive token extensions
- `mobile/src/providers/ThemeProvider.tsx` — expose `fontsLoaded`
- `mobile/src/app/_layout.tsx` — gate render on `fontsLoaded`
- `mobile/src/components/ui/Button.tsx` — add `ghost` variant, Pencil padding/weight
- `mobile/src/components/ui/Card.tsx` — radius 14, border default, optional `elevated`
- `mobile/src/components/ui/Input.tsx` — Pencil padding/weight tuning
- `mobile/src/components/ui/Badge.tsx` — Pencil padding/weight, primary uses `primaryDark` text
- `mobile/src/components/ui/ScreenHeader.tsx` — consume `<ThemedText>`
- `mobile/src/components/RideResultCard.tsx` — new tokens + `<ThemedText>`
- `mobile/src/components/ChauffeurCard.tsx` — new tokens + `<ThemedText>`
- `mobile/src/components/RentalCard.tsx` — new tokens + `<ThemedText>`
- `mobile/src/components/HomeBottomSheet.tsx` — adopt `<SheetHandle>`

---

## Task 1: Add Jost font dependency

**Files:**
- Modify: `mobile/package.json`

- [ ] **Step 1: Install `@expo-google-fonts/jost`**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npm install @expo-google-fonts/jost expo-font
```

Expected: package added, no peer warnings, lockfile updated. (`expo-font` is the runtime that powers `@expo-google-fonts/jost`; it's already a transitive dep via Expo SDK but list it explicitly to make the loader API import stable.)

- [ ] **Step 2: Verify the entry in `transformIgnorePatterns`**

`mobile/jest.config.js` already whitelists `@expo-google-fonts/.*`. Confirm by reading the file. No edit needed; mention this in the commit message.

- [ ] **Step 3: Commit**

```bash
git -C /Users/adrianmaenzanise/Projects/Node/your-drive add mobile/package.json mobile/package-lock.json
git -C /Users/adrianmaenzanise/Projects/Node/your-drive commit -m "deps(mobile): add @expo-google-fonts/jost + expo-font"
```

---

## Task 2: Extend theme tokens (additive)

**Files:**
- Modify: `mobile/src/lib/theme.ts`

- [ ] **Step 1: Replace `mobile/src/lib/theme.ts` with the extended palette**

Open `mobile/src/lib/theme.ts` and replace the entire contents with:

```ts
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
```

Notes:
- The existing `fontSize.xs..title` keys are unchanged. `fontSize.h2 = 24` is added as an alias of `xxl`. Pencil's specific sizes (13 caption, 14 body, 15 button label, 11 badge/nav label) are written as literals in the primitives below, on purpose, so we don't repurpose existing keys and silently shift any screen that consumes them.
- Dark-mode values are extrapolations (Pencil doesn't define dark).

- [ ] **Step 2: Type-check**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx tsc --noEmit
```

Expected: no errors. If existing screens reference removed fields, none should — we only added fields. If you see errors, stop and reconcile.

- [ ] **Step 3: Run existing tests**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx jest
```

Expected: all pass. We've only added tokens.

- [ ] **Step 4: Commit**

```bash
git -C /Users/adrianmaenzanise/Projects/Node/your-drive add mobile/src/lib/theme.ts
git -C /Users/adrianmaenzanise/Projects/Node/your-drive commit -m "feat(theme): extend tokens with Pencil palette + radii"
```

---

## Task 3: Extend ThemeProvider with `fontsLoaded`

**Files:**
- Modify: `mobile/src/providers/ThemeProvider.tsx`

- [ ] **Step 1: Replace `mobile/src/providers/ThemeProvider.tsx` with the font-aware version**

```tsx
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
```

- [ ] **Step 2: Mock `@expo-google-fonts/jost` in jest setup**

Open `mobile/jest.setup.js` and append:

```js
jest.mock('@expo-google-fonts/jost', () => ({
  useFonts: () => [true],
  Jost_400Regular: 'Jost_400Regular',
  Jost_500Medium: 'Jost_500Medium',
  Jost_600SemiBold: 'Jost_600SemiBold',
  Jost_700Bold: 'Jost_700Bold',
}));
```

Expected mode: tests run with `fontsLoaded === true` so primitives render with Jost names.

- [ ] **Step 3: Run existing tests**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx jest
```

Expected: all pass. Existing tests don't touch `fontsLoaded` so nothing should break.

- [ ] **Step 4: Commit**

```bash
git -C /Users/adrianmaenzanise/Projects/Node/your-drive add mobile/src/providers/ThemeProvider.tsx mobile/jest.setup.js
git -C /Users/adrianmaenzanise/Projects/Node/your-drive commit -m "feat(theme): expose fontsLoaded from ThemeProvider"
```

---

## Task 4: Build `<ThemedText>` with TDD

**Files:**
- Create: `mobile/src/components/__tests__/Text.test.tsx`
- Create: `mobile/src/components/ui/Text.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/components/__tests__/Text.test.tsx`:

```tsx
import React from "react";
import { render } from "@testing-library/react-native";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ThemedText } from "@/components/ui/Text";

function wrap(node: React.ReactNode) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

describe("ThemedText", () => {
  it("renders its children", () => {
    const { getByText } = wrap(<ThemedText>Hello</ThemedText>);
    expect(getByText("Hello")).toBeTruthy();
  });

  it("applies Jost_400Regular by default when fonts are loaded", () => {
    const { getByText } = wrap(<ThemedText>Body</ThemedText>);
    const node = getByText("Body");
    expect(node.props.style).toEqual(
      expect.objectContaining({ fontFamily: "Jost_400Regular" })
    );
  });

  it("maps weight=700 to Jost_700Bold", () => {
    const { getByText } = wrap(<ThemedText weight={700}>Title</ThemedText>);
    expect(getByText("Title").props.style).toEqual(
      expect.objectContaining({ fontFamily: "Jost_700Bold" })
    );
  });

  it("maps weight=600 to Jost_600SemiBold", () => {
    const { getByText } = wrap(<ThemedText weight={600}>Label</ThemedText>);
    expect(getByText("Label").props.style).toEqual(
      expect.objectContaining({ fontFamily: "Jost_600SemiBold" })
    );
  });

  it("uses System font as fallback when fontsLoaded is false", () => {
    jest.isolateModules(() => {
      jest.doMock("@expo-google-fonts/jost", () => ({
        useFonts: () => [false],
        Jost_400Regular: "Jost_400Regular",
        Jost_500Medium: "Jost_500Medium",
        Jost_600SemiBold: "Jost_600SemiBold",
        Jost_700Bold: "Jost_700Bold",
      }));
      const { ThemeProvider: FreshProvider } = require("@/providers/ThemeProvider");
      const { ThemedText: FreshText } = require("@/components/ui/Text");
      const { getByText } = render(
        <FreshProvider>
          <FreshText>Fallback</FreshText>
        </FreshProvider>
      );
      expect(getByText("Fallback").props.style).toEqual(
        expect.objectContaining({ fontFamily: "System" })
      );
    });
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx jest src/components/__tests__/Text.test.tsx
```

Expected: FAIL with `Cannot find module '@/components/ui/Text'`.

- [ ] **Step 3: Implement `<ThemedText>`**

Create `mobile/src/components/ui/Text.tsx`:

```tsx
import React from "react";
import { Text, TextProps, TextStyle } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize as fontSizeTokens } from "@/lib/theme";

type Weight = 400 | 500 | 600 | 700;
type SizeKey = keyof typeof fontSizeTokens;

interface ThemedTextProps extends TextProps {
  weight?: Weight;
  size?: SizeKey;
}

const FAMILY_BY_WEIGHT: Record<Weight, string> = {
  400: "Jost_400Regular",
  500: "Jost_500Medium",
  600: "Jost_600SemiBold",
  700: "Jost_700Bold",
};

export function ThemedText({ weight = 400, size, style, ...rest }: ThemedTextProps) {
  const { colors, fontsLoaded } = useTheme();
  const family = fontsLoaded ? FAMILY_BY_WEIGHT[weight] : "System";
  const base: TextStyle = {
    fontFamily: family,
    color: colors.text.primary,
    ...(size ? { fontSize: fontSizeTokens[size] } : null),
  };
  return <Text {...rest} style={[base, style]} />;
}
```

- [ ] **Step 4: Run the test — confirm it passes**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx jest src/components/__tests__/Text.test.tsx
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git -C /Users/adrianmaenzanise/Projects/Node/your-drive add mobile/src/components/ui/Text.tsx mobile/src/components/__tests__/Text.test.tsx
git -C /Users/adrianmaenzanise/Projects/Node/your-drive commit -m "feat(ui): add ThemedText with Jost faces + fallback"
```

---

## Task 5: Gate root layout on `fontsLoaded`

**Files:**
- Modify: `mobile/src/app/_layout.tsx`

- [ ] **Step 1: Wrap `AppContent` with a font gate**

Replace the body of `AppContent` in `mobile/src/app/_layout.tsx` with a version that returns `null` until fonts load. Modify the file as follows (replace the `AppContent` function only):

```tsx
function AppContent() {
  const isConnected = useNetworkStatus();
  const { fontsLoaded } = useTheme();
  if (!fontsLoaded) return null;
  return (
    <>
      <StatusBar style="auto" />
      <NetworkBanner isConnected={isConnected} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(drawer)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="ride" options={{ presentation: "card" }} />
        <Stack.Screen name="ride-request" options={{ presentation: "card" }} />
        <Stack.Screen name="post-ride" options={{ presentation: "card" }} />
        <Stack.Screen name="vehicle" options={{ presentation: "card" }} />
        <Stack.Screen name="rental" options={{ presentation: "card" }} />
        <Stack.Screen name="chauffeur" options={{ presentation: "card" }} />
        <Stack.Screen name="notifications" options={{ presentation: "card" }} />
        <Stack.Screen name="chat" options={{ presentation: "card" }} />
        <Stack.Screen name="profile" options={{ presentation: "card" }} />
        <Stack.Screen name="transactions" options={{ presentation: "card" }} />
      </Stack>
    </>
  );
}
```

- [ ] **Step 2: Type-check + run tests**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx tsc --noEmit && npx jest
```

Expected: TS clean, all tests pass (jest mock returns `fontsLoaded === true`).

- [ ] **Step 3: Commit**

```bash
git -C /Users/adrianmaenzanise/Projects/Node/your-drive add mobile/src/app/_layout.tsx
git -C /Users/adrianmaenzanise/Projects/Node/your-drive commit -m "feat(app): gate AppContent on fontsLoaded"
```

---

## Task 6: Update `Button` primitive

**Files:**
- Modify: `mobile/src/components/ui/Button.tsx`
- Create: `mobile/src/components/__tests__/Button.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/components/__tests__/Button.test.tsx`:

```tsx
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { Button } from "@/components/ui/Button";

function wrap(node: React.ReactNode) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

describe("Button", () => {
  it("renders title and fires onPress", () => {
    const onPress = jest.fn();
    const { getByText } = wrap(<Button title="Go" onPress={onPress} />);
    fireEvent.press(getByText("Go"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders the ghost variant", () => {
    const onPress = jest.fn();
    const { getByText } = wrap(<Button title="Forgot Password?" onPress={onPress} variant="ghost" />);
    expect(getByText("Forgot Password?")).toBeTruthy();
  });

  it("does not fire onPress when disabled", () => {
    const onPress = jest.fn();
    const { getByText } = wrap(<Button title="Go" onPress={onPress} disabled />);
    fireEvent.press(getByText("Go"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("shows a loading indicator instead of label when loading", () => {
    const onPress = jest.fn();
    const { queryByText, UNSAFE_getByType } = wrap(<Button title="Go" onPress={onPress} loading />);
    expect(queryByText("Go")).toBeNull();
    const { ActivityIndicator } = require("react-native");
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test — confirm what fails**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx jest src/components/__tests__/Button.test.tsx
```

Expected: the "renders the ghost variant" case fails because `ghost` is not a valid variant yet. Other cases may pass against the existing Button.

- [ ] **Step 3: Replace `mobile/src/components/ui/Button.tsx`**

```tsx
import React, { useMemo } from "react";
import { TouchableOpacity, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { borderRadius, fontSize, spacing, ColorPalette } from "@/lib/theme";
import { ThemedText } from "@/components/ui/Text";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "lg",
  loading = false,
  disabled = false,
  icon,
  style,
  testID,
}: ButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isDisabled = disabled || loading;
  const labelColor =
    variant === "primary" || variant === "destructive"
      ? colors.text.inverse
      : colors.primary;
  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], styles[`size_${size}`], isDisabled && styles.disabled, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <>
          {icon}
          <ThemedText
            weight={600}
            style={[
              styles.text,
              { color: labelColor },
              styles[`size_${size}_text`],
              icon ? { marginLeft: spacing.sm } : undefined,
            ]}
          >
            {title}
          </ThemedText>
        </>
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    base: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: borderRadius.lg },
    primary: { backgroundColor: colors.primary },
    secondary: { backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.primary },
    ghost: { backgroundColor: "transparent", paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
    destructive: { backgroundColor: colors.error },
    size_sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
    size_md: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
    size_lg: { paddingVertical: 14, paddingHorizontal: 24, minHeight: 50 },
    disabled: { opacity: 0.5 },
    text: { includeFontPadding: false, textAlignVertical: "center" } as TextStyle,
    size_sm_text: { fontSize: fontSize.sm },
    size_md_text: { fontSize: fontSize.md },
    size_lg_text: { fontSize: 15 },
  });
```

Notes:
- `ghost` overrides padding to Pencil's `[10,14]`.
- Primary/outline padding switches to Pencil's `[14,24]` and label sits at `15/600`.
- `size_lg` height drops from 52 → 50 to match Pencil.

- [ ] **Step 4: Run the test — confirm it passes**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx jest src/components/__tests__/Button.test.tsx
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Run the full suite**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx jest
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git -C /Users/adrianmaenzanise/Projects/Node/your-drive add mobile/src/components/ui/Button.tsx mobile/src/components/__tests__/Button.test.tsx
git -C /Users/adrianmaenzanise/Projects/Node/your-drive commit -m "feat(ui): align Button with Pencil + add ghost variant"
```

---

## Task 7: Update `Card` primitive

**Files:**
- Modify: `mobile/src/components/ui/Card.tsx`
- Create: `mobile/src/components/__tests__/Card.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/components/__tests__/Card.test.tsx`:

```tsx
import React from "react";
import { render } from "@testing-library/react-native";
import { Text } from "react-native";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { Card } from "@/components/ui/Card";

function wrap(node: React.ReactNode) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

describe("Card", () => {
  it("renders children", () => {
    const { getByText } = wrap(
      <Card>
        <Text>inside</Text>
      </Card>
    );
    expect(getByText("inside")).toBeTruthy();
  });

  it("uses a border and no shadow by default", () => {
    const { getByTestId } = wrap(
      <Card testID="card.default">
        <Text>x</Text>
      </Card>
    );
    const style = getByTestId("card.default").props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flat.borderWidth).toBe(1);
    expect(flat.shadowOpacity ?? 0).toBe(0);
  });

  it("applies a shadow when elevated", () => {
    const { getByTestId } = wrap(
      <Card testID="card.elevated" elevated>
        <Text>x</Text>
      </Card>
    );
    const style = getByTestId("card.elevated").props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flat.shadowOpacity).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx jest src/components/__tests__/Card.test.tsx
```

Expected: FAIL — the "elevated" prop doesn't exist yet and the default styling has shadow > 0.

- [ ] **Step 3: Replace `mobile/src/components/ui/Card.tsx`**

```tsx
import React, { useMemo } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { borderRadius, spacing, ColorPalette } from "@/lib/theme";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  testID?: string;
}

export function Card({ children, style, elevated = false, testID }: CardProps) {
  const { colors } = useTheme();
  const cStyles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[cStyles.card, elevated && cStyles.elevated, style]} testID={testID}>
      {children}
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.background,
      borderRadius: borderRadius.card,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    elevated: {
      borderWidth: 0,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
  });
```

- [ ] **Step 4: Run the test — confirm it passes**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx jest src/components/__tests__/Card.test.tsx
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git -C /Users/adrianmaenzanise/Projects/Node/your-drive add mobile/src/components/ui/Card.tsx mobile/src/components/__tests__/Card.test.tsx
git -C /Users/adrianmaenzanise/Projects/Node/your-drive commit -m "feat(ui): align Card with Pencil (border default, elevated opt-in)"
```

---

## Task 8: Update `Input` primitive

**Files:**
- Modify: `mobile/src/components/ui/Input.tsx`

No behavioural API change. We tune sizing and consume `<ThemedText>` for the label/error so the font lands.

- [ ] **Step 1: Replace `mobile/src/components/ui/Input.tsx`**

```tsx
import React, { useMemo, useState } from "react";
import { View, TextInput, StyleSheet, TouchableOpacity, TextInputProps } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { borderRadius, fontSize, spacing, ColorPalette } from "@/lib/theme";
import { ThemedText } from "@/components/ui/Text";

interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
}

export function Input({ label, error, icon, rightIcon, isPassword = false, ...props }: InputProps) {
  const { colors, fontsLoaded } = useTheme();
  const iStyles = useMemo(() => makeStyles(colors), [colors]);
  const [showPassword, setShowPassword] = useState(false);
  return (
    <View style={iStyles.container}>
      {label && (
        <ThemedText weight={600} style={iStyles.label}>
          {label}
        </ThemedText>
      )}
      <View style={[iStyles.inputWrapper, error && iStyles.inputError]}>
        {icon && <View style={iStyles.iconLeft}>{icon}</View>}
        <TextInput
          style={[iStyles.input, fontsLoaded && { fontFamily: "Jost_400Regular" }]}
          placeholderTextColor={colors.text.secondary}
          secureTextEntry={isPassword && !showPassword}
          autoCorrect={isPassword ? false : undefined}
          autoCapitalize={isPassword ? "none" : undefined}
          textContentType={isPassword ? "oneTimeCode" : undefined}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ThemedText weight={500} style={iStyles.toggleText}>
              {showPassword ? "Hide" : "Show"}
            </ThemedText>
          </TouchableOpacity>
        )}
        {rightIcon && <View style={iStyles.iconRight}>{rightIcon}</View>}
      </View>
      {error && (
        <ThemedText style={iStyles.error}>{error}</ThemedText>
      )}
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    container: { width: "100%" },
    label: { fontSize: 14, color: colors.text.primary, marginBottom: spacing.xs },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      paddingVertical: 0,
      height: 52,
    },
    inputError: { borderColor: colors.error },
    input: {
      flex: 1,
      fontSize: 14,
      color: colors.text.primary,
      paddingVertical: 0,
    },
    iconLeft: { marginRight: 10 },
    iconRight: { marginLeft: 10 },
    toggleText: { fontSize: 14, color: colors.primary, marginLeft: spacing.sm },
    error: { fontSize: fontSize.xs, color: colors.error, marginTop: spacing.xs },
  });
```

- [ ] **Step 2: Run the full suite**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx jest
```

Expected: all pass — Input has no dedicated test file, and existing consumers don't break (API unchanged).

- [ ] **Step 3: Commit**

```bash
git -C /Users/adrianmaenzanise/Projects/Node/your-drive add mobile/src/components/ui/Input.tsx
git -C /Users/adrianmaenzanise/Projects/Node/your-drive commit -m "feat(ui): align Input with Pencil + use ThemedText"
```

---

## Task 9: Update `Badge` primitive

**Files:**
- Modify: `mobile/src/components/ui/Badge.tsx`
- Create: `mobile/src/components/__tests__/Badge.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/components/__tests__/Badge.test.tsx`:

```tsx
import React from "react";
import { render } from "@testing-library/react-native";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { Badge } from "@/components/ui/Badge";
import { lightColors } from "@/lib/theme";

function wrap(node: React.ReactNode) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

describe("Badge", () => {
  it("renders label", () => {
    const { getByText } = wrap(<Badge label="P2P" />);
    expect(getByText("P2P")).toBeTruthy();
  });

  it("uses primaryDark for the primary variant text color", () => {
    const { getByText } = wrap(<Badge label="P2P" variant="primary" />);
    const style = getByText("P2P").props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flat.color).toBe(lightColors.primaryDark);
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx jest src/components/__tests__/Badge.test.tsx
```

Expected: FAIL — the existing Badge uses `colors.primary` (#22C55E or new #4CAF50), not `colors.primaryDark`.

- [ ] **Step 3: Replace `mobile/src/components/ui/Badge.tsx`**

```tsx
import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { borderRadius, ColorPalette } from "@/lib/theme";
import { ThemedText } from "@/components/ui/Text";

interface BadgeProps {
  label: string;
  variant?: "primary" | "outline" | "muted";
}

export function Badge({ label, variant = "primary" }: BadgeProps) {
  const { colors } = useTheme();
  const bStyles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[bStyles.badge, bStyles[variant]]}>
      <ThemedText weight={700} style={[bStyles.text, bStyles[`${variant}Text`]]}>
        {label}
      </ThemedText>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: borderRadius.full, alignSelf: "flex-start" },
    primary: { backgroundColor: colors.primaryLight },
    outline: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
    muted: { backgroundColor: colors.surface },
    text: { fontSize: 11 },
    primaryText: { color: colors.primaryDark },
    outlineText: { color: colors.text.secondary },
    mutedText: { color: colors.text.secondary },
  });
```

- [ ] **Step 4: Run the test — confirm it passes**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx jest src/components/__tests__/Badge.test.tsx
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git -C /Users/adrianmaenzanise/Projects/Node/your-drive add mobile/src/components/ui/Badge.tsx mobile/src/components/__tests__/Badge.test.tsx
git -C /Users/adrianmaenzanise/Projects/Node/your-drive commit -m "feat(ui): align Badge with Pencil (primaryDark text, 11/700)"
```

---

## Task 10: Add `SectionHeading`

**Files:**
- Create: `mobile/src/components/ui/SectionHeading.tsx`
- Create: `mobile/src/components/__tests__/SectionHeading.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/components/__tests__/SectionHeading.test.tsx`:

```tsx
import React from "react";
import { render } from "@testing-library/react-native";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { SectionHeading } from "@/components/ui/SectionHeading";

function wrap(node: React.ReactNode) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

describe("SectionHeading", () => {
  it("renders the title", () => {
    const { getByText } = wrap(<SectionHeading title="How It Works" />);
    expect(getByText("How It Works")).toBeTruthy();
  });

  it("renders the subtitle when provided", () => {
    const { getByText } = wrap(
      <SectionHeading title="How It Works" subtitle="Three simple steps to get moving" />
    );
    expect(getByText("Three simple steps to get moving")).toBeTruthy();
  });

  it("renders an accent bar", () => {
    const { getByTestId } = wrap(<SectionHeading title="x" />);
    expect(getByTestId("sectionHeading.accentBar")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx jest src/components/__tests__/SectionHeading.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/ui/SectionHeading'`.

- [ ] **Step 3: Implement `SectionHeading`**

Create `mobile/src/components/ui/SectionHeading.tsx`:

```tsx
import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { borderRadius, fontSize, ColorPalette } from "@/lib/theme";
import { ThemedText } from "@/components/ui/Text";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  align?: "start" | "center";
}

export function SectionHeading({ title, subtitle, align = "center" }: SectionHeadingProps) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors, align), [colors, align]);
  return (
    <View style={s.container}>
      <ThemedText weight={700} style={s.title}>{title}</ThemedText>
      <View testID="sectionHeading.accentBar" style={s.bar} />
      {subtitle ? <ThemedText style={s.subtitle}>{subtitle}</ThemedText> : null}
    </View>
  );
}

const makeStyles = (colors: ColorPalette, align: "start" | "center") =>
  StyleSheet.create({
    container: { alignItems: align === "center" ? "center" : "flex-start", gap: 10 },
    title: { fontSize: fontSize.h2, color: colors.text.primary, textAlign: align === "center" ? "center" : "left" },
    bar: { width: 60, height: 3, borderRadius: 2, backgroundColor: colors.primary },
    subtitle: { fontSize: 13, color: colors.text.secondary, textAlign: align === "center" ? "center" : "left" },
  });
```

- [ ] **Step 4: Run the test — confirm it passes**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx jest src/components/__tests__/SectionHeading.test.tsx
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git -C /Users/adrianmaenzanise/Projects/Node/your-drive add mobile/src/components/ui/SectionHeading.tsx mobile/src/components/__tests__/SectionHeading.test.tsx
git -C /Users/adrianmaenzanise/Projects/Node/your-drive commit -m "feat(ui): add SectionHeading primitive"
```

---

## Task 11: Add `VehiclePill`

**Files:**
- Create: `mobile/src/components/ui/VehiclePill.tsx`
- Create: `mobile/src/components/__tests__/VehiclePill.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/components/__tests__/VehiclePill.test.tsx`:

```tsx
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { VehiclePill } from "@/components/ui/VehiclePill";
import { lightColors } from "@/lib/theme";

function wrap(node: React.ReactNode) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

describe("VehiclePill", () => {
  it("renders icon + label", () => {
    const { getByText } = wrap(<VehiclePill icon="car" label="Car" onPress={() => {}} />);
    expect(getByText("Car")).toBeTruthy();
  });

  it("fires onPress", () => {
    const onPress = jest.fn();
    const { getByText } = wrap(<VehiclePill icon="car" label="Car" onPress={onPress} />);
    fireEvent.press(getByText("Car"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("uses primary background when selected", () => {
    const { getByTestId } = wrap(
      <VehiclePill icon="car" label="Car" selected onPress={() => {}} testID="pill.car" />
    );
    const style = getByTestId("pill.car").props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flat.backgroundColor).toBe(lightColors.primary);
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx jest src/components/__tests__/VehiclePill.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/ui/VehiclePill'`.

- [ ] **Step 3: Implement `VehiclePill`**

Create `mobile/src/components/ui/VehiclePill.tsx`:

```tsx
import React, { useMemo } from "react";
import { TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { Car, Truck, Bus, Bike, type LucideIcon } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { borderRadius, fontSize, ColorPalette } from "@/lib/theme";
import { ThemedText } from "@/components/ui/Text";

type IconKey = "car" | "truck" | "bus" | "bike";
const ICON_MAP: Record<IconKey, LucideIcon> = { car: Car, truck: Truck, bus: Bus, bike: Bike };

interface VehiclePillProps {
  icon: IconKey;
  label: string;
  selected?: boolean;
  onPress: () => void;
  style?: ViewStyle;
  testID?: string;
}

export function VehiclePill({ icon, label, selected = false, onPress, style, testID }: VehiclePillProps) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors, selected), [colors, selected]);
  const Icon = ICON_MAP[icon];
  const tint = selected ? colors.text.inverse : colors.text.primary;
  return (
    <TouchableOpacity testID={testID} onPress={onPress} activeOpacity={0.8} style={[s.pill, style]}>
      <Icon size={22} color={tint} />
      <ThemedText weight={600} style={[s.label, { color: tint }]}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: ColorPalette, selected: boolean) =>
  StyleSheet.create({
    pill: {
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: borderRadius.pill,
      backgroundColor: selected ? colors.primary : colors.background,
      borderWidth: selected ? 0 : 1,
      borderColor: colors.border,
      width: 110,
    },
    label: { fontSize: 13 },
  });
```

- [ ] **Step 4: Run the test — confirm it passes**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx jest src/components/__tests__/VehiclePill.test.tsx
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git -C /Users/adrianmaenzanise/Projects/Node/your-drive add mobile/src/components/ui/VehiclePill.tsx mobile/src/components/__tests__/VehiclePill.test.tsx
git -C /Users/adrianmaenzanise/Projects/Node/your-drive commit -m "feat(ui): add VehiclePill primitive"
```

---

## Task 12: Add `LocationDot`

**Files:**
- Create: `mobile/src/components/ui/LocationDot.tsx`
- Create: `mobile/src/components/__tests__/LocationDot.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/components/__tests__/LocationDot.test.tsx`:

```tsx
import React from "react";
import { render } from "@testing-library/react-native";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { LocationDot } from "@/components/ui/LocationDot";

function wrap(node: React.ReactNode) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

describe("LocationDot", () => {
  it("renders for from kind", () => {
    const { getByTestId } = wrap(<LocationDot kind="from" testID="dot.from" />);
    expect(getByTestId("dot.from")).toBeTruthy();
  });

  it("renders for to kind", () => {
    const { getByTestId } = wrap(<LocationDot kind="to" testID="dot.to" />);
    expect(getByTestId("dot.to")).toBeTruthy();
  });

  it("renders for stop kind", () => {
    const { getByTestId } = wrap(<LocationDot kind="stop" testID="dot.stop" />);
    expect(getByTestId("dot.stop")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx jest src/components/__tests__/LocationDot.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/ui/LocationDot'`.

- [ ] **Step 3: Implement `LocationDot`**

Create `mobile/src/components/ui/LocationDot.tsx`:

```tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";

type Kind = "from" | "to" | "stop";

interface LocationDotProps {
  kind: Kind;
  size?: number;
  testID?: string;
}

export function LocationDot({ kind, size = 18, testID }: LocationDotProps) {
  const { colors } = useTheme();
  const outerColor =
    kind === "from" ? colors.primary : kind === "to" ? colors.text.primary : colors.background;
  const borderColor =
    kind === "stop" ? colors.text.primary : "transparent";
  const inner = size * 0.4;
  return (
    <View
      testID={testID}
      style={[
        styles.outer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: outerColor,
          borderWidth: kind === "stop" ? 2 : 0,
          borderColor,
        },
      ]}
    >
      <View
        style={{
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          backgroundColor: kind === "stop" ? colors.text.primary : colors.background,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { alignItems: "center", justifyContent: "center" },
});
```

- [ ] **Step 4: Run the test — confirm it passes**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx jest src/components/__tests__/LocationDot.test.tsx
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git -C /Users/adrianmaenzanise/Projects/Node/your-drive add mobile/src/components/ui/LocationDot.tsx mobile/src/components/__tests__/LocationDot.test.tsx
git -C /Users/adrianmaenzanise/Projects/Node/your-drive commit -m "feat(ui): add LocationDot primitive"
```

---

## Task 13: Add `SheetHandle`

**Files:**
- Create: `mobile/src/components/ui/SheetHandle.tsx`
- Create: `mobile/src/components/__tests__/SheetHandle.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/components/__tests__/SheetHandle.test.tsx`:

```tsx
import React from "react";
import { render } from "@testing-library/react-native";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { SheetHandle } from "@/components/ui/SheetHandle";

function wrap(node: React.ReactNode) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

describe("SheetHandle", () => {
  it("renders", () => {
    const { getByTestId } = wrap(<SheetHandle testID="sheet.handle" />);
    expect(getByTestId("sheet.handle")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx jest src/components/__tests__/SheetHandle.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/ui/SheetHandle'`.

- [ ] **Step 3: Implement `SheetHandle`**

Create `mobile/src/components/ui/SheetHandle.tsx`:

```tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { borderRadius } from "@/lib/theme";

interface SheetHandleProps {
  testID?: string;
}

export function SheetHandle({ testID }: SheetHandleProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View
        testID={testID}
        style={[styles.bar, { backgroundColor: colors.border, borderRadius: borderRadius.full }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingTop: 8, paddingBottom: 4 },
  bar: { width: 48, height: 5 },
});
```

- [ ] **Step 4: Run the test — confirm it passes**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx jest src/components/__tests__/SheetHandle.test.tsx
```

Expected: PASS, 1 test.

- [ ] **Step 5: Commit**

```bash
git -C /Users/adrianmaenzanise/Projects/Node/your-drive add mobile/src/components/ui/SheetHandle.tsx mobile/src/components/__tests__/SheetHandle.test.tsx
git -C /Users/adrianmaenzanise/Projects/Node/your-drive commit -m "feat(ui): add SheetHandle primitive"
```

---

## Task 14: Add `BottomNav`

**Files:**
- Create: `mobile/src/components/ui/BottomNav.tsx`
- Create: `mobile/src/components/__tests__/BottomNav.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/components/__tests__/BottomNav.test.tsx`:

```tsx
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { BottomNav } from "@/components/ui/BottomNav";

function wrap(node: React.ReactNode) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

describe("BottomNav", () => {
  it("renders item labels", () => {
    const { getByText } = wrap(
      <BottomNav
        items={[
          { icon: "home", label: "Home", active: true, onPress: () => {} },
          { icon: "trips", label: "Trips", onPress: () => {} },
        ]}
      />
    );
    expect(getByText("Home")).toBeTruthy();
    expect(getByText("Trips")).toBeTruthy();
  });

  it("fires onPress for the tapped item", () => {
    const onTrips = jest.fn();
    const { getByText } = wrap(
      <BottomNav
        items={[
          { icon: "home", label: "Home", onPress: () => {} },
          { icon: "trips", label: "Trips", onPress: onTrips },
        ]}
      />
    );
    fireEvent.press(getByText("Trips"));
    expect(onTrips).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx jest src/components/__tests__/BottomNav.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/ui/BottomNav'`.

- [ ] **Step 3: Implement `BottomNav`**

Create `mobile/src/components/ui/BottomNav.tsx`:

```tsx
import React, { useMemo } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Home, Route, Inbox, User, type LucideIcon } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { borderRadius, ColorPalette } from "@/lib/theme";
import { ThemedText } from "@/components/ui/Text";

type IconKey = "home" | "trips" | "inbox" | "profile";
const ICON_MAP: Record<IconKey, LucideIcon> = { home: Home, trips: Route, inbox: Inbox, profile: User };

interface BottomNavItem {
  icon: IconKey;
  label: string;
  active?: boolean;
  onPress: () => void;
}

interface BottomNavProps {
  items: BottomNavItem[];
}

export function BottomNav({ items }: BottomNavProps) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={s.container}>
      {items.map((item) => {
        const Icon = ICON_MAP[item.icon];
        const tint = item.active ? colors.primary : colors.text.secondary;
        return (
          <TouchableOpacity key={item.label} onPress={item.onPress} style={s.item} activeOpacity={0.7}>
            <Icon size={20} color={tint} />
            <ThemedText weight={600} style={[s.label, { color: tint }]}>{item.label}</ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: borderRadius.nav,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    item: { alignItems: "center", justifyContent: "center", gap: 4, flex: 1 },
    label: { fontSize: 11 },
  });
```

- [ ] **Step 4: Run the test — confirm it passes**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx jest src/components/__tests__/BottomNav.test.tsx
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git -C /Users/adrianmaenzanise/Projects/Node/your-drive add mobile/src/components/ui/BottomNav.tsx mobile/src/components/__tests__/BottomNav.test.tsx
git -C /Users/adrianmaenzanise/Projects/Node/your-drive commit -m "feat(ui): add BottomNav primitive (styling only, not wired)"
```

---

## Task 15: Migrate `ScreenHeader` to `<ThemedText>`

**Files:**
- Modify: `mobile/src/components/ui/ScreenHeader.tsx`

- [ ] **Step 1: Replace `mobile/src/components/ui/ScreenHeader.tsx`**

```tsx
import React, { useMemo } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, ColorPalette } from "@/lib/theme";
import { ThemedText } from "@/components/ui/Text";

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function ScreenHeader({ title, onBack, right }: ScreenHeaderProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={s.header}>
      <TouchableOpacity onPress={onBack || (() => router.back())} style={s.backBtn}>
        <ArrowLeft size={24} color={colors.text.primary} />
      </TouchableOpacity>
      <ThemedText weight={700} style={s.title} numberOfLines={1}>
        {title}
      </ThemedText>
      {right || <View style={s.spacer} />}
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    backBtn: { padding: spacing.xs },
    title: { flex: 1, fontSize: fontSize.lg, color: colors.text.primary },
    spacer: { width: 32 },
  });
```

- [ ] **Step 2: Run the suite**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx jest
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git -C /Users/adrianmaenzanise/Projects/Node/your-drive add mobile/src/components/ui/ScreenHeader.tsx
git -C /Users/adrianmaenzanise/Projects/Node/your-drive commit -m "refactor(ui): migrate ScreenHeader to ThemedText"
```

---

## Task 16: Retune `RideResultCard`

**Files:**
- Modify: `mobile/src/components/RideResultCard.tsx`

- [ ] **Step 1: Read the current file**

Run:
```bash
cat /Users/adrianmaenzanise/Projects/Node/your-drive/mobile/src/components/RideResultCard.tsx
```

This is a read-only step to capture the current structure; do not edit yet.

- [ ] **Step 2: Edit `mobile/src/components/RideResultCard.tsx`**

Make the following changes (use `Edit`, not Write — this file is large and we want surgical changes):

  - Add import: `import { ThemedText } from "@/components/ui/Text";`
  - Replace **every** `<Text>` usage inside the file with `<ThemedText>` and copy the existing style prop unchanged. For text whose style had `fontWeight: "700"`, `"bold"`, or numeric `700`, pass `weight={700}` on the `<ThemedText>` and strip the `fontWeight` from the inline style. Same for `600`, `500`, `400` (400 is the `<ThemedText>` default, so the `weight` prop is optional — but still strip the `fontWeight` to avoid a contradictory style overriding the font face).
  - Replace `borderRadius: borderRadius.xl` (or any literal 16) inside the card container's StyleSheet with `borderRadius: borderRadius.card` and remove any `shadowColor`/`shadowOpacity`/`elevation` lines on the card container.
  - Add `borderWidth: 1, borderColor: colors.border` to the card container's style block.

- [ ] **Step 3: Type-check + tests**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx tsc --noEmit && npx jest
```

Expected: TS clean, tests pass.

- [ ] **Step 4: Commit**

```bash
git -C /Users/adrianmaenzanise/Projects/Node/your-drive add mobile/src/components/RideResultCard.tsx
git -C /Users/adrianmaenzanise/Projects/Node/your-drive commit -m "refactor(ride-result-card): align with Pencil tokens + ThemedText"
```

---

## Task 17: Retune `ChauffeurCard`

**Files:**
- Modify: `mobile/src/components/ChauffeurCard.tsx`

Same procedure as Task 16, applied to `ChauffeurCard.tsx`.

- [ ] **Step 1: Edit `mobile/src/components/ChauffeurCard.tsx`**

Apply the same four edits as Task 16, Step 2:
  - Add `ThemedText` import.
  - Swap `<Text>` → `<ThemedText>` everywhere, lifting `fontWeight` to the `weight` prop.
  - Card container radius → `borderRadius.card`, drop shadow lines.
  - Card container gets `borderWidth: 1, borderColor: colors.border`.

- [ ] **Step 2: Type-check + tests**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx tsc --noEmit && npx jest
```

Expected: TS clean, tests pass.

- [ ] **Step 3: Commit**

```bash
git -C /Users/adrianmaenzanise/Projects/Node/your-drive add mobile/src/components/ChauffeurCard.tsx
git -C /Users/adrianmaenzanise/Projects/Node/your-drive commit -m "refactor(chauffeur-card): align with Pencil tokens + ThemedText"
```

---

## Task 18: Retune `RentalCard`

**Files:**
- Modify: `mobile/src/components/RentalCard.tsx`

Same procedure as Task 16, applied to `RentalCard.tsx`.

- [ ] **Step 1: Edit `mobile/src/components/RentalCard.tsx`**

Apply the same four edits as Task 16, Step 2:
  - Add `ThemedText` import.
  - Swap `<Text>` → `<ThemedText>` everywhere, lifting `fontWeight` to the `weight` prop.
  - Card container radius → `borderRadius.card`, drop shadow lines.
  - Card container gets `borderWidth: 1, borderColor: colors.border`.

- [ ] **Step 2: Type-check + tests**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx tsc --noEmit && npx jest
```

Expected: TS clean, tests pass.

- [ ] **Step 3: Commit**

```bash
git -C /Users/adrianmaenzanise/Projects/Node/your-drive add mobile/src/components/RentalCard.tsx
git -C /Users/adrianmaenzanise/Projects/Node/your-drive commit -m "refactor(rental-card): align with Pencil tokens + ThemedText"
```

---

## Task 19: Adopt `<SheetHandle>` in `HomeBottomSheet`

**Files:**
- Modify: `mobile/src/components/HomeBottomSheet.tsx`

- [ ] **Step 1: Read the current file to find the existing handle**

Run:
```bash
cat /Users/adrianmaenzanise/Projects/Node/your-drive/mobile/src/components/HomeBottomSheet.tsx
```

Identify the existing custom handle (if any) — typically a small `<View>` near the top of the sheet's content.

- [ ] **Step 2: Edit `HomeBottomSheet.tsx`**

  - Add import: `import { SheetHandle } from "@/components/ui/SheetHandle";`
  - Replace the existing custom handle block with a single `<SheetHandle />` element rendered at the top of the sheet body. If no custom handle exists, add `<SheetHandle />` as the first child of the sheet body.
  - If the sheet currently uses `handleComponent={null}` on `BottomSheet` from `@gorhom/bottom-sheet`, keep that — we render our own handle. If `@gorhom/bottom-sheet` is rendering its default handle, pass `handleComponent={() => <SheetHandle />}`.

- [ ] **Step 3: Type-check + tests**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx tsc --noEmit && npx jest
```

Expected: TS clean, tests pass.

- [ ] **Step 4: Commit**

```bash
git -C /Users/adrianmaenzanise/Projects/Node/your-drive add mobile/src/components/HomeBottomSheet.tsx
git -C /Users/adrianmaenzanise/Projects/Node/your-drive commit -m "refactor(home-bottom-sheet): use SheetHandle primitive"
```

---

## Task 20: Final verification

**Files:** none modified.

- [ ] **Step 1: Run the full test suite**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx jest
```

Expected: every test passes.

- [ ] **Step 2: Type-check**

Run:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Visual smoke (manual)**

Start the app:
```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile && npx expo start --ios
```

Walk this path and verify visually:
1. Welcome screen — Jost loads (no system font flicker), primary button has the softer `#4CAF50` green and `[14,24]` padding.
2. Login → Sign Up — inputs have `[14,16]` padding, label/help text in Jost, ghost-variant "Forgot Password?" is plain text with primary color (not a filled button).
3. Home → drawer → Search Results — ride result cards use bordered (not shadowed) cards with radius 14.
4. Ride Details — badges show pill shape with `primaryLight` bg + `primaryDark` text.
5. Active Ride — bottom sheet shows the new `SheetHandle` at top.
6. Switch system theme to dark mode — colors recompute to the dark palette without crashing.

If any step regresses, file a follow-up task; do not block the merge for screen-level redesigns (out of scope).

- [ ] **Step 4: Push the branch**

Run:
```bash
git -C /Users/adrianmaenzanise/Projects/Node/your-drive push -u origin feat/pencil-design-system
```

Expected: branch published. Open a PR (or hand off to the user to open).

---

## Notes for the implementer

- **DRY:** When migrating cards (Tasks 16–18) the four edits are identical. If you find a fifth card that needs the same treatment, the pattern lifts; don't extract a helper for two-line StyleSheet changes.
- **YAGNI:** Don't add a `radius` prop to `Card` "for flexibility" — the design system says 14, period.
- **No backwards-compat shims.** If a screen references an old token name (e.g., `colors.text.tertiary` is unchanged so this won't happen — but if it does), update the call site, don't alias the old name.
- **Commit boundaries:** one commit per task. Tasks 16–18 are three commits, not one squashed "refactor cards" commit, because each card is independently revertible.
