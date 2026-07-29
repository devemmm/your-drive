# Bus Multi-Seat Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user book more than one bus seat in a single booking by adding a passenger-count stepper to the confirm-booking screen.

**Architecture:** The backend (`POST /rides/:rideId/book` with `seatsBooked`) and the mobile `useBookRide` hook already support multi-seat bookings, and the ticket screen already renders one QR per `BookingSeat`. The only change is in the mobile booking screen: replace the hardcoded `seats = 1` with stepper-controlled state clamped to `[1, ride.availableSeats]`, and scale the displayed fare. A pure `clampSeats` helper in `src/lib/busBooking.ts` holds the bounds logic.

**Tech Stack:** React Native (Expo SDK 55), expo-router, TanStack Query, jest-expo + @testing-library/react-native, lucide-react-native icons.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-18-bus-multi-seat-booking-design.md`
- All work under `mobile/`; run all commands from `/Users/adrianmaenzanise/Projects/Node/your-drive/mobile`.
- No backend, `useBookRide`, or ticket-screen changes.
- Seat count: min 1, max `ride.availableSeats`; stepper buttons disable at the bounds.
- Fare display keeps the existing cents convention: `formatCurrency(Math.round(ride.contribution * seats * 100))`.
- Styling must reuse the screen's existing `makeStyles` palette/spacing patterns (Jost fonts, `spacing`, `borderRadius`, `colors`).
- Test command: `npm test -- <path>` (jest-expo).

---

### Task 1: `clampSeats` helper

**Files:**
- Modify: `mobile/src/lib/busBooking.ts`
- Test: `mobile/src/lib/__tests__/busBooking.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `clampSeats(next: number, max: number): number` — exported from `@/lib/busBooking`; clamps `next` into `[1, Math.max(1, max)]` and truncates to an integer. Task 2 imports it.

- [ ] **Step 1: Write the failing tests**

Append to `mobile/src/lib/__tests__/busBooking.test.ts`:

```ts
import { clampSeats } from "@/lib/busBooking";

describe("clampSeats", () => {
  it("keeps values inside the range", () => {
    expect(clampSeats(2, 5)).toBe(2);
  });
  it("clamps below 1 up to 1", () => {
    expect(clampSeats(0, 5)).toBe(1);
    expect(clampSeats(-3, 5)).toBe(1);
  });
  it("clamps above max down to max", () => {
    expect(clampSeats(9, 5)).toBe(5);
  });
  it("treats max below 1 as 1", () => {
    expect(clampSeats(3, 0)).toBe(1);
    expect(clampSeats(3, -2)).toBe(1);
  });
  it("truncates fractional input", () => {
    expect(clampSeats(2.7, 5)).toBe(2);
  });
});
```

(The file already imports from `@/lib/busBooking`; merge the import: `import { isValidStopSelection, clampSeats } from "@/lib/busBooking";` and drop the separate import line.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/__tests__/busBooking.test.ts`
Expected: FAIL — `clampSeats` is not exported (TypeError / undefined).

- [ ] **Step 3: Implement `clampSeats`**

Append to `mobile/src/lib/busBooking.ts`:

```ts
export function clampSeats(next: number, max: number): number {
  const upper = Math.max(1, Math.trunc(max));
  return Math.min(upper, Math.max(1, Math.trunc(next)));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/__tests__/busBooking.test.ts`
Expected: PASS (existing `isValidStopSelection` tests + 5 new tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/busBooking.ts src/lib/__tests__/busBooking.test.ts
git commit -m "feat(mobile): add clampSeats helper for bus seat selection"
```

---

### Task 2: Passenger stepper on the booking screen

**Files:**
- Modify: `mobile/src/app/bus/trip/[rideId]/index.tsx`
- Test: `mobile/src/app/bus/trip/[rideId]/__tests__/index.test.tsx` (create)

**Interfaces:**
- Consumes: `clampSeats(next, max)` from `@/lib/busBooking` (Task 1).
- Produces: screen-level behavior only. New testIDs: `bus.seats.minus`, `bus.seats.plus`, `bus.seats.count`, `bus.fare.total`.

- [ ] **Step 1: Write the failing component test**

Create `mobile/src/app/bus/trip/[rideId]/__tests__/index.test.tsx`:

```tsx
// mobile/src/app/bus/trip/[rideId]/__tests__/index.test.tsx
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";

const mutateAsync = jest.fn().mockResolvedValue({});
const replace = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ rideId: "9" }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace }),
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
jest.mock("@/hooks/useBus", () => ({
  usePublicRide: () => ({
    data: {
      id: 9,
      contribution: 25,
      availableSeats: 3,
      route: {
        stops: [
          { id: 1, routeId: 1, name: "Harare", city: "Harare", order: 0, latitude: null, longitude: null },
          { id: 2, routeId: 1, name: "Bulawayo", city: "Bulawayo", order: 1, latitude: null, longitude: null },
        ],
      },
    },
    isLoading: false,
  }),
}));
jest.mock("@/hooks/useRides", () => ({
  useBookRide: () => ({ mutateAsync, isPending: false }),
}));
jest.mock("@/hooks/useRequireAuth", () => ({
  useRequireAuth: () => (cb: () => void) => cb(),
}));

import { ThemeProvider } from "@/providers/ThemeProvider";
import BusBookingScreen from "@/app/bus/trip/[rideId]";

const renderScreen = () =>
  render(
    <ThemeProvider>
      <BusBookingScreen />
    </ThemeProvider>
  );

beforeEach(() => {
  mutateAsync.mockClear();
  replace.mockClear();
});

it("starts at 1 seat and increments up to availableSeats", () => {
  const { getByTestId } = renderScreen();
  expect(getByTestId("bus.seats.count")).toHaveTextContent("1");
  fireEvent.press(getByTestId("bus.seats.plus"));
  fireEvent.press(getByTestId("bus.seats.plus"));
  expect(getByTestId("bus.seats.count")).toHaveTextContent("3");
  fireEvent.press(getByTestId("bus.seats.plus")); // at max, no-op
  expect(getByTestId("bus.seats.count")).toHaveTextContent("3");
});

it("does not go below 1 seat", () => {
  const { getByTestId } = renderScreen();
  fireEvent.press(getByTestId("bus.seats.minus"));
  expect(getByTestId("bus.seats.count")).toHaveTextContent("1");
});

it("multiplies the fare by the seat count", () => {
  const { getByTestId } = renderScreen();
  fireEvent.press(getByTestId("bus.seats.plus"));
  expect(getByTestId("bus.fare.total")).toHaveTextContent("50");
});

it("books with the selected seat count", async () => {
  const { getByTestId, getByText } = renderScreen();
  fireEvent.press(getByTestId("bus.seats.plus"));
  fireEvent.press(getByText("Confirm booking"));
  await waitFor(() =>
    expect(mutateAsync).toHaveBeenCalledWith({
      rideId: 9,
      seats: 2,
      boardingStopId: 1,
      alightingStopId: 2,
    })
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- "src/app/bus/trip/\[rideId\]/__tests__/index.test.tsx"`
Expected: FAIL — `bus.seats.count` / `bus.seats.plus` testIDs not found (screen has no stepper yet).

- [ ] **Step 3: Implement the stepper in the screen**

In `mobile/src/app/bus/trip/[rideId]/index.tsx`:

3a. Update imports — add `Minus`, `Plus` icons and `clampSeats`:

```tsx
import { ArrowLeft, Check, Minus, Plus } from "lucide-react-native";
import { isValidStopSelection, clampSeats } from "@/lib/busBooking";
```

3b. Replace the hardcoded seat state (`const [seats] = useState(1);`) with:

```tsx
const [seats, setSeats] = useState(1);
const maxSeats = Math.max(1, ride?.availableSeats ?? 1);
```

(Place `maxSeats` after the `usePublicRide` destructuring so `ride` is in scope; keep it above the early `return` so hooks order is unchanged — it is a plain expression, not a hook.)

3c. Add the PASSENGERS section between the drop-off options and the price card (after the second `stops.map` block):

```tsx
<Text style={s.label}>PASSENGERS</Text>
<View style={s.stepperRow}>
  <TouchableOpacity
    testID="bus.seats.minus"
    style={[s.stepperBtn, seats <= 1 && s.stepperBtnDisabled]}
    disabled={seats <= 1}
    onPress={() => setSeats((n) => clampSeats(n - 1, maxSeats))}
  >
    <Minus size={18} color={seats <= 1 ? colors.text.tertiary : colors.text.primary} />
  </TouchableOpacity>
  <View style={s.stepperValue}>
    <Text testID="bus.seats.count" style={s.stepperCount}>{seats}</Text>
    <Text style={s.stepperHint}>
      {seats === 1 ? "seat" : "seats"} · {maxSeats} available
    </Text>
  </View>
  <TouchableOpacity
    testID="bus.seats.plus"
    style={[s.stepperBtn, seats >= maxSeats && s.stepperBtnDisabled]}
    disabled={seats >= maxSeats}
    onPress={() => setSeats((n) => clampSeats(n + 1, maxSeats))}
  >
    <Plus size={18} color={seats >= maxSeats ? colors.text.tertiary : colors.text.primary} />
  </TouchableOpacity>
</View>
```

3d. Update the price card row to scale with seats and carry the testID:

```tsx
<View style={s.priceRow}>
  <Text style={s.priceLabel}>
    Fare · {seats} {seats === 1 ? "seat" : "seats"}
  </Text>
  <Text testID="bus.fare.total" style={s.priceValue}>
    {formatCurrency(Math.round(ride.contribution * seats * 100))}
  </Text>
</View>
```

3e. Add stepper styles inside `makeStyles` (after `optionText`):

```tsx
stepperRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  padding: spacing.md,
  borderRadius: borderRadius.lg,
  backgroundColor: colors.background,
  borderWidth: 1,
  borderColor: colors.border,
},
stepperBtn: {
  width: 40,
  height: 40,
  borderRadius: 999,
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surface,
},
stepperBtnDisabled: { opacity: 0.4 },
stepperValue: { alignItems: "center" },
stepperCount: { fontFamily: "Jost_700Bold", fontSize: fontSize.lg, color: colors.text.primary },
stepperHint: { fontFamily: "Jost_500Medium", fontSize: fontSize.xs, color: colors.text.secondary },
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- "src/app/bus/trip/\[rideId\]/__tests__/index.test.tsx"`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the full mobile test suite**

Run: `npm test`
Expected: all suites PASS (no regressions).

- [ ] **Step 6: Commit**

```bash
git add "src/app/bus/trip/[rideId]/index.tsx" "src/app/bus/trip/[rideId]/__tests__/index.test.tsx"
git commit -m "feat(mobile): book multiple bus seats with passenger stepper"
```
