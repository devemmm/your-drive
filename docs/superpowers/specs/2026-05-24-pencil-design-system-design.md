# Pencil Design System — Apply to Mobile App

**Date:** 2026-05-24
**Status:** Draft — awaiting user review
**Target:** `mobile/` (React Native + Expo)
**Source of truth:** `/Users/adrianmaenzanise/Documents/designs/your-drive.pen`

## Problem

The mobile app has its own token palette (`mobile/src/lib/theme.ts`) and a working set of UI primitives, but they pre-date the Pencil design system and have drifted from it: a brighter Tailwind green, no Jost font, no `secondary` teal, slightly different radii and paddings, and several Pencil primitives (SectionHeading, VehiclePill, BottomNav, SheetHandle, LocationDot) have no mobile equivalent. The result is a working app that doesn't quite look like the design.

## Goal

Align the mobile app's tokens and primitives with the Pencil design system, without redesigning screens. Done means:

- Tokens in `lib/theme.ts` match the values in the Pencil document.
- Jost is the default font across the app.
- Existing primitives (`Button`, `Card`, `Input`, `Badge`) render to Pencil specs.
- Missing primitives (`SectionHeading`, `VehiclePill`, `LocationDot`, `SheetHandle`, `BottomNav`) exist as reusable components.
- Existing screens transparently pick up the new look via `useTheme()` — no screen rewrites in this pass.

## Non-goals

- Redesigning screen layouts to match Pencil frames (Welcome, Login, Sign Up, Home, Search, Ride Details, Active Ride, Ride Complete). That belongs to a follow-up spec after the `feat/test-script-fixes-phase-1b` work lands.
- Touching web client (`client/`) or admin dashboard (`server/`).
- Migrating navigation from drawer to bottom tabs. `BottomNav` is added as a styled primitive only; wiring it as the app's nav is out of scope.
- Animations or motion design (Pencil document doesn't define motion tokens).

## Pencil tokens — current values (snapshot 2026-05-24)

Colors:
```
primary           #4CAF50
primary-dark      #3D8C40
primary-darker    #2F6B32
primary-light     #EAF5EA
primary-mid       #D5EAD6
primary-shade     #5DBE61
secondary         #1A6373
secondary-dark    #154F5C
secondary-light   #E6F0F2
accent            #4CAF50
accent-dark       #3D8C40
accent-light      #EAF5EA
bg-white          #FFFFFF
bg-gray           #F8FAFB
bg-soft-green     #F4FBF4
border            #E5E7EB
border-light      #F0F0F0
text-dark         #0F1F12
text-muted        #6B7280
text-faint        #9CA3AF
success           #4CAF50
warning           #F59E0B
error             #EF4444
```

Typography: Jost (body + heading).

Components (14): Button/Primary, Button/Outline, Button/Ghost, Input, SectionHeading, Card, Badge/Primary, Badge/Outline, VehiclePill, RideRow, BottomNav, SheetHandle, LocationDot, StatusBar.

## Architecture

Single token file (`mobile/src/lib/theme.ts`) consumed via the existing `ThemeProvider`/`useTheme()`. We extend the file additively — new keys land beside old ones, and we don't rename public fields that screens already consume. That keeps the diff focused and the app green at every step.

A small `<ThemedText>` wrapper (new file `components/ui/Text.tsx`) becomes the default text component for primitives. It applies Jost by default and exposes a `weight` prop that selects the right font face. Screens migrate to `<ThemedText>` opportunistically; raw `<Text>` keeps working with the system font as a fallback until migrated.

## Token mapping (mobile ← Pencil)

```ts
// Light palette additions / changes:
primary:        '#4CAF50',          // was #22C55E
primaryDark:    '#3D8C40',          // was #16A34A
primaryDarker:  '#2F6B32',          // NEW
primaryLight:   '#EAF5EA',          // was #DCFCE7
primaryMid:     '#D5EAD6',          // NEW
secondary:      '#1A6373',          // NEW
secondaryDark:  '#154F5C',          // NEW
secondaryLight: '#E6F0F2',          // NEW
surface:        '#F8FAFB',          // was #F9FAFB
surfaceSoftGreen: '#F4FBF4',        // NEW
borderLight:    '#F0F0F0',          // NEW
text.primary:   '#0F1F12',          // was #111827
success:        '#4CAF50',          // was #22C55E (kept = primary)

// Dark palette: keep current structure. Rebase primary to #4CAF50;
// derive primaryLight to a tonal '#1A2F1C'; secondary tokens become
// secondary '#3FA2B5', secondaryLight '#1A2F33'. (Pencil doesn't
// define dark; we extrapolate using lightness inversion.)
```

Radii (additive — existing `sm/md/lg/xl/full` unchanged):
```ts
borderRadius.card  = 14;   // Pencil Card
borderRadius.pill  = 12;   // Pencil VehiclePill
borderRadius.nav   = 20;   // Pencil BottomNav
```

Type scale: add `fontSize.h2 = 24` (alias of `xxl`) for SectionHeading. Existing `xs..title` unchanged.

## Primitive updates

### `components/ui/Button.tsx`
- Add `ghost` variant: transparent fill, primary text, padding `[10,14]`, font `13/600`.
- Primary: padding `[14,24]`, label `15/600`, radius `borderRadius.lg` (12).
- Outline: same padding, 1.5px primary border, primary text.
- Disabled state unchanged (`opacity: 0.5`).

### `components/ui/Card.tsx`
- Radius `borderRadius.card` (14), padding `spacing.lg` (16).
- Default: 1px `border` stroke, no shadow.
- Add optional `elevated?: boolean` prop that re-enables the current shadow (used by bottom sheets / floating cards).

### `components/ui/Input.tsx`
- Wrapper padding `[14,16]`, gap 10, height 52, radius 12.
- Label `14/600`, placeholder `text.secondary`.
- Error border stays `colors.error`; helper text size unchanged.

### `components/ui/Badge.tsx`
- Radius `borderRadius.full`, padding `[4,10]`, font `11/700`.
- Primary: `primaryLight` bg, `primaryDark` text.
- Outline: `bg-white`, 1px border, `text.secondary` text.

## New primitives (`components/ui/`)

### `SectionHeading.tsx`
Props: `{ title: string; subtitle?: string; align?: 'start'|'center' }`. Renders title (24/700), 60×3 accent bar in `primary`, optional subtitle (13/regular `text.secondary`). Vertical gap 10.

### `VehiclePill.tsx`
Props: `{ icon: IconName; label: string; selected?: boolean; onPress?: () => void }`. Vertical layout, icon 22 over label 13/600, padding `[10,12]`, radius `borderRadius.pill`. Selected: `primary` bg / white content. Unselected: `bg-white`, 1px border, `text.primary` content. Used wherever vehicle category is picked.

### `LocationDot.tsx`
Props: `{ kind: 'from'|'to'|'stop'; size?: number }`. Default size 18. From: filled `primary` circle with white inner dot. To: filled `text.primary` ring with white inner dot. Stop: outline ring. Used in ride row / itinerary displays.

### `SheetHandle.tsx`
Props: none. Renders a 48×5 muted (`border`) bar with `borderRadius.full`, centered, top-margin 8. Used at the top of every bottom sheet (`HomeBottomSheet`, etc.).

### `BottomNav.tsx`
Props: `{ items: Array<{ icon: IconName; label: string; active?: boolean; onPress: () => void }> }`. Container padding `[10,16]`, radius `borderRadius.nav`, 1px border. Items: icon 20, label 11/600, active uses `primary`, inactive uses `text.secondary`. Registered but **not wired** into routing in this pass.

### `Text.tsx` (`ThemedText`)
Props: `TextProps & { weight?: 400|500|600|700; size?: keyof fontSize }`. Defaults to Jost 400 at `fontSize.md`. Selects the right Jost face from `weight`. Falls back to `System` font when fonts haven't loaded yet (the splash gate makes this rare in practice).

### Notes — components we are NOT adding
- **RideRow**: existing `RideResultCard`, `ChauffeurCard`, `RentalCard` cover this. We retune those (radius 14, padding 14, border, no shadow) instead of forking a new primitive.
- **StatusBar**: already handled by `expo-status-bar` + `ScreenHeader`. No new component.

## Migrations (touched call sites)

After primitives are updated, these screens/components are touched to consume `<ThemedText>` and the new tokens:

- `components/RideResultCard.tsx`, `ChauffeurCard.tsx`, `RentalCard.tsx` — radius/padding/border alignment, swap inner `<Text>` → `<ThemedText>`.
- `components/HomeBottomSheet.tsx` — adopt `<SheetHandle>` at the top.
- `components/ui/ScreenHeader.tsx` — swap `<Text>` → `<ThemedText>`.

No other screens are edited in this spec. They pick up tokens automatically via `useTheme()`.

## Font loading

Add `@expo-google-fonts/jost` (npm). In `app/_layout.tsx`:

```ts
import { useFonts, Jost_400Regular, Jost_500Medium, Jost_600SemiBold, Jost_700Bold } from '@expo-google-fonts/jost';
// ...
const [fontsLoaded] = useFonts({ Jost_400Regular, Jost_500Medium, Jost_600SemiBold, Jost_700Bold });
if (!fontsLoaded) return null; // splash stays up
```

`ThemeProvider` exposes a `fontsLoaded: boolean` value alongside `colors`. `<ThemedText>` reads it from context and picks the matching Jost face when ready or `'System'` otherwise. (Splash gate makes the fallback rare in practice — it covers the first render frame and any failure mode.)

## Testing

- Snapshot tests (light + dark) for updated primitives: `Button` (primary/outline/ghost), `Card` (default + elevated), `Input` (default + error), `Badge` (primary + outline).
- Snapshot tests for new primitives: `SectionHeading`, `VehiclePill` (selected + unselected), `LocationDot` (from/to/stop), `SheetHandle`, `BottomNav`.
- Existing tests under `mobile/src/components/__tests__/`, `hooks/__tests__/`, `providers/__tests__/`, `utils/__tests__/` must keep passing — primitive APIs are additive.
- Manual visual smoke: Expo Go on iOS sim. Walk Welcome → Login → Sign Up → Home (drawer + bottom sheet) → Search Results → Ride Details → Active Ride. Confirm Jost renders, primary green is `#4CAF50`, cards have borders not shadows, badges have the right pill shape.

## Sequencing (informs the implementation plan)

1. Add `@expo-google-fonts/jost`, build `<ThemedText>`, gate splash in `app/_layout.tsx`. Verify font renders.
2. Extend `lib/theme.ts` with new color tokens, `borderRadius.card/pill/nav`, `fontSize.h2`. Run app — no visual change yet from this step alone except text color, which is intentional.
3. Update `Button`, `Card`, `Input`, `Badge` to the new specs. Snapshot.
4. Add `SectionHeading`, `VehiclePill`, `LocationDot`, `SheetHandle`, `BottomNav` primitives. Snapshot.
5. Migrate `RideResultCard`, `ChauffeurCard`, `RentalCard`, `HomeBottomSheet`, `ScreenHeader` to consume `<ThemedText>` + tuned tokens.
6. Run jest, walk the app, fix regressions.

Each step is one commit, each ends green.

## Open risks

- **Font weight rendering on Android.** `@expo-google-fonts/jost` ships per-weight TTFs and RN matches via `fontFamily` (not `fontWeight`). `<ThemedText>` must map weight prop → family name; we don't rely on `fontWeight` for Jost faces.
- **Dark mode primary contrast.** `#4CAF50` on dark `#0B0F14` is fine for buttons but `primaryLight` (#1A2F1C derived) on dark needs spot-checking with the `Badge/Primary` text. Will verify in step 4.
- **Test-script branch conflicts.** This work touches `lib/theme.ts` and several primitives that `feat/test-script-fixes-phase-1b` is iterating on. We do this work on a fresh branch off the same base and merge after test-script-phase-1b lands, or coordinate sequencing if both need to ship together.
