# Home Location Picker & Date Strip — Design

**Status:** approved by user, ready for implementation plan
**Why:** the live bus-booking demo failed in front of a client because the home sheet has no usable origin picker (reverse-geocoded landmark is sent as `originCity` and rejected by the server LIKE filter), the date field is effectively stuck on "Today", and autocomplete only returns cities — not specific places like "Avondale" (Harare) or "Kigali Heights" (Kigali). The current Maestro bus flow deep-links straight to `ride/search-results`, bypassing the home sheet entirely (`mobile/.maestro/flows/bus/passenger-book-and-board.yaml:40`), so the test passes while the real UX is broken. This spec replaces those three pieces with a coherent picker + date strip and rewrites the Maestro flow to exercise the real UI.
**Target platform:** iOS first (matches existing Maestro slice); Android continues to work because all touched components are React Native cross-platform.

## Goal

A passenger can:

1. See **From** and **To** at the top of the home screen, with **From** defaulting to "Current location" using their actual GPS-derived city.
2. Tap either field and pick a place by **(a)** dragging the existing home map (pin stays centered, address updates from reverse-geocode), **(b)** typing a place name and tapping a server-side autocomplete result, or **(c)** tapping a "Use current location" chip.
3. Type "Avondale" or "Kigali Heights" and see *those specific places* in autocomplete — restricted to Rwanda and Zimbabwe — not just the parent city.
4. Pick a future departure date in one tap from a horizontal strip (Today, Tomorrow, Sat, Sun…), or open a calendar modal for dates further out.
5. Tap Search and have the request succeed, because the picker extracts the parent city (Google Places `locality`) and sends it as `originCity` / `destinationCity` — matching the existing server `ILIKE` filter without any server schema change.
6. The Maestro `passenger-book-and-board` flow drives the real UI (no deep-link shortcut) and still passes.

## Non-goals

- **Server schema migration.** `Ride.originCity` / `destCity` stay text; `Location.city` stays text. No PostGIS radius filtering yet (noted as follow-up).
- **Map provider swap.** Keep `react-native-maps` with PROVIDER_GOOGLE. No new SDK; no `react-native-google-places-autocomplete`.
- **Bidirectional pickup-spot routing.** Drivers don't yet see passenger pin coordinates on their side. The picker stores `{lat, lng}` per side but only `originCity` / `destCity` are sent today.
- **Saved places / recents.** "RECENT" section in HomeBottomSheet is left as a placeholder; out of scope.
- **Mode toggle redesign.** "Request a Ride" vs "Find a Ride" labels and ordering stay as-is. The user didn't flag this and reordering it widens scope.
- **Translations.** Existing English/Kinyarwanda keys are reused; new copy is added to both bundles but Kinyarwanda translations are a follow-up if any string lands without a translation key.

## Architecture

```
mobile/src/
  components/
    LocationPickerCard.tsx        ← NEW — From/To card top of screen
    LocationSuggestionSheet.tsx   ← NEW — chip + autocomplete + Confirm
    MapPinController.tsx          ← NEW — center crosshair + region listener
    DateStrip.tsx                 ← NEW — horizontal date chips
    DateModal.tsx                 ← NEW — month-grid calendar modal
    HomeBottomSheet.tsx           ← refactor — drop inline date spinner & searchBar
    LocationPicker.tsx            ← refactor — cities mode dropped, addresses mode → suggestion hook
  providers/
    PickerProvider.tsx            ← NEW — { from, to, activeField, mode }
  hooks/
    useAddressAutocomplete.ts     ← refactor — RW+ZW restriction, places (not just cities)
    useCurrentLocation.ts         ← reuse — expose extracted city
  app/
    ride/search-results.tsx       ← reuse — unchanged contract

server/src/controllers/
  public.controller.ts            ← refactor — enforce country restriction server-side
  ride.controller.ts              ← reuse — ILIKE filter unchanged
```

### Component ownership

| Component | Role | Owns state |
|---|---|---|
| `PickerProvider` | Holds `{ from, to, activeField, mode: "idle" \| "picking" }` for the picker triad. | yes |
| `LocationPickerCard` | Renders top-of-screen From/To. Tap → set `activeField`, set `mode="picking"`. | no |
| `LocationSuggestionSheet` | Bottom sheet (snap: peek/half/full). Shows chip, autocomplete results, Confirm. | local query string only |
| `MapPinController` | Renders center pin; subscribes to map `onRegionChangeComplete`; reverse-geocodes and writes to `activeField`. | local debounce timer only |
| `HomeBottomSheet` | Vehicle tabs · DateStrip · passenger stepper · action button. | `vehicleType`, `passengers`, `date`, `mode` (Request/Find), `proposedFare` |
| `DateStrip` | Renders horizontal 7-day strip + "Pick" chip. Tap day → write to HomeBottomSheet `date`. | no |
| `DateModal` | Month-grid calendar in a modal. Confirm writes to HomeBottomSheet `date`. | local `viewMonth`, `pendingDate` |

Each has one job. None of them know about each other's internals — `PickerProvider` is the only shared mutable state, and `HomeBottomSheet` is the only owner of search payload state.

## UX flow & states

### Default (sheet open, nothing picked)

```
┌────────────────────────────────┐
│ [≡]  ┌────────────────────────┐ │ ← top safe area + 10px gap
│      │ ● From                 │ │
│      │   ⊙ Current location   │ │
│      ├────────────────────────┤ │
│      │ ● To                   │ │
│      │   Where to?            │ │
│      └────────────────────────┘ │
│           (home map)            │
│                                 │
│         📍 (center pin)         │
│                                 │
├─────────────────────────────────┤
│   🚗  🚌(on)  🏍                │
│   📅 Today  ··  ⊳ +6 days  │📅│ │ ← DateStrip (horizontal scroll)
│   👤 1 passenger                │
│   [    Search Rides      ]      │
└─────────────────────────────────┘
```

- `From` is pre-populated with the literal text "Current location" + a small ⊙ glyph (not the reverse-geocoded landmark). `PickerProvider.from = { kind: "current", city: <extracted from GPS reverse-geo> }`.
- `To` shows the empty-state placeholder "Where to?".

### Picking (user taps To)

- `activeField = "to"`, `mode = "picking"`.
- The bottom sheet collapses to a slim handle.
- `LocationSuggestionSheet` slides up into the lower half.
- Initial content: "⊙ Use current location" chip (yes, even for To — useful in symmetric scenarios) + recent destinations if any + a hint "Drag the map to set a spot".
- The map center crosshair becomes the active pin. Drag-end → reverse-geocode → fill the `To` label with the address line, set `PickerProvider.to = { kind: "dragged", lat, lng, label, city }`.
- User starts typing in the To field (focus stays on the input): server autocomplete fires (debounced 200ms), replacing the suggestion sheet content with up to 5 places. Tapping a suggestion: recenter the map, set `PickerProvider.to = { kind: "place", placeId, lat, lng, label, city }`, scroll the sheet to show Confirm.
- "Use current location" chip → `Location.getCurrentPositionAsync` → reverse-geocode → `PickerProvider.to = { kind: "current", lat, lng, city }`.
- Confirm → `mode = "idle"`, sheet expands back to full, `LocationPickerCard` shows the picked label for To.

### Picking origin (user taps From)

- Identical flow. `From` row pip turns green, picker context tracks `from`.

### Search

- User taps `home.searchRidesButton`. Payload:
  ```ts
  router.push({
    pathname: "/ride/search-results",
    params: {
      originCity: from.city,           // "Kigali", extracted from picked place or GPS
      destinationCity: to.city,        // "Huye"
      departureDate: date.toISOString().split("T")[0],
      passengers: String(passengers),
      vehicleCategory: vehicleType,    // "CAR" | "MOTORBIKE" | "BUS"
    },
  });
  ```
- Identical to today's payload shape — server `ride.controller.ts:2659-2663` (BUS) and `:695-699` (P2P/D2D) unchanged.

## Autocomplete data flow

### Source

Existing server endpoint `GET /api/v1/public/places/autocomplete` (`server/src/controllers/public.controller.ts`). It proxies Google Places Autocomplete using the server's key (the mobile env key is for MapView render, not Places).

### Changes (server side)

```ts
// public.controller.ts — autocomplete endpoint
// 1. Enforce country restriction server-side regardless of client query
const COUNTRIES = ["rw", "zw"];
const restrictions = `country:${COUNTRIES.join("|")}`;

// 2. Accept ?types= param. Default to a places-broad value, not "(cities)".
//    "geocode" returns addresses + neighborhoods + cities.
//    "establishment" returns businesses + POIs.
//    The mobile picker calls without specifying types → server defaults to
//    a chained two-call merge: establishments first, then geocode, deduped
//    by place_id, capped at 5.
const types = req.query.types || "default"; // "default" = merged places+geocode
```

When `types=default`, the server makes two parallel calls to Google Places Autocomplete (one with `types=establishment`, one with `types=geocode`), merges and de-duplicates by `place_id`, and returns up to 5 results. This is what surfaces "Avondale" (a Harare neighborhood, returned as `geocode`) and "Kigali Heights" (an establishment) in one combined list.

### Changes (mobile side)

```ts
// hooks/useAddressAutocomplete.ts
const { data } = useQuery({
  queryKey: ["places-autocomplete", query],
  queryFn: () => api.get(`/public/places/autocomplete?q=${query}`),
  enabled: query.length >= 2,
  staleTime: 30_000,
});
```

Drops the `types=(cities)` call entirely. The result shape is now `{ placeId, description, mainText, secondaryText }` — same as before, no consumer changes needed.

### City extraction

When a user taps a suggestion, the mobile client calls `GET /api/v1/public/places/details?placeId=...` (already exists). The response includes `address_components`. The mobile client extracts a city using this fallback chain:

```ts
// utils/extractCity.ts (NEW)
export function extractCity(components: AddressComponent[]): string {
  const get = (type: string) =>
    components.find(c => c.types.includes(type))?.long_name;

  return (
    get("locality") ??               // "Kigali", "Harare"
    get("postal_town") ??            // some UK-style entries
    get("administrative_area_level_2") ??  // "Huye District"
    get("administrative_area_level_1") ??  // "Eastern Province"
    get("administrative_area_level_3") ??
    "" // empty string → server filter returns no results, intentional
  );
}
```

Edge case: if `extractCity` returns empty, the picker shows the place label but **disables the Search button** with the inline message "Couldn't determine a city for this place — pick another." This prevents a silent zero-results search.

### Reverse-geocode (pin drag)

`MapPinController` calls `expo-location`'s `Location.reverseGeocodeAsync({ lat, lng })`. Response shape includes `city`, `district`, `region` directly — no extraction needed. Debounced 300ms after `onRegionChangeComplete`. Writes `{ kind: "dragged", lat, lng, label: street || name || city, city }` into the active field.

## Date strip + modal

### Strip

`DateStrip` renders 7 chips: Today, Tomorrow, then the next 5 weekdays by short name (Sat / Sun / Mon …). Each chip shows the day-of-month numeral and a short label below. Bound: today only (no past dates). Tap → set `date`. Selected chip uses the brand-primary background.

A trailing "📅 Pick" chip opens `DateModal`.

### Modal

Month-grid calendar (Sun-start), prev/next month chevrons, today highlighted, selected day filled. Bound: today → today + 60 days. Confirm button reads "Confirm — &lt;day, date&gt;" so the picked date is unambiguous before commit. Cancel restores the prior `date`.

### State

`date` is `Date`. The strip and modal both write the same state in HomeBottomSheet. Initial value: `new Date()` (today).

### Maestro testID

### Maestro testID inventory (additions)

| testID | Element |
|---|---|
| `picker.fromField` | From row in `LocationPickerCard` |
| `picker.toField` | To row in `LocationPickerCard` |
| `picker.useCurrentLocationChip` | "Use current location" chip in suggestion sheet |
| `picker.suggestion.<index>` | Autocomplete result row, 0-indexed |
| `picker.confirm` | Confirm button in suggestion sheet |
| `home.dateStrip.today` | Today chip |
| `home.dateStrip.tomorrow` | Tomorrow chip |
| `home.dateStrip.day.<DDD>` | Weekday chip (e.g. `home.dateStrip.day.SAT`) |
| `home.dateStrip.pick` | "Pick" chip that opens the modal |
| `home.dateModal.day.<YYYY-MM-DD>` | Calendar cell for a specific date |
| `home.dateModal.confirm` | Confirm button in the modal |

## Maestro flow rewrite

`mobile/.maestro/flows/bus/passenger-book-and-board.yaml` drives the real UI:

```yaml
# After login + home.screen visible:

# Set From to current location (already pre-filled, but exercise the chip path)
- tapOn: { id: "picker.fromField" }
- tapOn: { id: "picker.useCurrentLocationChip" }
- tapOn: { id: "picker.confirm" }

# Set To by typing
- tapOn: { id: "picker.toField" }
- inputText: "Huye"
- extendedWaitUntil:
    visible: { id: "picker.suggestion.0" }
    timeout: 5000
- tapOn: { id: "picker.suggestion.0" }
- tapOn: { id: "picker.confirm" }

# Verify date (today is default — tap tomorrow then back to today to prove the strip works)
- tapOn: { id: "home.dateStrip.tomorrow" }
- tapOn: { id: "home.dateStrip.today" }

# Search and continue
- tapOn: { id: "home.vehicleTab.BUS" }
- tapOn: { id: "home.searchRidesButton" }
- extendedWaitUntil:
    visible: { id: "search.list" }
    timeout: 10000
- tapOn: { id: "search.resultCard.${output.busRideId}" }
# … rest unchanged (book → puppet approve → QR → board → complete)
```

The `openLink: "yourdrive://..."` step is **removed**. The 35-line comment block explaining the bypass is deleted. The deep-link route itself stays in the app — it's still useful for shared links from outside the app.

### Permissions

The flow already has `permissions: { all: allow }`. iOS will grant the foreground location permission immediately, so "Use current location" works in the simulator at the seeded coords.

### `setLocation` step

Already present: `setLocation: { latitude: -1.9441, longitude: 30.0619 }` (Kigali). Stays. This makes `Location.getCurrentPositionAsync` return Kigali in the simulator, which the reverse-geocode resolves to `city: "Kigali"`, which matches the seeded bus ride.

## Error handling

| Scenario | UX |
|---|---|
| GPS permission denied | `From` shows "Set pickup location" with no chip. The user must drag the map or type. The search button is disabled until `from.city` is non-empty. |
| Reverse-geocode fails | Map drag still works, but the active field shows "Pinned location" + the coordinates. `from.city` falls back to the previously known city (last successful drag or GPS). If none, search button stays disabled. |
| Autocomplete returns 0 results | Suggestion sheet shows "No places found for '&lt;query&gt;' in Rwanda or Zimbabwe — try a city or landmark." |
| Autocomplete request fails (network) | Suggestion sheet shows an inline error row with a retry button. Pin drag still works. |
| Google Places `details` returns no `locality` component | `extractCity` falls back through admin levels; if still empty, picker shows "Couldn't determine a city for this place — pick another." Confirm is disabled. |

## Testing

| Layer | What | Where |
|---|---|---|
| Unit | `extractCity` against fixtures for Kigali Heights, Avondale, Huye Bus Park, edge cases (no locality) | `mobile/src/utils/__tests__/extractCity.test.ts` |
| Unit | `useAddressAutocomplete` query shape, debounce timing | `mobile/src/hooks/__tests__/useAddressAutocomplete.test.ts` |
| Unit | DateStrip generates 7 correct day labels relative to a fixed "today" | `mobile/src/components/__tests__/DateStrip.test.tsx` |
| Component | `LocationPickerCard` renders default state with `From: Current location` and active-state highlight | RTL render test |
| Maestro | `passenger-book-and-board.yaml` drives the real picker end-to-end | `mobile/.maestro/flows/bus/passenger-book-and-board.yaml` |
| Maestro | New flow `home-picker-paths.yaml` exercises three picker paths (chip / drag / type) without going further into booking | `mobile/.maestro/flows/home-picker-paths.yaml` |
| Manual | Live demo path on iOS sim with GPS allowed, GPS denied, airplane mode | run-book in this spec |

## Phasing

This is one spec, one branch, one PR. Sub-tasks in implementation order:

1. `extractCity` util + tests
2. Server: country restriction + types merge in `public.controller.ts`
3. `useAddressAutocomplete` refactor + tests
4. `PickerProvider` skeleton
5. `MapPinController` + reverse-geocode write-through
6. `LocationSuggestionSheet` + chip + suggestion list + Confirm
7. `LocationPickerCard` + From/To rows
8. `DateStrip` + `DateModal` + tests
9. `HomeBottomSheet` refactor — drop inline searchBar + inline DateTimePicker
10. Maestro flow rewrite — remove deep-link, exercise the new picker
11. Manual QA on iOS sim + Android emulator

## Out of scope / follow-ups

- **Saved places / recents.** "RECENT" section in HomeBottomSheet renders empty for now.
- **Pickup spot exactness on driver side.** Pin lat/lng is captured but only city is sent to search. A driver-side "exact pickup" view comes after.
- **PostGIS radius matching.** Stack has `postgis/postgis:16-3.4-alpine` but we're not using it. Future enhancement.
- **Kinyarwanda translations for new copy.** Add keys; translate later.
- **Mode toggle (Request / Find) redesign.** Not flagged as a pain point; left alone.

## References

- Current sheet bypass: `mobile/.maestro/flows/bus/passenger-book-and-board.yaml:40`
- Sheet body: `mobile/src/components/HomeBottomSheet.tsx:150-320`
- Reverse-geocode hook: `mobile/src/hooks/useCurrentLocation.ts:43-47`
- Existing places autocomplete server: `server/src/controllers/public.controller.ts`
- BUS server filter: `server/src/controllers/ride.controller.ts:2659-2663`
- P2P/D2D server filter: `server/src/controllers/ride.controller.ts:695-699`
- Seed: `server/prisma/seed.test-users.ts:157-166`
- Maestro README: `mobile/.maestro/README.md`
