# Home Location Picker & Date Strip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the home-screen "landmark-as-origin" behavior with a real picker (From/To card + draggable map pin + RW/ZW places autocomplete), swap the inline iOS DateTimePicker for a horizontal date strip with a fallback modal calendar, and rewrite the Maestro bus flow to drive that real UI end-to-end with no deep-link bypass.

**Architecture:** A new `PickerProvider` holds `{ from, to, activeField, mode }`. Three new presentational components — `LocationPickerCard` (top-of-screen From/To), `LocationSuggestionSheet` (chip + autocomplete + Confirm), `MapPinController` (debounced reverse-geocode on the existing home `MapView`) — talk through that provider. Two new date components — `DateStrip` (horizontal 7-day chips + "Pick") and `DateModal` (month grid) — replace the inline `DateTimePicker` inside `HomeBottomSheet`. Server `public.controller.ts` adds a `types=default` merge for places autocomplete (establishment + geocode, dedup by `place_id`) so neighborhood/POI results like "Avondale" and "Kigali Heights" surface. City is extracted from the chosen place's `address_components` (locality → admin levels fallback) so the existing `ILIKE` filter on `Ride.originCity` / `destCity` keeps working without a schema migration.

**Tech Stack:** React Native 0.81 + Expo SDK 54, Expo Router 6, TanStack Query 5, `react-native-maps` (PROVIDER_GOOGLE), `expo-location`, Jest + `jest-expo` + React Native Testing Library (mobile), Jest + `ts-jest` (server), Maestro 2.5.

**Spec:** `docs/superpowers/specs/2026-05-13-location-picker-design.md`

---

## File Structure

### Mobile — new

| File | Responsibility |
|---|---|
| `mobile/jest.config.js` | Jest preset (jest-expo) + module name mapping for `@/*` alias. |
| `mobile/src/utils/extractCity.ts` | Pure function: pick best-effort city from a Google Places `address_components` array. |
| `mobile/src/utils/__tests__/extractCity.test.ts` | Unit tests for `extractCity` covering Kigali Heights, Avondale, Huye Bus Park, missing-locality fallbacks. |
| `mobile/src/providers/PickerProvider.tsx` | Context + `usePicker` hook holding `{ from, to, activeField, mode }`. |
| `mobile/src/providers/__tests__/PickerProvider.test.tsx` | Hook tests for state transitions. |
| `mobile/src/hooks/useReverseGeocode.ts` | Debounced reverse-geocode wrapper around `Location.reverseGeocodeAsync`. |
| `mobile/src/hooks/__tests__/useReverseGeocode.test.ts` | Debounce timing + result shape tests. |
| `mobile/src/components/LocationPickerCard.tsx` | Top-of-screen From/To card. |
| `mobile/src/components/__tests__/LocationPickerCard.test.tsx` | Render states (default / active / picked). |
| `mobile/src/components/LocationSuggestionSheet.tsx` | Bottom sheet hosting chip + suggestion list + Confirm. |
| `mobile/src/components/__tests__/LocationSuggestionSheet.test.tsx` | Suggestion render + tap + chip behavior. |
| `mobile/src/components/MapPinController.tsx` | Center crosshair overlay + region listener wired to active field. |
| `mobile/src/components/__tests__/MapPinController.test.tsx` | Debounce + write-through assertions. |
| `mobile/src/components/DateStrip.tsx` | Horizontal scrollable 7-day strip + "Pick" chip. |
| `mobile/src/components/__tests__/DateStrip.test.tsx` | Strip generation, selected state, tap behavior. |
| `mobile/src/components/DateModal.tsx` | Month-grid calendar modal with Confirm. |
| `mobile/src/components/__tests__/DateModal.test.tsx` | Month nav, day selection, confirm. |
| `mobile/.maestro/flows/home-picker-paths.yaml` | Maestro flow exercising all three picker paths (chip / drag / type). |

### Mobile — modified

| File | Change |
|---|---|
| `mobile/package.json` | Add `"test": "jest"` and `"test:watch": "jest --watch"` scripts. |
| `mobile/src/hooks/usePlaces.ts:99-114` | Re-implement `extractLocation` to use the new `extractCity` util. No public-API change. |
| `mobile/src/hooks/useCurrentLocation.ts` | Expose extracted `city` alongside `address` (additive). |
| `mobile/src/components/HomeBottomSheet.tsx` | Drop inline `LocationPicker` modal usage and inline `DateTimePicker`. Render `DateStrip` instead. Update `handleFindRides` / `handleRequestRide` payload to read from `PickerContext`. |
| `mobile/src/app/(drawer)/index.tsx` | Mount `LocationPickerCard` and `MapPinController` over the existing `<MapView>`. Wrap subtree in `PickerProvider`. |
| `mobile/.maestro/flows/bus/passenger-book-and-board.yaml:40` | Remove `openLink` deep-link step; drive the new picker. |
| `mobile/.maestro/README.md` | Note that bus flows now drive the home picker end-to-end. |

### Server — modified

| File | Change |
|---|---|
| `server/src/controllers/public.controller.ts:67-108` | Refactor `getPlacesAutocompleteAddresses` to optionally accept `types=default` (merge `establishment` + `geocode`). Keep country restriction. |
| `server/src/controllers/__tests__/public.controller.test.ts` | New test file: mock axios, assert two upstream calls merged and deduped by `place_id`, country restriction enforced. |

### NOT changed

- `mobile/src/components/LocationPicker.tsx` — still used by `post-ride/index.tsx` and `SearchCard.tsx`. Leave as-is.
- `mobile/src/app/ride/search-results.tsx` — query param contract unchanged.
- `server/src/controllers/ride.controller.ts` — `ILIKE` filter unchanged.
- Prisma schema, migrations, seed data — all unchanged.

---

## Checkpoints

| After Task | What ships |
|---|---|
| **2** | Mobile test runner bootstrapped + `extractCity` util — green unit tests. **Stop and review.** |
| **3** | Server merge endpoint + tests green. **Stop and review.** |
| **6** | All hooks + provider unit-tested. **Stop and review.** |
| **11** | All picker + date UI components rendered + unit-tested in isolation. **Stop and review.** |
| **14** | Feature live on home screen, manual smoke on iOS sim. **Stop and review.** |
| **17** | Maestro `passenger-book-and-board.yaml` green driving the real UI; manual QA done. **Ship.** |

---

## Task 1: Bootstrap mobile Jest

**Files:**
- Create: `mobile/jest.config.js`
- Modify: `mobile/package.json:5-10`
- Create: `mobile/src/utils/__tests__/smoke.test.ts`

- [ ] **Step 1: Create `mobile/jest.config.js`**

```js
// mobile/jest.config.js
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["@testing-library/jest-native/extend-expect"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@gorhom/.*|lucide-react-native))",
  ],
  testPathIgnorePatterns: ["/node_modules/", "/\\.expo/"],
};
```

- [ ] **Step 2: Add `test` scripts to `mobile/package.json`**

Replace the `"scripts"` block in `mobile/package.json:5-10`:

```json
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "test": "jest",
    "test:watch": "jest --watch"
  },
```

- [ ] **Step 3: Add `jest` to devDependencies if missing**

Check `mobile/package.json` devDependencies — `jest-expo` is present but the bare `jest` peer may not be. Run:

```bash
cd mobile && npm install --save-dev jest@^29
```

Expected: `jest@29.x` added to devDependencies, lockfile updated.

- [ ] **Step 4: Write a smoke test**

Create `mobile/src/utils/__tests__/smoke.test.ts`:

```ts
describe("jest harness", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run it**

```bash
cd mobile && npm test -- --testPathPattern=smoke
```

Expected: 1 test passing in ~3-10s.

- [ ] **Step 6: Commit**

```bash
git add mobile/jest.config.js mobile/package.json mobile/package-lock.json mobile/src/utils/__tests__/smoke.test.ts
git commit -m "test(mobile): bootstrap jest-expo + smoke test"
```

---

## Task 2: `extractCity` util + refactor `extractLocation` to use it

**Files:**
- Create: `mobile/src/utils/extractCity.ts`
- Create: `mobile/src/utils/__tests__/extractCity.test.ts`
- Modify: `mobile/src/hooks/usePlaces.ts:99-114`

- [ ] **Step 1: Write failing tests**

Create `mobile/src/utils/__tests__/extractCity.test.ts`:

```ts
import { extractCity, AddressComponent } from "../extractCity";

const make = (parts: Array<[string, string[]]>): AddressComponent[] =>
  parts.map(([long_name, types]) => ({ long_name, short_name: long_name, types }));

describe("extractCity", () => {
  it("uses locality when present (Kigali Heights → Kigali)", () => {
    const components = make([
      ["Kigali Heights", ["establishment", "point_of_interest"]],
      ["KG 7 Ave", ["route"]],
      ["Kigali", ["locality", "political"]],
      ["Kigali", ["administrative_area_level_1", "political"]],
      ["Rwanda", ["country", "political"]],
    ]);
    expect(extractCity(components)).toBe("Kigali");
  });

  it("uses locality when present (Avondale → Harare)", () => {
    const components = make([
      ["Avondale", ["sublocality", "sublocality_level_1", "political"]],
      ["Harare", ["locality", "political"]],
      ["Harare Province", ["administrative_area_level_1", "political"]],
      ["Zimbabwe", ["country", "political"]],
    ]);
    expect(extractCity(components)).toBe("Harare");
  });

  it("falls back to postal_town when no locality", () => {
    const components = make([
      ["Somewhere", ["postal_town"]],
      ["Region X", ["administrative_area_level_1", "political"]],
    ]);
    expect(extractCity(components)).toBe("Somewhere");
  });

  it("falls back to administrative_area_level_2 (Huye)", () => {
    const components = make([
      ["Huye Bus Park", ["establishment"]],
      ["Huye District", ["administrative_area_level_2", "political"]],
      ["Southern Province", ["administrative_area_level_1", "political"]],
      ["Rwanda", ["country", "political"]],
    ]);
    expect(extractCity(components)).toBe("Huye District");
  });

  it("falls back to administrative_area_level_1 when level_2 is missing", () => {
    const components = make([
      ["Southern Province", ["administrative_area_level_1", "political"]],
      ["Rwanda", ["country", "political"]],
    ]);
    expect(extractCity(components)).toBe("Southern Province");
  });

  it("falls back to administrative_area_level_3 as a last admin step", () => {
    const components = make([
      ["Some Sector", ["administrative_area_level_3", "political"]],
    ]);
    expect(extractCity(components)).toBe("Some Sector");
  });

  it("returns empty string when no usable component exists", () => {
    const components = make([
      ["Bobbins", ["route"]],
      ["12345", ["postal_code"]],
    ]);
    expect(extractCity(components)).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(extractCity([])).toBe("");
  });
});
```

- [ ] **Step 2: Run tests, expect FAIL with module-not-found**

```bash
cd mobile && npm test -- --testPathPattern=extractCity
```

Expected: All 8 tests fail with `Cannot find module '../extractCity'`.

- [ ] **Step 3: Implement `extractCity.ts`**

Create `mobile/src/utils/extractCity.ts`:

```ts
export interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

const PRIORITY: string[] = [
  "locality",
  "postal_town",
  "administrative_area_level_2",
  "administrative_area_level_1",
  "administrative_area_level_3",
];

export function extractCity(components: AddressComponent[]): string {
  for (const type of PRIORITY) {
    const match = components.find((c) => c.types.includes(type));
    if (match) return match.long_name;
  }
  return "";
}
```

- [ ] **Step 4: Run tests, expect all PASS**

```bash
cd mobile && npm test -- --testPathPattern=extractCity
```

Expected: 8 passed, 0 failed.

- [ ] **Step 5: Refactor `extractLocation` in `usePlaces.ts` to use `extractCity`**

In `mobile/src/hooks/usePlaces.ts`, replace lines 99-114 with:

```ts
import { extractCity } from "@/utils/extractCity";

// ... (keep PlaceDetails / ExtractedLocation interfaces above)

export function extractLocation(place: PlaceDetails): ExtractedLocation {
  const getComponent = (types: string[]) => {
    const comp = place.address_components.find((c) => types.some((t) => c.types.includes(t)));
    return comp?.long_name || "";
  };

  return {
    locationName: place.name,
    city: extractCity(place.address_components) || place.name,
    region: getComponent(["administrative_area_level_1"]) || "",
    country: getComponent(["country"]) || "",
    latitude: place.geometry.location.lat,
    longitude: place.geometry.location.lng,
    address: place.formatted_address,
  };
}
```

- [ ] **Step 6: Run the existing tests to confirm no regressions**

```bash
cd mobile && npm test
```

Expected: all tests pass (smoke + extractCity). No other tests exist yet.

- [ ] **Step 7: Commit**

```bash
git add mobile/src/utils/extractCity.ts mobile/src/utils/__tests__/extractCity.test.ts mobile/src/hooks/usePlaces.ts
git commit -m "feat(mobile): add extractCity util with locality/admin fallback chain"
```

### 🛑 CHECKPOINT A — Stop and review

Mobile test runner works; `extractCity` is the canonical city extractor used by `extractLocation`. Anyone reviewing this checkpoint should run `cd mobile && npm test` and see green.

---

## Task 3: Server — merge `types=establishment + geocode` for places autocomplete

**Files:**
- Modify: `server/src/controllers/public.controller.ts:67-108`
- Create: `server/src/controllers/__tests__/public.controller.test.ts`
- Modify: `server/src/middlewares/validators/public.validators.ts` (add optional `types` param)

- [ ] **Step 1: Write the failing controller test**

Create `server/src/controllers/__tests__/public.controller.test.ts`:

```ts
import axios from "axios";
import { Request, Response } from "express";
import { PublicController } from "../public.controller";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

function mockReq(query: Record<string, string>): Request {
  return { query } as unknown as Request;
}
function mockRes() {
  const res: Partial<Response> = {};
  res.json = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res as Response;
}

// matchedData() is normally populated by express-validator middleware. The
// controller calls matchedData() from req — so we shim by passing a req whose
// .query already matches. The express-validator helper in test mode reads
// directly from req[location] when no validation has run.
jest.mock("express-validator", () => ({
  matchedData: (req: any) => req.query,
}));

describe("PublicController.getPlacesAutocompleteAddresses", () => {
  beforeEach(() => jest.clearAllMocks());

  it("merges establishment + geocode results and dedups by place_id", async () => {
    mockedAxios.get
      .mockResolvedValueOnce({
        data: { predictions: [
          { place_id: "est1", description: "Kigali Heights" },
          { place_id: "shared", description: "Some Shared Place" },
        ], status: "OK" },
      })
      .mockResolvedValueOnce({
        data: { predictions: [
          { place_id: "geo1", description: "Avondale, Harare" },
          { place_id: "shared", description: "Some Shared Place" },
        ], status: "OK" },
      });

    const req = mockReq({ input: "test", sessiontoken: "tok", types: "default" });
    const res = mockRes();
    await PublicController.getPlacesAutocompleteAddresses(req, res, jest.fn());

    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    const [firstCall, secondCall] = mockedAxios.get.mock.calls;
    expect(firstCall[1].params.types).toBe("establishment");
    expect(secondCall[1].params.types).toBe("geocode");
    // Both calls must enforce country restriction
    expect(firstCall[1].params.components).toBe("country:rw|country:zw");
    expect(secondCall[1].params.components).toBe("country:rw|country:zw");

    const sent = (res.json as jest.Mock).mock.calls[0][0];
    expect(sent.success).toBe(true);
    const ids = sent.data.predictions.map((p: any) => p.place_id);
    expect(ids).toEqual(["est1", "shared", "geo1"]);
    expect(ids.length).toBe(3); // shared appeared once, deduped
  });

  it("caps results at 5", async () => {
    mockedAxios.get
      .mockResolvedValueOnce({
        data: { predictions: Array.from({ length: 4 }, (_, i) => ({ place_id: `est${i}`, description: `e${i}` })), status: "OK" },
      })
      .mockResolvedValueOnce({
        data: { predictions: Array.from({ length: 4 }, (_, i) => ({ place_id: `geo${i}`, description: `g${i}` })), status: "OK" },
      });
    const req = mockReq({ input: "x", sessiontoken: "t", types: "default" });
    const res = mockRes();
    await PublicController.getPlacesAutocompleteAddresses(req, res, jest.fn());
    const sent = (res.json as jest.Mock).mock.calls[0][0];
    expect(sent.data.predictions.length).toBe(5);
  });

  it("ignores Google ZERO_RESULTS status on one call but still returns the other", async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: { predictions: [], status: "ZERO_RESULTS" } })
      .mockResolvedValueOnce({ data: { predictions: [{ place_id: "geo1", description: "A" }], status: "OK" } });
    const req = mockReq({ input: "x", sessiontoken: "t", types: "default" });
    const res = mockRes();
    await PublicController.getPlacesAutocompleteAddresses(req, res, jest.fn());
    const sent = (res.json as jest.Mock).mock.calls[0][0];
    expect(sent.data.predictions.map((p: any) => p.place_id)).toEqual(["geo1"]);
  });

  it("when types is omitted, makes a single call with no type filter (backwards compat)", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { predictions: [{ place_id: "x", description: "y" }], status: "OK" },
    });
    const req = mockReq({ input: "x", sessiontoken: "t" });
    const res = mockRes();
    await PublicController.getPlacesAutocompleteAddresses(req, res, jest.fn());
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get.mock.calls[0][1].params.types).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test, expect FAIL**

```bash
cd server && npm test -- --testPathPattern=public.controller
```

Expected: 4 tests fail — `types=default` branch doesn't exist; the controller only calls axios once.

- [ ] **Step 3: Add the optional `types` validator**

In `server/src/middlewares/validators/public.validators.ts`, locate the existing `validatePlacesAutocompleteAddresses` (or equivalent — the addresses validator) and add an optional `types` query param:

```ts
import { query } from "express-validator";

export const validatePlacesAutocompleteAddresses = [
  query("input").isString().notEmpty(),
  query("sessiontoken").isString().notEmpty(),
  query("location").optional().isString(),
  query("radius").optional().isNumeric(),
  query("types").optional().isIn(["default"]),
];
```

(If the file shape differs, just append `query("types").optional().isIn(["default"])` to the existing array — leave other rules untouched.)

- [ ] **Step 4: Refactor the controller to handle `types=default`**

Replace `getPlacesAutocompleteAddresses` in `server/src/controllers/public.controller.ts:67-108` with:

```ts
static getPlacesAutocompleteAddresses = catchAsync(async (req: Request, res: Response) => {
    const apiKey = process.env.GOOGLE_SERVER_MAPS_API_KEY;
    const {
        input,
        sessiontoken,
        location,
        radius,
        types,
    } = matchedData<{
        input: string;
        sessiontoken: string;
        location?: string;
        radius?: number;
        types?: "default";
    }>(req, { locations: ['query'] });

    const baseParams: Record<string, unknown> = {
        input,
        components: 'country:rw|country:zw',
        sessiontoken,
        key: apiKey,
    };
    if (location && radius) {
        baseParams.location = location;
        baseParams.radius = radius;
    }

    if (types !== "default") {
        // Backwards-compatible single call (no type filter — Google returns "all").
        const { data } = await axios.get(
            'https://maps.googleapis.com/maps/api/place/autocomplete/json',
            { params: baseParams }
        );
        return res.json({ success: true, data });
    }

    // types=default → fan out establishment + geocode, dedup by place_id, cap 5.
    const [estRes, geoRes] = await Promise.all([
        axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
            params: { ...baseParams, types: "establishment" },
        }),
        axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
            params: { ...baseParams, types: "geocode" },
        }),
    ]);

    const merged: Array<{ place_id: string; [k: string]: unknown }> = [];
    const seen = new Set<string>();
    for (const src of [estRes.data?.predictions ?? [], geoRes.data?.predictions ?? []]) {
        for (const pred of src) {
            if (!pred?.place_id || seen.has(pred.place_id)) continue;
            seen.add(pred.place_id);
            merged.push(pred);
            if (merged.length >= 5) break;
        }
        if (merged.length >= 5) break;
    }

    return res.json({
        success: true,
        data: {
            predictions: merged,
            status: merged.length > 0 ? "OK" : "ZERO_RESULTS",
        },
    });
});
```

- [ ] **Step 5: Run tests, expect all PASS**

```bash
cd server && npm test -- --testPathPattern=public.controller
```

Expected: 4 passed, 0 failed.

- [ ] **Step 6: Run the whole server test suite to confirm no regressions**

```bash
cd server && npm test
```

Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add server/src/controllers/public.controller.ts server/src/middlewares/validators/public.validators.ts server/src/controllers/__tests__/public.controller.test.ts
git commit -m "feat(server): merge establishment+geocode in places autocomplete when types=default"
```

### 🛑 CHECKPOINT B — Stop and review

Server returns merged + deduped results for `types=default`; the existing no-types-filter behavior is preserved for backwards compat. Reviewer should run `cd server && npm test`.

---

## Task 4: `useReverseGeocode` debounced hook

**Files:**
- Create: `mobile/src/hooks/useReverseGeocode.ts`
- Create: `mobile/src/hooks/__tests__/useReverseGeocode.test.ts`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/hooks/__tests__/useReverseGeocode.test.ts`:

```ts
import { renderHook, act, waitFor } from "@testing-library/react-native";
import { useReverseGeocode } from "../useReverseGeocode";

jest.mock("expo-location", () => ({
  reverseGeocodeAsync: jest.fn(),
}));

import * as Location from "expo-location";
const mockReverseGeo = Location.reverseGeocodeAsync as jest.Mock;

describe("useReverseGeocode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("debounces lookups by 300ms", async () => {
    mockReverseGeo.mockResolvedValue([{ city: "Kigali", street: "KG 7 Ave", name: "Place X", district: "Nyarugenge", region: "Kigali" }]);
    const { result } = renderHook(() => useReverseGeocode());

    act(() => result.current.lookup({ latitude: -1.94, longitude: 30.06 }));
    act(() => result.current.lookup({ latitude: -1.95, longitude: 30.07 }));
    act(() => result.current.lookup({ latitude: -1.96, longitude: 30.08 }));

    // No call yet — debounce is pending
    expect(mockReverseGeo).not.toHaveBeenCalled();

    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(mockReverseGeo).toHaveBeenCalledTimes(1));
    expect(mockReverseGeo).toHaveBeenCalledWith({ latitude: -1.96, longitude: 30.08 });
  });

  it("returns { label, city } from the last result", async () => {
    mockReverseGeo.mockResolvedValue([{ city: "Harare", street: "Borrowdale Rd", name: "Borrowdale", district: null, region: null }]);
    const { result } = renderHook(() => useReverseGeocode());
    act(() => result.current.lookup({ latitude: -17.8, longitude: 31.0 }));
    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(result.current.result?.city).toBe("Harare"));
    expect(result.current.result?.label).toBe("Borrowdale Rd");
  });

  it("falls back to name when street is missing", async () => {
    mockReverseGeo.mockResolvedValue([{ city: "Huye", street: null, name: "Bus Park", district: null, region: null }]);
    const { result } = renderHook(() => useReverseGeocode());
    act(() => result.current.lookup({ latitude: -2.59, longitude: 29.73 }));
    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(result.current.result?.label).toBe("Bus Park"));
  });

  it("exposes an error when expo-location throws", async () => {
    mockReverseGeo.mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => useReverseGeocode());
    act(() => result.current.lookup({ latitude: 0, longitude: 0 }));
    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(result.current.error).toBe("network down"));
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
cd mobile && npm test -- --testPathPattern=useReverseGeocode
```

Expected: module-not-found errors.

- [ ] **Step 3: Implement the hook**

Create `mobile/src/hooks/useReverseGeocode.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";

const DEBOUNCE_MS = 300;

export interface ReverseGeocodeResult {
  label: string;
  city: string;
  latitude: number;
  longitude: number;
}

interface UseReverseGeocode {
  result: ReverseGeocodeResult | null;
  error: string | null;
  isLoading: boolean;
  lookup: (coords: { latitude: number; longitude: number }) => void;
  reset: () => void;
}

export function useReverseGeocode(): UseReverseGeocode {
  const [result, setResult] = useState<ReverseGeocodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    lastCoordsRef.current = null;
    setResult(null);
    setError(null);
    setIsLoading(false);
  }, []);

  const lookup = useCallback((coords: { latitude: number; longitude: number }) => {
    lastCoordsRef.current = coords;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const c = lastCoordsRef.current;
      if (!c) return;
      setIsLoading(true);
      setError(null);
      try {
        const [hit] = await Location.reverseGeocodeAsync(c);
        if (hit) {
          const label = hit.street || hit.name || hit.city || "Pinned location";
          const city = hit.city || hit.subregion || hit.region || "";
          setResult({ label, city, latitude: c.latitude, longitude: c.longitude });
        }
      } catch (err: any) {
        setError(err?.message || "Reverse geocode failed");
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { result, error, isLoading, lookup, reset };
}
```

- [ ] **Step 4: Run test, expect all PASS**

```bash
cd mobile && npm test -- --testPathPattern=useReverseGeocode
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/hooks/useReverseGeocode.ts mobile/src/hooks/__tests__/useReverseGeocode.test.ts
git commit -m "feat(mobile): add useReverseGeocode debounced hook for pin drag"
```

---

## Task 5: `PickerProvider` context + `usePicker` hook

**Files:**
- Create: `mobile/src/providers/PickerProvider.tsx`
- Create: `mobile/src/providers/__tests__/PickerProvider.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/providers/__tests__/PickerProvider.test.tsx`:

```tsx
import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { PickerProvider, usePicker } from "../PickerProvider";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PickerProvider>{children}</PickerProvider>
);

describe("PickerProvider", () => {
  it("starts idle with From = current, To = null", () => {
    const { result } = renderHook(() => usePicker(), { wrapper });
    expect(result.current.mode).toBe("idle");
    expect(result.current.activeField).toBeNull();
    expect(result.current.from).toEqual({ kind: "current", label: "Current location", city: "" });
    expect(result.current.to).toBeNull();
  });

  it("activates a field and switches to picking mode", () => {
    const { result } = renderHook(() => usePicker(), { wrapper });
    act(() => result.current.activate("to"));
    expect(result.current.mode).toBe("picking");
    expect(result.current.activeField).toBe("to");
  });

  it("setField writes the picked value to the active field", () => {
    const { result } = renderHook(() => usePicker(), { wrapper });
    act(() => result.current.activate("to"));
    act(() => result.current.setField("to", {
      kind: "place",
      placeId: "p1",
      label: "Huye Bus Park",
      city: "Huye",
      latitude: -2.6,
      longitude: 29.7,
    }));
    expect(result.current.to?.city).toBe("Huye");
    expect(result.current.to?.label).toBe("Huye Bus Park");
  });

  it("confirm() resets to idle but preserves selections", () => {
    const { result } = renderHook(() => usePicker(), { wrapper });
    act(() => result.current.activate("to"));
    act(() => result.current.setField("to", { kind: "place", placeId: "p1", label: "X", city: "Y", latitude: 0, longitude: 0 }));
    act(() => result.current.confirm());
    expect(result.current.mode).toBe("idle");
    expect(result.current.activeField).toBeNull();
    expect(result.current.to?.label).toBe("X");
  });

  it("useCurrentLocationFor('from') sets a current-kind value with the supplied city", () => {
    const { result } = renderHook(() => usePicker(), { wrapper });
    act(() => result.current.useCurrentLocationFor("from", { city: "Kigali", latitude: -1.9, longitude: 30.0 }));
    expect(result.current.from.kind).toBe("current");
    expect(result.current.from.city).toBe("Kigali");
  });

  it("throws if usePicker is used outside the provider", () => {
    const { result } = renderHook(() => {
      try { return usePicker(); } catch (e: any) { return e.message; }
    });
    expect(result.current).toMatch(/PickerProvider/);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

```bash
cd mobile && npm test -- --testPathPattern=PickerProvider
```

- [ ] **Step 3: Implement the provider**

Create `mobile/src/providers/PickerProvider.tsx`:

```tsx
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type PickerFieldName = "from" | "to";
export type PickerMode = "idle" | "picking";

export type PickerValue =
  | { kind: "current"; label: string; city: string; latitude?: number; longitude?: number }
  | { kind: "place"; placeId: string; label: string; city: string; latitude: number; longitude: number }
  | { kind: "dragged"; label: string; city: string; latitude: number; longitude: number };

interface PickerState {
  from: PickerValue;
  to: PickerValue | null;
  activeField: PickerFieldName | null;
  mode: PickerMode;
}

interface PickerActions {
  activate(field: PickerFieldName): void;
  cancel(): void;
  setField(field: PickerFieldName, value: PickerValue): void;
  useCurrentLocationFor(field: PickerFieldName, info: { city: string; latitude?: number; longitude?: number }): void;
  confirm(): void;
}

type PickerContextValue = PickerState & PickerActions;

const PickerContext = createContext<PickerContextValue | null>(null);

const DEFAULT_FROM: PickerValue = { kind: "current", label: "Current location", city: "" };

export function PickerProvider({ children }: { children: React.ReactNode }) {
  const [from, setFrom] = useState<PickerValue>(DEFAULT_FROM);
  const [to, setTo] = useState<PickerValue | null>(null);
  const [activeField, setActiveField] = useState<PickerFieldName | null>(null);
  const [mode, setMode] = useState<PickerMode>("idle");

  const activate = useCallback((field: PickerFieldName) => {
    setActiveField(field);
    setMode("picking");
  }, []);

  const cancel = useCallback(() => {
    setActiveField(null);
    setMode("idle");
  }, []);

  const setField = useCallback((field: PickerFieldName, value: PickerValue) => {
    if (field === "from") setFrom(value);
    else setTo(value);
  }, []);

  const useCurrentLocationFor = useCallback((field: PickerFieldName, info: { city: string; latitude?: number; longitude?: number }) => {
    setField(field, { kind: "current", label: "Current location", city: info.city, latitude: info.latitude, longitude: info.longitude });
  }, [setField]);

  const confirm = useCallback(() => {
    setActiveField(null);
    setMode("idle");
  }, []);

  const value = useMemo<PickerContextValue>(
    () => ({ from, to, activeField, mode, activate, cancel, setField, useCurrentLocationFor, confirm }),
    [from, to, activeField, mode, activate, cancel, setField, useCurrentLocationFor, confirm]
  );

  return <PickerContext.Provider value={value}>{children}</PickerContext.Provider>;
}

export function usePicker(): PickerContextValue {
  const ctx = useContext(PickerContext);
  if (!ctx) throw new Error("usePicker must be used inside a PickerProvider");
  return ctx;
}
```

- [ ] **Step 4: Run, expect PASS**

```bash
cd mobile && npm test -- --testPathPattern=PickerProvider
```

Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/providers/PickerProvider.tsx mobile/src/providers/__tests__/PickerProvider.test.tsx
git commit -m "feat(mobile): add PickerProvider context for From/To state coordination"
```

---

## Task 6: Expose `city` from `useCurrentLocation` + opt addresses autocomplete into the merge

**Files:**
- Modify: `mobile/src/hooks/useCurrentLocation.ts`
- Modify: `mobile/src/hooks/usePlaces.ts:65-78`

- [ ] **Step 1: Update `useCurrentLocation` return type and assignment**

Replace `mobile/src/hooks/useCurrentLocation.ts` entirely with:

```ts
import { useState, useEffect } from "react";
import * as Location from "expo-location";

interface CurrentLocation {
  latitude: number;
  longitude: number;
}

interface UseCurrentLocationResult {
  location: CurrentLocation | null;
  address: string | null;
  city: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCurrentLocation(): UseCurrentLocationResult {
  const [location, setLocation] = useState<CurrentLocation | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchLocation() {
    setIsLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission denied");
        setIsLoading(false);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setLocation(coords);

      const [reverseGeo] = await Location.reverseGeocodeAsync(coords);
      if (reverseGeo) {
        const street = reverseGeo.street || reverseGeo.name || "";
        const cityName = reverseGeo.city || reverseGeo.subregion || "";
        setAddress(street || cityName || "Current Location");
        setCity(cityName);
      }
    } catch (err: any) {
      setError(err.message || "Failed to get location");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchLocation();
  }, []);

  return { location, address, city, isLoading, error, refetch: fetchLocation };
}
```

- [ ] **Step 2: Opt `useAddressAutocomplete` into the merge by passing `types: "default"`**

In `mobile/src/hooks/usePlaces.ts`, replace lines 65-78 with:

```ts
export function useAddressAutocomplete(input: string, sessionToken: string) {
  return useQuery({
    queryKey: ["places", "addresses", "default", input],
    queryFn: async () => {
      if (!input || input.trim().length < 2) return { data: { predictions: [] } };
      return api.get<AutocompleteResponse>("/public/places/autocomplete/addresses", {
        input: input.trim(),
        sessiontoken: sessionToken,
        types: "default",
      });
    },
    enabled: !!input && input.trim().length >= 2,
    staleTime: 60_000,
  });
}
```

The third param `types: "default"` opts this call into the establishment + geocode merge added in Task 3. All existing consumers of `useAddressAutocomplete` (`LocationPicker` in post-ride and SearchCard) get the merged results automatically — same response shape, just broader content. Note the cache key suffix change (`"default"`) so the result doesn't collide with any prior cached miss.

- [ ] **Step 3: Verify no test breakage**

```bash
cd mobile && npm test
```

Expected: all existing tests still pass. (No tests for these hooks specifically — both changes are additive.)

- [ ] **Step 4: Commit**

```bash
git add mobile/src/hooks/useCurrentLocation.ts mobile/src/hooks/usePlaces.ts
git commit -m "feat(mobile): expose city from useCurrentLocation; opt addresses into merge"
```

### 🛑 CHECKPOINT C — Stop and review

All hooks and providers are unit-tested and decoupled. No UI yet. Reviewer should run `cd mobile && npm test` and `cd server && npm test`, both green.

---

## Task 7: `LocationPickerCard` component

**Files:**
- Create: `mobile/src/components/LocationPickerCard.tsx`
- Create: `mobile/src/components/__tests__/LocationPickerCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/components/__tests__/LocationPickerCard.test.tsx`:

```tsx
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { PickerProvider, usePicker } from "@/providers/PickerProvider";
import { LocationPickerCard } from "../LocationPickerCard";

function Probe() {
  const p = usePicker();
  return <></>;
}

function renderWithProvider() {
  return render(
    <PickerProvider>
      <LocationPickerCard />
    </PickerProvider>
  );
}

describe("LocationPickerCard", () => {
  it("renders From row with 'Current location' default label", () => {
    const { getByTestId, getByText } = renderWithProvider();
    expect(getByTestId("picker.fromField")).toBeTruthy();
    expect(getByText("Current location")).toBeTruthy();
  });

  it("renders To row with 'Where to?' placeholder when empty", () => {
    const { getByTestId, getByText } = renderWithProvider();
    expect(getByTestId("picker.toField")).toBeTruthy();
    expect(getByText("Where to?")).toBeTruthy();
  });

  it("tapping the From row activates from in the provider", () => {
    let snapshot: any;
    const Spy = () => { snapshot = usePicker(); return <></>; };
    const { getByTestId } = render(
      <PickerProvider>
        <LocationPickerCard />
        <Spy />
      </PickerProvider>
    );
    fireEvent.press(getByTestId("picker.fromField"));
    expect(snapshot.activeField).toBe("from");
    expect(snapshot.mode).toBe("picking");
  });

  it("highlights the active row with testID suffix", () => {
    const { getByTestId } = renderWithProvider();
    fireEvent.press(getByTestId("picker.toField"));
    expect(getByTestId("picker.toField.active")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

```bash
cd mobile && npm test -- --testPathPattern=LocationPickerCard
```

- [ ] **Step 3: Implement the component**

Create `mobile/src/components/LocationPickerCard.tsx`:

```tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { usePicker } from "@/providers/PickerProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, ColorPalette } from "@/lib/theme";

export function LocationPickerCard() {
  const { from, to, activeField, activate } = usePicker();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const renderRow = (field: "from" | "to") => {
    const value = field === "from" ? from : to;
    const isActive = activeField === field;
    const placeholder = field === "from" ? "Set pickup location" : "Where to?";
    const label = value?.label ?? placeholder;
    const pipStyle = field === "from" ? styles.pipFrom : styles.pipTo;
    const testIDBase = field === "from" ? "picker.fromField" : "picker.toField";

    return (
      <TouchableOpacity
        testID={isActive ? `${testIDBase}.active` : testIDBase}
        accessibilityRole="button"
        activeOpacity={0.7}
        style={[styles.row, isActive && styles.rowActive]}
        onPress={() => activate(field)}
      >
        <View style={[styles.pip, pipStyle]} />
        <View style={styles.rowText}>
          <Text style={styles.label}>{field === "from" ? "From" : "To"}</Text>
          <Text style={value ? styles.value : styles.placeholder} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.card} accessibilityLabel="Location picker">
      {renderRow("from")}
      <View style={styles.divider} />
      {renderRow("to")}
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  rowActive: { backgroundColor: colors.successSurface ?? "#ecfdf5" },
  pip: { width: 9, height: 9, borderRadius: 9 / 2 },
  pipFrom: { backgroundColor: colors.primary },
  pipTo: { backgroundColor: colors.text.primary },
  rowText: { flex: 1 },
  label: { color: colors.text.tertiary, fontSize: fontSize.xs, textTransform: "uppercase", letterSpacing: 0.4 },
  value: { color: colors.text.primary, fontSize: fontSize.md, fontWeight: "500" },
  placeholder: { color: colors.text.tertiary, fontSize: fontSize.md },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
```

> If `colors.successSurface` is not present in the theme, leave it as the fallback `"#ecfdf5"`. If `fontSize.xs` is missing, use `10`.

- [ ] **Step 4: Run, expect PASS**

```bash
cd mobile && npm test -- --testPathPattern=LocationPickerCard
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/LocationPickerCard.tsx mobile/src/components/__tests__/LocationPickerCard.test.tsx
git commit -m "feat(mobile): add LocationPickerCard with From/To rows"
```

---

## Task 8: `LocationSuggestionSheet` component

**Files:**
- Create: `mobile/src/components/LocationSuggestionSheet.tsx`
- Create: `mobile/src/components/__tests__/LocationSuggestionSheet.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/components/__tests__/LocationSuggestionSheet.test.tsx`:

```tsx
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { PickerProvider } from "@/providers/PickerProvider";
import { LocationSuggestionSheet } from "../LocationSuggestionSheet";

const wrap = (ui: React.ReactNode) => render(<PickerProvider>{ui}</PickerProvider>);

describe("LocationSuggestionSheet", () => {
  it("does not render when mode is idle", () => {
    const { queryByTestId } = wrap(
      <LocationSuggestionSheet
        query=""
        onQueryChange={() => {}}
        suggestions={[]}
        onSuggestionPress={() => {}}
        onUseCurrentLocation={() => {}}
        onConfirm={() => {}}
      />
    );
    expect(queryByTestId("picker.suggestionSheet")).toBeNull();
  });

  it("shows the 'Use current location' chip and Confirm button when picking", () => {
    function Activate() {
      const p = require("@/providers/PickerProvider").usePicker();
      React.useEffect(() => { p.activate("to"); }, [p]);
      return null;
    }
    const { getByTestId } = wrap(
      <>
        <Activate />
        <LocationSuggestionSheet
          query=""
          onQueryChange={() => {}}
          suggestions={[]}
          onSuggestionPress={() => {}}
          onUseCurrentLocation={() => {}}
          onConfirm={() => {}}
        />
      </>
    );
    expect(getByTestId("picker.suggestionSheet")).toBeTruthy();
    expect(getByTestId("picker.useCurrentLocationChip")).toBeTruthy();
    expect(getByTestId("picker.confirm")).toBeTruthy();
  });

  it("renders suggestions with index testIDs and fires onSuggestionPress", () => {
    function Activate() {
      const p = require("@/providers/PickerProvider").usePicker();
      React.useEffect(() => { p.activate("to"); }, [p]);
      return null;
    }
    const onPress = jest.fn();
    const { getByTestId } = wrap(
      <>
        <Activate />
        <LocationSuggestionSheet
          query="huy"
          onQueryChange={() => {}}
          suggestions={[
            { place_id: "p1", description: "Huye Bus Park", structured_formatting: { main_text: "Huye Bus Park", secondary_text: "Avenue de la Préfecture" } },
            { place_id: "p2", description: "Huye District", structured_formatting: { main_text: "Huye District", secondary_text: "Southern Province" } },
          ]}
          onSuggestionPress={onPress}
          onUseCurrentLocation={() => {}}
          onConfirm={() => {}}
        />
      </>
    );
    fireEvent.press(getByTestId("picker.suggestion.0"));
    expect(onPress).toHaveBeenCalledWith(expect.objectContaining({ place_id: "p1" }));
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

```bash
cd mobile && npm test -- --testPathPattern=LocationSuggestionSheet
```

- [ ] **Step 3: Implement the component**

Create `mobile/src/components/LocationSuggestionSheet.tsx`:

```tsx
import React from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet, TextInput } from "react-native";
import { MapPin, Crosshair } from "lucide-react-native";
import { usePicker } from "@/providers/PickerProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, ColorPalette } from "@/lib/theme";
import type { PlacePrediction } from "@/hooks/usePlaces";

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  suggestions: PlacePrediction[];
  onSuggestionPress: (p: PlacePrediction) => void;
  onUseCurrentLocation: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function LocationSuggestionSheet({
  query, onQueryChange, suggestions, onSuggestionPress, onUseCurrentLocation, onConfirm, isLoading,
}: Props) {
  const { mode, activeField } = usePicker();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  if (mode !== "picking") return null;

  return (
    <View testID="picker.suggestionSheet" style={styles.sheet}>
      <View style={styles.handle} />
      <TextInput
        testID="picker.searchInput"
        placeholder={activeField === "from" ? "Search pickup" : "Search destination"}
        placeholderTextColor={colors.text.tertiary}
        value={query}
        onChangeText={onQueryChange}
        autoFocus
        style={styles.input}
      />
      <TouchableOpacity
        testID="picker.useCurrentLocationChip"
        accessibilityRole="button"
        onPress={onUseCurrentLocation}
        style={styles.chip}
        activeOpacity={0.7}
      >
        <Crosshair size={14} color={colors.primary} />
        <Text style={styles.chipText}>Use current location</Text>
      </TouchableOpacity>
      <FlatList
        data={suggestions}
        keyExtractor={(item) => item.place_id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item, index }) => (
          <TouchableOpacity
            testID={`picker.suggestion.${index}`}
            accessibilityRole="button"
            onPress={() => onSuggestionPress(item)}
            style={styles.row}
            activeOpacity={0.7}
          >
            <MapPin size={16} color={colors.primary} />
            <View style={styles.rowText}>
              <Text style={styles.rowMain} numberOfLines={1}>{item.structured_formatting.main_text}</Text>
              <Text style={styles.rowSub} numberOfLines={1}>{item.structured_formatting.secondary_text}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          query.length >= 2 && !isLoading
            ? <Text style={styles.empty}>No places found in Rwanda or Zimbabwe — try a city or landmark.</Text>
            : null
        }
        style={styles.list}
      />
      <TouchableOpacity testID="picker.confirm" accessibilityRole="button" onPress={onConfirm} style={styles.confirm} activeOpacity={0.85}>
        <Text style={styles.confirmText}>Confirm</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: spacing.lg,
    maxHeight: "60%",
  },
  handle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: "center", marginTop: spacing.sm },
  input: {
    backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    marginHorizontal: spacing.md, marginTop: spacing.sm, color: colors.text.primary, fontSize: fontSize.md,
  },
  chip: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    alignSelf: "flex-start", marginHorizontal: spacing.md, marginTop: spacing.sm,
    backgroundColor: colors.successSurface ?? "#ecfdf5",
    borderColor: colors.successBorder ?? "#a7f3d0", borderWidth: 1,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 999,
  },
  chipText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: "500" },
  list: { marginTop: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  rowText: { flex: 1 },
  rowMain: { color: colors.text.primary, fontSize: fontSize.md, fontWeight: "500" },
  rowSub: { color: colors.text.tertiary, fontSize: fontSize.sm, marginTop: 2 },
  empty: { textAlign: "center", color: colors.text.tertiary, paddingVertical: spacing.lg, paddingHorizontal: spacing.md },
  confirm: { backgroundColor: colors.primary, marginHorizontal: spacing.md, marginTop: spacing.sm, paddingVertical: spacing.md, borderRadius: 10, alignItems: "center" },
  confirmText: { color: colors.text.inverse ?? "#ffffff", fontWeight: "600", fontSize: fontSize.md },
});
```

> If theme tokens `colors.successSurface`, `colors.successBorder`, or `colors.text.inverse` don't exist, use the fallback literals already in place.

- [ ] **Step 4: Run, expect PASS**

```bash
cd mobile && npm test -- --testPathPattern=LocationSuggestionSheet
```

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/LocationSuggestionSheet.tsx mobile/src/components/__tests__/LocationSuggestionSheet.test.tsx
git commit -m "feat(mobile): add LocationSuggestionSheet with chip + autocomplete + confirm"
```

---

## Task 9: `MapPinController` overlay

**Files:**
- Create: `mobile/src/components/MapPinController.tsx`
- Create: `mobile/src/components/__tests__/MapPinController.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/components/__tests__/MapPinController.test.tsx`:

```tsx
import React from "react";
import { render, act } from "@testing-library/react-native";
import { PickerProvider, usePicker } from "@/providers/PickerProvider";
import { MapPinController } from "../MapPinController";

jest.mock("@/hooks/useReverseGeocode", () => ({
  useReverseGeocode: () => ({
    result: null, error: null, isLoading: false,
    lookup: jest.fn(),
    reset: jest.fn(),
  }),
}));

describe("MapPinController", () => {
  it("does not render the pin when mode is idle", () => {
    const { queryByTestId } = render(
      <PickerProvider>
        <MapPinController onRegionChange={() => {}} />
      </PickerProvider>
    );
    expect(queryByTestId("picker.centerPin")).toBeNull();
  });

  it("renders the pin when picker is active", () => {
    function Activate() {
      const p = usePicker();
      React.useEffect(() => { p.activate("to"); }, [p]);
      return null;
    }
    const { getByTestId } = render(
      <PickerProvider>
        <Activate />
        <MapPinController onRegionChange={() => {}} />
      </PickerProvider>
    );
    expect(getByTestId("picker.centerPin")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

```bash
cd mobile && npm test -- --testPathPattern=MapPinController
```

- [ ] **Step 3: Implement the component**

Create `mobile/src/components/MapPinController.tsx`:

```tsx
import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { MapPin } from "lucide-react-native";
import { usePicker } from "@/providers/PickerProvider";
import { useReverseGeocode } from "@/hooks/useReverseGeocode";
import { useTheme } from "@/providers/ThemeProvider";

interface Region { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number; }

interface Props {
  onRegionChange?: (r: Region) => void;
}

/**
 * Renders the center-of-map crosshair pin when the picker is in "picking" mode.
 * Subscribes to picker.activeField + a region-change stream (driven by the host
 * screen via `register`) to debounce reverse-geocode and write the result back
 * into the active picker field.
 */
export function MapPinController({ onRegionChange }: Props) {
  const { mode, activeField, setField } = usePicker();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const reverseGeo = useReverseGeocode();

  useEffect(() => {
    if (!reverseGeo.result || !activeField) return;
    setField(activeField, {
      kind: "dragged",
      label: reverseGeo.result.label,
      city: reverseGeo.result.city,
      latitude: reverseGeo.result.latitude,
      longitude: reverseGeo.result.longitude,
    });
  }, [reverseGeo.result, activeField, setField]);

  // The host screen calls handleRegionChange when the MapView region settles.
  const handleRegionChange = (region: Region) => {
    onRegionChange?.(region);
    if (mode === "picking") {
      reverseGeo.lookup({ latitude: region.latitude, longitude: region.longitude });
    }
  };

  // Expose handleRegionChange via a ref attached to the host through a sibling effect.
  // For simplicity in the host, we re-export the handler as a hook below.
  (MapPinController as any).__lastHandler = handleRegionChange;

  if (mode !== "picking") return null;

  return (
    <View pointerEvents="none" style={styles.wrapper} testID="picker.centerPin">
      <MapPin size={36} color={colors.primary} />
    </View>
  );
}

/**
 * Hook variant for the host: returns `{ pin, onRegionChange }` so the screen
 * can render the pin AND wire the region listener with a single call.
 */
export function useMapPinController() {
  const picker = usePicker();
  const reverseGeo = useReverseGeocode();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  useEffect(() => {
    if (!reverseGeo.result || !picker.activeField) return;
    picker.setField(picker.activeField, {
      kind: "dragged",
      label: reverseGeo.result.label,
      city: reverseGeo.result.city,
      latitude: reverseGeo.result.latitude,
      longitude: reverseGeo.result.longitude,
    });
  }, [reverseGeo.result, picker.activeField, picker.setField]);

  const onRegionChange = (region: Region) => {
    if (picker.mode === "picking") {
      reverseGeo.lookup({ latitude: region.latitude, longitude: region.longitude });
    }
  };

  const pin = picker.mode === "picking" ? (
    <View pointerEvents="none" style={styles.wrapper} testID="picker.centerPin">
      <MapPin size={36} color={colors.primary} />
    </View>
  ) : null;

  return { pin, onRegionChange };
}

const makeStyles = (colors: any) => StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: "40%",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
});
```

- [ ] **Step 4: Run, expect PASS**

```bash
cd mobile && npm test -- --testPathPattern=MapPinController
```

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/MapPinController.tsx mobile/src/components/__tests__/MapPinController.test.tsx
git commit -m "feat(mobile): add MapPinController + useMapPinController for pin-drag picker"
```

---

## Task 10: `DateStrip` component

**Files:**
- Create: `mobile/src/components/DateStrip.tsx`
- Create: `mobile/src/components/__tests__/DateStrip.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/components/__tests__/DateStrip.test.tsx`:

```tsx
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { DateStrip } from "../DateStrip";

describe("DateStrip", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-13T10:00:00Z")); // Wed
  });
  afterAll(() => jest.useRealTimers());

  it("renders Today + Tomorrow + 5 weekday chips + Pick chip", () => {
    const { getByTestId } = render(<DateStrip value={new Date("2026-05-13")} onChange={() => {}} onPickPress={() => {}} />);
    expect(getByTestId("home.dateStrip.today")).toBeTruthy();
    expect(getByTestId("home.dateStrip.tomorrow")).toBeTruthy();
    expect(getByTestId("home.dateStrip.pick")).toBeTruthy();
  });

  it("today chip is selected when value is today", () => {
    const { getByTestId } = render(<DateStrip value={new Date("2026-05-13")} onChange={() => {}} onPickPress={() => {}} />);
    expect(getByTestId("home.dateStrip.today.selected")).toBeTruthy();
  });

  it("tapping a chip calls onChange with that date", () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<DateStrip value={new Date("2026-05-13")} onChange={onChange} onPickPress={() => {}} />);
    fireEvent.press(getByTestId("home.dateStrip.tomorrow"));
    const called = onChange.mock.calls[0][0] as Date;
    expect(called.toISOString().split("T")[0]).toBe("2026-05-14");
  });

  it("tapping Pick calls onPickPress", () => {
    const onPick = jest.fn();
    const { getByTestId } = render(<DateStrip value={new Date("2026-05-13")} onChange={() => {}} onPickPress={onPick} />);
    fireEvent.press(getByTestId("home.dateStrip.pick"));
    expect(onPick).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

```bash
cd mobile && npm test -- --testPathPattern=DateStrip
```

- [ ] **Step 3: Implement the component**

Create `mobile/src/components/DateStrip.tsx`:

```tsx
import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Calendar } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, ColorPalette } from "@/lib/theme";

interface Props {
  value: Date;
  onChange: (date: Date) => void;
  onPickPress: () => void;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function DateStrip({ value, onChange, onPickPress }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const today = useMemo(() => new Date(), []);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(today, i)), [today]);

  const renderChip = (date: Date, label: string, testID: string) => {
    const selected = sameDay(date, value);
    return (
      <TouchableOpacity
        key={testID}
        testID={selected ? `${testID}.selected` : testID}
        onPress={() => onChange(date)}
        activeOpacity={0.7}
        style={[styles.chip, selected && styles.chipSelected]}
      >
        <Text style={[styles.chipNum, selected && styles.chipNumSelected]}>{date.getDate()}</Text>
        <Text style={[styles.chipLbl, selected && styles.chipLblSelected]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {renderChip(days[0], "Today", "home.dateStrip.today")}
      {renderChip(days[1], "Tomorrow", "home.dateStrip.tomorrow")}
      {days.slice(2).map((d) =>
        renderChip(d, DAY_NAMES[d.getDay()], `home.dateStrip.day.${DAY_NAMES[d.getDay()].toUpperCase()}`)
      )}
      <TouchableOpacity
        testID="home.dateStrip.pick"
        onPress={onPickPress}
        activeOpacity={0.7}
        style={[styles.chip, styles.chipPick]}
      >
        <Calendar size={16} color={colors.text.secondary} />
        <Text style={styles.chipLbl}>Pick</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  row: { gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chip: {
    width: 64, paddingVertical: spacing.xs, borderRadius: 10,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipPick: { backgroundColor: colors.surface, borderStyle: "dashed" },
  chipNum: { color: colors.text.primary, fontSize: fontSize.lg, fontWeight: "700" },
  chipNumSelected: { color: colors.text.inverse ?? "#ffffff" },
  chipLbl: { color: colors.text.secondary, fontSize: fontSize.xs },
  chipLblSelected: { color: colors.text.inverse ?? "#ffffff" },
});
```

- [ ] **Step 4: Run, expect PASS**

```bash
cd mobile && npm test -- --testPathPattern=DateStrip
```

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/DateStrip.tsx mobile/src/components/__tests__/DateStrip.test.tsx
git commit -m "feat(mobile): add DateStrip — horizontal 7-day chips + Pick modal trigger"
```

---

## Task 11: `DateModal` component

**Files:**
- Create: `mobile/src/components/DateModal.tsx`
- Create: `mobile/src/components/__tests__/DateModal.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/components/__tests__/DateModal.test.tsx`:

```tsx
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { DateModal } from "../DateModal";

describe("DateModal", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-13T10:00:00Z"));
  });
  afterAll(() => jest.useRealTimers());

  it("renders today highlighted", () => {
    const { getByTestId } = render(
      <DateModal visible value={new Date("2026-05-13")} onConfirm={() => {}} onCancel={() => {}} />
    );
    expect(getByTestId("home.dateModal.day.2026-05-13.today")).toBeTruthy();
  });

  it("disables Confirm until a different day is picked? — Confirm is always enabled with current selection", () => {
    const onConfirm = jest.fn();
    const { getByTestId } = render(
      <DateModal visible value={new Date("2026-05-13")} onConfirm={onConfirm} onCancel={() => {}} />
    );
    fireEvent.press(getByTestId("home.dateModal.confirm"));
    expect(onConfirm).toHaveBeenCalledWith(expect.any(Date));
    const arg = onConfirm.mock.calls[0][0] as Date;
    expect(arg.toISOString().split("T")[0]).toBe("2026-05-13");
  });

  it("tapping a future day selects it and Confirm passes that date", () => {
    const onConfirm = jest.fn();
    const { getByTestId } = render(
      <DateModal visible value={new Date("2026-05-13")} onConfirm={onConfirm} onCancel={() => {}} />
    );
    fireEvent.press(getByTestId("home.dateModal.day.2026-05-20"));
    fireEvent.press(getByTestId("home.dateModal.confirm"));
    const arg = onConfirm.mock.calls[0][0] as Date;
    expect(arg.toISOString().split("T")[0]).toBe("2026-05-20");
  });

  it("does not render past days as tappable", () => {
    const { queryByTestId } = render(
      <DateModal visible value={new Date("2026-05-13")} onConfirm={() => {}} onCancel={() => {}} />
    );
    // May 1 is in the past relative to "today" 2026-05-13
    expect(queryByTestId("home.dateModal.day.2026-05-01")).toBeNull();
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

```bash
cd mobile && npm test -- --testPathPattern=DateModal
```

- [ ] **Step 3: Implement the component**

Create `mobile/src/components/DateModal.tsx`:

```tsx
import React, { useMemo, useState } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, ColorPalette } from "@/lib/theme";

interface Props {
  visible: boolean;
  value: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
  maxDays?: number;
}

const DAY_HEADERS = ["S", "M", "T", "W", "T", "F", "S"];

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function sameDay(a: Date, b: Date) { return startOfDay(a).getTime() === startOfDay(b).getTime(); }
function isoDay(d: Date) { return d.toISOString().split("T")[0]; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function daysInMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth()+1, 0).getDate(); }
function monthLabel(d: Date) { return d.toLocaleDateString(undefined, { month: "long", year: "numeric" }); }
function dayLabel(d: Date) { return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); }

export function DateModal({ visible, value, onConfirm, onCancel, maxDays = 60 }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const today = useMemo(() => startOfDay(new Date()), []);
  const max = useMemo(() => addDays(today, maxDays), [today, maxDays]);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(value));
  const [pending, setPending] = useState(value);

  const cells = useMemo(() => {
    const first = startOfMonth(viewMonth);
    const total = daysInMonth(viewMonth);
    const leadingBlanks = first.getDay();
    const out: Array<Date | null> = Array(leadingBlanks).fill(null);
    for (let day = 1; day <= total; day++) out.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [viewMonth]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.scrim} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.head}>
            <TouchableOpacity onPress={() => setViewMonth(addDays(viewMonth, -daysInMonth(viewMonth)))}>
              <ChevronLeft color={colors.text.secondary} size={20} />
            </TouchableOpacity>
            <Text style={styles.headLabel}>{monthLabel(viewMonth)}</Text>
            <TouchableOpacity onPress={() => setViewMonth(addDays(viewMonth, daysInMonth(viewMonth)))}>
              <ChevronRight color={colors.text.secondary} size={20} />
            </TouchableOpacity>
          </View>
          <View style={styles.dayHeaderRow}>
            {DAY_HEADERS.map((h, i) => <Text key={i} style={styles.dayHeader}>{h}</Text>)}
          </View>
          <View style={styles.grid}>
            {cells.map((cell, i) => {
              if (!cell) return <View key={i} style={styles.cell} />;
              const isToday = sameDay(cell, today);
              const isPast = cell.getTime() < today.getTime();
              const isFuture = cell.getTime() > max.getTime();
              const isSelected = sameDay(cell, pending);
              if (isPast || isFuture) return <View key={i} style={[styles.cell, styles.cellMuted]}><Text style={styles.cellTextMuted}>{cell.getDate()}</Text></View>;
              return (
                <TouchableOpacity
                  key={i}
                  testID={isToday ? `home.dateModal.day.${isoDay(cell)}.today` : `home.dateModal.day.${isoDay(cell)}`}
                  onPress={() => setPending(cell)}
                  style={[styles.cell, isToday && styles.cellToday, isSelected && styles.cellSelected]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cellText, isSelected && styles.cellTextSelected]}>{cell.getDate()}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            testID="home.dateModal.confirm"
            onPress={() => onConfirm(pending)}
            activeOpacity={0.85}
            style={styles.confirm}
          >
            <Text style={styles.confirmText}>Confirm — {dayLabel(pending)}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: 14, overflow: "hidden" },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  headLabel: { color: colors.text.primary, fontWeight: "600", fontSize: fontSize.md },
  dayHeaderRow: { flexDirection: "row", paddingHorizontal: spacing.sm },
  dayHeader: { flex: 1, textAlign: "center", color: colors.text.tertiary, fontSize: fontSize.xs, paddingVertical: spacing.xs },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  cell: { width: `${100/7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  cellMuted: { opacity: 0.4 },
  cellToday: { backgroundColor: colors.successSurface ?? "#ecfdf5", borderRadius: 99 },
  cellSelected: { backgroundColor: colors.primary, borderRadius: 99 },
  cellText: { color: colors.text.primary, fontSize: fontSize.sm },
  cellTextMuted: { color: colors.text.tertiary, fontSize: fontSize.sm },
  cellTextSelected: { color: colors.text.inverse ?? "#ffffff", fontWeight: "600" },
  confirm: { backgroundColor: colors.primary, paddingVertical: spacing.md, alignItems: "center" },
  confirmText: { color: colors.text.inverse ?? "#ffffff", fontWeight: "600", fontSize: fontSize.md },
});
```

- [ ] **Step 4: Run, expect PASS**

```bash
cd mobile && npm test -- --testPathPattern=DateModal
```

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/DateModal.tsx mobile/src/components/__tests__/DateModal.test.tsx
git commit -m "feat(mobile): add DateModal — month-grid calendar with Confirm"
```

### 🛑 CHECKPOINT D — Stop and review

All five new UI components rendered + unit-tested in isolation: `LocationPickerCard`, `LocationSuggestionSheet`, `MapPinController`, `DateStrip`, `DateModal`. Reviewer should `cd mobile && npm test` and see green.

---

## Task 12: Mount picker layer on home screen

**Files:**
- Modify: `mobile/src/app/(drawer)/index.tsx`

- [ ] **Step 1: Read the current home file**

Confirm the `<MapView>` mount, `onRegionChangeComplete` wiring, and bottom-sheet placement. Note the imports at top.

- [ ] **Step 2: Wrap home subtree in `PickerProvider`, render `LocationPickerCard` + pin overlay**

In `mobile/src/app/(drawer)/index.tsx`:

```tsx
// Add imports
import { PickerProvider, usePicker } from "@/providers/PickerProvider";
import { LocationPickerCard } from "@/components/LocationPickerCard";
import { LocationSuggestionSheet } from "@/components/LocationSuggestionSheet";
import { useMapPinController } from "@/components/MapPinController";
import { useAddressAutocomplete, usePlacesSessionToken, fetchPlaceDetails } from "@/hooks/usePlaces";
import { extractCity } from "@/utils/extractCity";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
```

Wrap the top-level returned tree in `<PickerProvider>`. Inside it, mount a new presentational `HomePickerOverlay` component (defined inline below) that owns the picker state machine. Pseudocode for the JSX structure:

```tsx
function HomePickerOverlay() {
  const picker = usePicker();
  const { city: gpsCity, location: gpsCoords } = useCurrentLocation();
  const sessionToken = usePlacesSessionToken();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 200); // implement inline or in a small helper
  const { data: autocomplete, isLoading } = useAddressAutocomplete(debouncedQuery, sessionToken);
  const { pin, onRegionChange } = useMapPinController();

  // Map needs to receive onRegionChange and the pin overlay needs to render
  // outside the bottom sheet but above the MapView. The host wires these.

  const onUseCurrent = useCallback(() => {
    if (!picker.activeField) return;
    picker.useCurrentLocationFor(picker.activeField, {
      city: gpsCity ?? "",
      latitude: gpsCoords?.latitude,
      longitude: gpsCoords?.longitude,
    });
  }, [picker, gpsCity, gpsCoords]);

  const onSuggestionPress = useCallback(async (p) => {
    if (!picker.activeField) return;
    const details = await fetchPlaceDetails(p.place_id, sessionToken);
    if (!details) return;
    const city = extractCity(details.address_components) || details.name;
    picker.setField(picker.activeField, {
      kind: "place",
      placeId: p.place_id,
      label: details.name || p.structured_formatting.main_text,
      city,
      latitude: details.geometry.location.lat,
      longitude: details.geometry.location.lng,
    });
    setQuery("");
  }, [picker, sessionToken]);

  return (
    <>
      <View style={styles.pickerCardWrap}>
        <LocationPickerCard />
      </View>
      {pin}
      <LocationSuggestionSheet
        query={query}
        onQueryChange={setQuery}
        suggestions={autocomplete?.data?.predictions ?? []}
        onSuggestionPress={onSuggestionPress}
        onUseCurrentLocation={onUseCurrent}
        onConfirm={() => picker.confirm()}
        isLoading={isLoading}
      />
    </>
  );
}
```

In the existing home screen JSX, find the `<MapView ... onRegionChangeComplete={handleRegionChangeComplete}>` and chain both handlers via a ref that `HomePickerOverlay` populates:

```tsx
// In the home screen component body (next to the existing `bounds` state):
const overlayRegionRef = useRef<((r: Region) => void) | null>(null);

<MapView
  // ...existing props
  onRegionChangeComplete={(r) => {
    handleRegionChangeComplete(r);
    overlayRegionRef.current?.(r);
  }}
>
```

Then in `HomePickerOverlay`, expose the picker controller's region handler through the ref via a `useEffect`:

```tsx
function HomePickerOverlay({ regionRef }: { regionRef: React.MutableRefObject<((r: Region) => void) | null> }) {
  // ... existing body
  const { pin, onRegionChange } = useMapPinController();
  useEffect(() => {
    regionRef.current = onRegionChange;
    return () => { regionRef.current = null; };
  }, [onRegionChange, regionRef]);
  // ... rest unchanged
}
```

And pass the ref down where `HomePickerOverlay` is rendered: `<HomePickerOverlay regionRef={overlayRegionRef} />`.

Add the picker card position style:

```tsx
pickerCardWrap: {
  position: "absolute",
  top: spacing.lg, // below status bar; adjust with useSafeAreaInsets if available
  left: 60,        // clear of the 38px hamburger + gap
  right: spacing.md,
  zIndex: 10,
},
```

- [ ] **Step 3: Run mobile tests, expect no regressions**

```bash
cd mobile && npm test
```

Expected: all previous tests still green. (No new test added in this task — it's a wiring task; smoke is manual.)

- [ ] **Step 4: Run the app on iOS simulator and verify the picker card is visible**

```bash
cd mobile && npm run ios
```

Manual: confirm the From/To card appears below the hamburger; tapping a row activates picking mode and shows the suggestion sheet.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/app/(drawer)/index.tsx
git commit -m "feat(mobile): mount LocationPickerCard + map pin overlay on home"
```

---

## Task 13: HomeBottomSheet refactor — drop inline search + DateTimePicker, render DateStrip

**Files:**
- Modify: `mobile/src/components/HomeBottomSheet.tsx`

- [ ] **Step 1: Read the current sheet body and the imports**

Locate:
- The `LocationPicker` modal usage (line ~341)
- The inline `DateTimePicker` block (~329-338)
- The inline searchBar (~194-220)
- The handle for `handleFindRides` / `handleRequestRide` (~125-134)

- [ ] **Step 2: Replace the searchBar block with nothing**

The From/To is now in `LocationPickerCard` at the top of the screen. Inside HomeBottomSheet, drop the `searchBar` `TouchableOpacity` entirely (lines roughly 194-220). Also drop the `recent destinations placeholder` block (lines 317-onwards) since it depends on `destinationLocation` from the dropped picker.

- [ ] **Step 3: Replace the inline DateTimePicker block with DateStrip + DateModal**

```tsx
import { DateStrip } from "@/components/DateStrip";
import { DateModal } from "@/components/DateModal";

// inside the sheet body, where `home.dateField` used to be:
<DateStrip
  value={date}
  onChange={setDate}
  onPickPress={() => setShowDatePicker(true)}
/>
<DateModal
  visible={showDatePicker}
  value={date}
  onConfirm={(d) => { setDate(d); setShowDatePicker(false); }}
  onCancel={() => setShowDatePicker(false)}
/>
```

Remove the import `import DateTimePicker from "@react-native-community/datetimepicker";` and the entire `{showDatePicker && <DateTimePicker ... />}` block.

- [ ] **Step 4: Replace the search payload to use `usePicker`**

```tsx
import { usePicker } from "@/providers/PickerProvider";

// inside the component:
const { from, to } = usePicker();

function handleFindRides() {
  if (!to?.city) {
    Alert.alert("Missing destination", "Pick a destination first.");
    return;
  }
  if (!from?.city) {
    Alert.alert("Missing pickup", "Pick your pickup location.");
    return;
  }
  router.push({
    pathname: "/ride/search-results",
    params: {
      originCity: from.city,
      destinationCity: to.city,
      departureDate: date.toISOString().split("T")[0],
      passengers: passengers.toString(),
      vehicleCategory: vehicleType,
    },
  });
}
```

Apply the same pattern to `handleRequestRide` if it exists with the same payload shape (it sends `originCity` + `destinationCity` too — keep parity).

- [ ] **Step 5: Remove the now-unused `destinationLocation` state and its guards**

Search the file for `destinationLocation` and replace all branches that gated UI on its presence. The mode toggle (Request/Find) previously hid behind it — surface it unconditionally now, since the picker card lives outside the sheet.

- [ ] **Step 6: Run mobile tests, no regressions**

```bash
cd mobile && npm test
```

- [ ] **Step 7: Smoke on iOS sim**

```bash
cd mobile && npm run ios
```

Manual: confirm the sheet shows vehicle tabs · mode toggle · DateStrip · passenger stepper · Search button without any leftover "Where to?" row. Tap "Pick" on the DateStrip and confirm the modal works.

- [ ] **Step 8: Commit**

```bash
git add mobile/src/components/HomeBottomSheet.tsx
git commit -m "refactor(mobile): replace inline searchBar + DateTimePicker with DateStrip + PickerProvider"
```

---

## Task 14: Sanity-check end-to-end search

**Files:**
- (no code changes — verification only)

- [ ] **Step 1: With iOS sim already running, set a fake location**

```bash
xcrun simctl location $(xcrun simctl list devices booted | grep -oE '[A-F0-9-]{36}') set -1.9441,30.0619
```

- [ ] **Step 2: From welcome → log in as seeded passenger**

Use `dan@example.com` / seeded password from `npm run seed:test` output. (Or use Maestro auth flow if faster: `maestro --device <udid> test mobile/.maestro/flows/auth/login.yaml`.)

- [ ] **Step 3: Verify the home picker shows "Current location" for From**

Expected: From row reads "Current location"; To row reads "Where to?".

- [ ] **Step 4: Tap To, type "Huye"**

Expected: suggestions appear within 1-2 seconds, including at least one place that resolves to city "Huye".

- [ ] **Step 5: Tap the first suggestion, then Confirm**

Expected: To row updates to the picked place name (e.g. "Huye Bus Park"); picker collapses back to idle.

- [ ] **Step 6: Tap Search Rides**

Expected: search results show the seeded bus ride (Kigali → Huye). No empty state, no "originCity is invalid" toast.

- [ ] **Step 7: If anything fails, halt — do NOT proceed to Maestro rewrite**

Record the failure with a screenshot and walk back to the offending task.

### 🛑 CHECKPOINT E — Stop and review

Feature works end-to-end on iOS sim with real input. Demo-ready surface. Reviewer should walk through Steps 3-6 themselves.

---

## Task 15: Rewrite `passenger-book-and-board.yaml` to drive the picker

**Files:**
- Modify: `mobile/.maestro/flows/bus/passenger-book-and-board.yaml`

- [ ] **Step 1: Replace the deep-link block with the picker flow**

Open the file. Find this block:

```yaml
# Deep-link directly to search results. The HomeBottomSheet would otherwise
# pass `currentAddress` (the reverse-geocoded landmark, e.g. "Place de l'Unité
# Nationale") as `originCity`, which doesn't match the seeded ride's city
# ("Kigali") under the server's LIKE filter. Skipping the bottom sheet
# isolates the test from that pre-existing app behaviour.
- openLink: "yourdrive://ride/search-results?destinationCity=Huye&passengers=1&vehicleCategory=BUS"
```

Replace it (including the comment block) with:

```yaml
# Drive the real home picker (no deep-link bypass).
# From defaults to Current location; we exercise the chip path to prove it.
- tapOn:
    id: "picker.fromField"
- tapOn:
    id: "picker.useCurrentLocationChip"
- tapOn:
    id: "picker.confirm"

# Type destination, pick the first suggestion.
- tapOn:
    id: "picker.toField"
- inputText: "Huye"
- extendedWaitUntil:
    visible:
      id: "picker.suggestion.0"
    timeout: 8000
- tapOn:
    id: "picker.suggestion.0"
- tapOn:
    id: "picker.confirm"

# Sanity: bus tab is selected, date stays on Today.
- tapOn:
    id: "home.vehicleTab.BUS"
- assertVisible:
    id: "home.dateStrip.today.selected"

# Now search.
- tapOn:
    id: "home.searchRidesButton"
```

- [ ] **Step 2: Run the flow**

```bash
MAESTRO_APP_ID=com.yourdrive.app \
  MAESTRO_TEST_API_URL=http://localhost:3003 \
  MAESTRO_TEST_AUTH_TOKEN=qat-bus-token-local-2026 \
  maestro --device $(xcrun simctl list devices booted | grep -oE '[A-F0-9-]{36}') \
  test mobile/.maestro/flows/bus/passenger-book-and-board.yaml
```

Expected: green from reset → login → picker → search → book → puppet approve → QR → puppet board → puppet complete.

- [ ] **Step 3: If picker.suggestion.0 times out, check that the server returned predictions**

Watch server logs (`docker compose logs -f server`) for the autocomplete call. If 0 predictions, the seed bus ride city ("Huye") must still resolve via Google Places. If Google returns empty in test, add `MAESTRO_TEST_MODE=1` shimming to `useAddressAutocomplete` that injects a curated `Huye Bus Park` prediction — but only if the live call fails consistently. Do NOT add the shim preemptively.

- [ ] **Step 4: Commit**

```bash
git add mobile/.maestro/flows/bus/passenger-book-and-board.yaml
git commit -m "test(maestro): drive real picker in passenger-book-and-board, drop deep-link"
```

---

## Task 16: Add `home-picker-paths.yaml` flow

**Files:**
- Create: `mobile/.maestro/flows/home-picker-paths.yaml`

- [ ] **Step 1: Create the flow**

```yaml
# Exercises all three picker paths without booking:
#   1) "Use current location" chip
#   2) Type → autocomplete → tap suggestion
#   3) Drag the map (region change) → pin reverse-geocode → field auto-fills
appId: ${MAESTRO_APP_ID}
---
- runScript: ../scripts/reset.js
- launchApp:
    clearState: true
    clearKeychain: true
    permissions:
      all: allow
- setLocation:
    latitude: -1.9441
    longitude: 30.0619

# Login (use the existing seeded passenger)
- tapOn: { id: "welcome.loginButton" }
- tapOn: { id: "auth.emailInput" }
- inputText: ${output.passengerEmail}
- tapOn: { id: "auth.passwordInput" }
- inputText: ${output.password}
- tapOn: { id: "auth.loginButton" }
- tapOn: { text: "Not Now", optional: true }
- extendedWaitUntil:
    visible: { id: "home.screen" }
    timeout: 15000

# Path 1: From via chip
- tapOn: { id: "picker.fromField" }
- tapOn: { id: "picker.useCurrentLocationChip" }
- tapOn: { id: "picker.confirm" }

# Path 2: To via type + suggestion
- tapOn: { id: "picker.toField" }
- inputText: "Huye"
- extendedWaitUntil:
    visible: { id: "picker.suggestion.0" }
    timeout: 8000
- tapOn: { id: "picker.suggestion.0" }
- tapOn: { id: "picker.confirm" }

# Path 3: From via drag (swipe the map)
- tapOn: { id: "picker.fromField" }
- swipe:
    direction: LEFT
    from: { id: "home.map" }
- extendedWaitUntil:
    visible: { id: "picker.fromField" }
    timeout: 5000
- tapOn: { id: "picker.confirm" }
```

- [ ] **Step 2: Run**

```bash
MAESTRO_APP_ID=com.yourdrive.app \
  MAESTRO_TEST_API_URL=http://localhost:3003 \
  MAESTRO_TEST_AUTH_TOKEN=qat-bus-token-local-2026 \
  maestro --device $(xcrun simctl list devices booted | grep -oE '[A-F0-9-]{36}') \
  test mobile/.maestro/flows/home-picker-paths.yaml
```

Expected: green.

- [ ] **Step 3: Commit**

```bash
git add mobile/.maestro/flows/home-picker-paths.yaml
git commit -m "test(maestro): add home-picker-paths flow exercising chip + type + drag"
```

---

## Task 17: Manual QA & docs

**Files:**
- Modify: `mobile/.maestro/README.md`

- [ ] **Step 1: Manual checklist on iOS simulator**

Run through:

1. Fresh launch, GPS allowed → From shows "Current location"; reverse-geocode resolves the city behind the scenes.
2. Tap From → chip → Confirm. From stays "Current location".
3. Tap To → type "Avondale" → Avondale appears (proves RW/ZW + neighborhood granularity).
4. Type "Kigali Heights" → Kigali Heights appears.
5. Tap a suggestion → Confirm. To shows the picked place name.
6. Tap Pick on the date strip → modal opens with today highlighted. Tap +5 days. Confirm. Strip shows the picked date.
7. Tap Bus tab → Search → results render Kigali → Huye seeded ride.
8. Restart with GPS denied → From shows "Set pickup location"; search button is disabled until a value is picked.

- [ ] **Step 2: Manual checklist on Android emulator**

Same as iOS Steps 1, 3, 6, 7 (subset; we don't require the same depth on Android per spec).

- [ ] **Step 3: Update Maestro README**

Add to the Phase 1 status table in `mobile/.maestro/README.md`:

```markdown
| `flows/home-picker-paths.yaml` — chip + type + drag | done |
```

And under "Running the bus flows" add:

```markdown
> Bus flows now drive the real home picker (no deep-link bypass).
```

- [ ] **Step 4: Commit**

```bash
git add mobile/.maestro/README.md
git commit -m "docs(maestro): note that bus flows now drive the home picker end-to-end"
```

### 🛑 CHECKPOINT F — Ship

Everything green. Spec goal achieved. Ready to merge.

---

## Out of Scope (deferred to follow-up plans)

- Saved places / recents.
- Driver-side pickup-spot view (lat/lng is captured but not surfaced).
- PostGIS radius matching.
- Kinyarwanda translations for new copy.
- Mode toggle redesign.

## References

- Spec: `docs/superpowers/specs/2026-05-13-location-picker-design.md`
- Sheet bypass that this work removes: `mobile/.maestro/flows/bus/passenger-book-and-board.yaml:40`
- BUS server filter (unchanged): `server/src/controllers/ride.controller.ts:2659-2663`
- P2P/D2D server filter (unchanged): `server/src/controllers/ride.controller.ts:695-699`
