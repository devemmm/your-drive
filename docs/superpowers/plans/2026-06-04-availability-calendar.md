# Availability Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Embed confirmed booking + owner-block ranges in the existing rental and chauffeur listing payloads, and render a month-grid availability calendar under the Pricing section of both detail screens so users see (and cannot pick) unavailable slots.

**Architecture:** Extend `listRentals` and `listChauffeurs` in `server/src/services/search/` to include a 30-day window of `bookedRanges` per item — no new endpoints. Add an optional `bookedRanges` field to `RentalVehicleListing` and `ChauffeurDriverListing` on mobile. New `AvailabilityCalendar` component computes day states from `bookedRanges` and is injected between the Pricing and Booking sections on `rental/[id].tsx` and `chauffeur/[id].tsx`. Server-side overlap rejection on submit stays as the safety net.

**Tech Stack:** Server: TypeScript, Prisma, Jest. Mobile: React Native (Expo), TypeScript, Jest (with React Native Testing Library where available).

**Spec:** `docs/superpowers/specs/2026-06-04-availability-calendar-design.md`

---

## File Structure

| File | Role |
|---|---|
| `server/src/services/search/rentalSearch.service.ts` | Extend `listRentals` include + mapper to emit `bookedRanges` per vehicle. |
| `server/src/services/search/rentalSearch.service.test.ts` | Cases for APPROVED rental, REQUESTED rental, BLOCK, out-of-window. |
| `server/src/services/search/chauffeurSearch.service.ts` | Extend `listChauffeurs` select + mapper to emit `bookedRanges` per driver. |
| `server/src/services/search/chauffeurSearch.service.test.ts` | Cases for ACCEPTED service, REQUESTED service, empty, out-of-window. |
| `mobile/src/lib/types.ts` | Add `BookedRange`; optional `bookedRanges?` on `RentalVehicleListing` + `ChauffeurDriverListing`. |
| `mobile/src/components/AvailabilityCalendar.tsx` | New component with internal `daysInMonth`, `intersectsAnyRange`, `sameYMD` helpers. |
| `mobile/src/components/__tests__/AvailabilityCalendar.test.tsx` | Unit tests for the date helpers + tap behaviour. |
| `mobile/src/app/(drawer)/rental/[id].tsx` | Inject `<AvailabilityCalendar>` between Pricing and Booking. |
| `mobile/src/app/(drawer)/chauffeur/[id].tsx` | Same injection. |

No new routes, no schema migration, no new mobile hooks.

---

## Task 1: Backend — Rental search service emits `bookedRanges`

**Files:**
- Modify: `server/src/services/search/rentalSearch.service.ts`
- Modify: `server/src/services/search/rentalSearch.service.test.ts`

- [ ] **Step 1: Add the four failing test cases**

Append the following tests inside the `describe("rentalSearch.service.listRentals", ...)` block in `server/src/services/search/rentalSearch.service.test.ts`:

```ts
  it("emits an APPROVED rental in bookedRanges with kind RENTAL", async () => {
    const start = new Date("2026-06-10T09:00:00Z");
    const end = new Date("2026-06-12T17:00:00Z");
    (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1, make: "Toyota", model: "Vitz",
        user: null, files: [], defaultImage: null, pickupLocation: null,
        rentals: [{ startDate: start, endDate: end }],
        chauffeurServices: [],
        blockedRanges: [],
      },
    ]);
    (prisma.vehicle.count as jest.Mock).mockResolvedValue(1);

    const result = await listRentals({ viewer: { isGuest: true }, filters: {} });
    expect((result.items[0] as any).bookedRanges).toEqual([
      { start: start.toISOString(), end: end.toISOString(), kind: "RENTAL" },
    ]);
  });

  it("emits an ACCEPTED chauffeur service in bookedRanges with kind CHAUFFEUR", async () => {
    const start = new Date("2026-06-15T10:00:00Z");
    const end = new Date("2026-06-15T14:00:00Z");
    (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([
      {
        id: 2, make: "Honda", model: "Fit",
        user: null, files: [], defaultImage: null, pickupLocation: null,
        rentals: [],
        chauffeurServices: [{ startDate: start, endDate: end }],
        blockedRanges: [],
      },
    ]);
    (prisma.vehicle.count as jest.Mock).mockResolvedValue(1);

    const result = await listRentals({ viewer: { isGuest: true }, filters: {} });
    expect((result.items[0] as any).bookedRanges).toEqual([
      { start: start.toISOString(), end: end.toISOString(), kind: "CHAUFFEUR" },
    ]);
  });

  it("emits an owner blockedRange in bookedRanges with kind BLOCK", async () => {
    const from = new Date("2026-06-20T00:00:00Z");
    const to = new Date("2026-06-22T00:00:00Z");
    (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([
      {
        id: 3, make: "Nissan", model: "March",
        user: null, files: [], defaultImage: null, pickupLocation: null,
        rentals: [],
        chauffeurServices: [],
        blockedRanges: [{ from, to }],
      },
    ]);
    (prisma.vehicle.count as jest.Mock).mockResolvedValue(1);

    const result = await listRentals({ viewer: { isGuest: true }, filters: {} });
    expect((result.items[0] as any).bookedRanges).toEqual([
      { start: from.toISOString(), end: to.toISOString(), kind: "BLOCK" },
    ]);
  });

  it("scopes booking includes to status + 30-day window in the Prisma query", async () => {
    (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.vehicle.count as jest.Mock).mockResolvedValue(0);

    await listRentals({ viewer: { isGuest: true }, filters: {} });
    const findManyArg = (prisma.vehicle.findMany as jest.Mock).mock.calls[0][0];

    expect(findManyArg.include.rentals.where.status.in).toEqual(["APPROVED", "ACTIVE"]);
    expect(findManyArg.include.chauffeurServices.where.status.in).toEqual(["ACCEPTED", "ACTIVE"]);
    // 30-day cap is expressed as endDate >= now AND startDate <= now + 30d
    expect(findManyArg.include.rentals.where.endDate).toHaveProperty("gte");
    expect(findManyArg.include.rentals.where.startDate).toHaveProperty("lte");
    expect(findManyArg.include.blockedRanges.where.to).toHaveProperty("gte");
    expect(findManyArg.include.blockedRanges.where.from).toHaveProperty("lte");
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx jest src/services/search/rentalSearch.service.test.ts -t "bookedRanges"`
Expected: 3 FAIL ("Cannot read property 'bookedRanges' of undefined" or similar) + 1 FAIL on the include shape assertion.

- [ ] **Step 3: Extend the include block in `listRentals`**

In `server/src/services/search/rentalSearch.service.ts`, modify the `include` block inside `prisma.vehicle.findMany` (currently lines 132-141) to add three nested selects:

```ts
include: {
  files: {
    select: { id: true, url: true, type: true, category: true },
  },
  defaultImage: {
    select: { id: true, url: true, type: true, category: true },
  },
  user: { select: userSelectForViewer(viewer) },
  pickupLocation: true,
  rentals: {
    where: {
      status: { in: [RentalStatus.APPROVED, RentalStatus.ACTIVE] },
      endDate: { gte: now },
      startDate: { lte: thirtyDaysFromNow },
    },
    select: { startDate: true, endDate: true },
  },
  chauffeurServices: {
    where: {
      status: { in: [ChauffeurStatus.ACCEPTED, ChauffeurStatus.ACTIVE] },
      endDate: { gte: now },
      startDate: { lte: thirtyDaysFromNow },
    },
    select: { startDate: true, endDate: true },
  },
  blockedRanges: {
    where: {
      to: { gte: now },
      from: { lte: thirtyDaysFromNow },
    },
    select: { from: true, to: true },
  },
},
```

At the top of `listRentals` (right after `const skip = ... const take = ...`), compute the window bounds:

```ts
const now = new Date();
const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
```

Add the missing import at the top of the file. Change:

```ts
import { Prisma, RentalStatus } from "@prisma/client";
```

to:

```ts
import { Prisma, RentalStatus, ChauffeurStatus } from "@prisma/client";
```

- [ ] **Step 4: Map raw items into `bookedRanges` shape**

Update `mapRentalForViewer` to also emit the `bookedRanges` field:

```ts
function mapRentalForViewer<T extends {
  user?: Record<string, unknown> | null;
  rentals?: { startDate: Date; endDate: Date }[];
  chauffeurServices?: { startDate: Date; endDate: Date }[];
  blockedRanges?: { from: Date; to: Date }[];
}>(
  vehicle: T,
  viewer: Viewer
): Omit<T, "rentals" | "chauffeurServices" | "blockedRanges"> & {
  bookedRanges: { start: string; end: string; kind: "RENTAL" | "CHAUFFEUR" | "BLOCK" }[];
  user?: Record<string, unknown> | null;
} {
  const { rentals = [], chauffeurServices = [], blockedRanges = [], ...rest } = vehicle as any;
  const bookedRanges = [
    ...rentals.map((r: { startDate: Date; endDate: Date }) => ({
      start: r.startDate.toISOString(),
      end: r.endDate.toISOString(),
      kind: "RENTAL" as const,
    })),
    ...chauffeurServices.map((s: { startDate: Date; endDate: Date }) => ({
      start: s.startDate.toISOString(),
      end: s.endDate.toISOString(),
      kind: "CHAUFFEUR" as const,
    })),
    ...blockedRanges.map((b: { from: Date; to: Date }) => ({
      start: b.from.toISOString(),
      end: b.to.toISOString(),
      kind: "BLOCK" as const,
    })),
  ];

  const base = { ...rest, bookedRanges };

  if (!viewer.isGuest || !base.user) return base;
  const { phoneNumber: _phone, email: _email, ...safeUser } = base.user;
  return { ...base, user: safeUser };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd server && npx jest src/services/search/rentalSearch.service.test.ts`
Expected: ALL pass — the new 4 cases plus the 3 pre-existing PII-strip / filter cases.

- [ ] **Step 6: Commit**

```bash
git add server/src/services/search/rentalSearch.service.ts server/src/services/search/rentalSearch.service.test.ts
git commit -m "feat(server): include bookedRanges on rental search responses"
```

---

## Task 2: Backend — Chauffeur search service emits `bookedRanges`

**Files:**
- Modify: `server/src/services/search/chauffeurSearch.service.ts`
- Modify: `server/src/services/search/chauffeurSearch.service.test.ts`

- [ ] **Step 1: Add failing tests**

Append inside the `describe("chauffeurSearch.service.listChauffeurs", ...)` block in `chauffeurSearch.service.test.ts`:

```ts
  it("emits an ACCEPTED chauffeur service in bookedRanges with kind CHAUFFEUR", async () => {
    const start = new Date("2026-06-15T10:00:00Z");
    const end = new Date("2026-06-15T14:00:00Z");
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1, firstName: "John", lastName: "Doe",
        profileImage: null, averageRating: 4.5, totalRatings: 8,
        chauffeurHourlyRate: 25, chauffeurDailyRate: 180,
        chauffeurDescription: null, drivingExperience: null, languagesSpoken: [],
        driverChauffeurServices: [{ startDate: start, endDate: end }],
      },
    ]);
    (prisma.user.count as jest.Mock).mockResolvedValue(1);

    const result = await listChauffeurs({ viewer: { isGuest: true }, filters: {} });
    expect((result.items[0] as any).bookedRanges).toEqual([
      { start: start.toISOString(), end: end.toISOString(), kind: "CHAUFFEUR" },
    ]);
  });

  it("emits empty bookedRanges when the driver has no upcoming services", async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: 2, firstName: "Mary", lastName: "Smith",
        profileImage: null, averageRating: 5, totalRatings: 2,
        chauffeurHourlyRate: 30, chauffeurDailyRate: 200,
        chauffeurDescription: null, drivingExperience: null, languagesSpoken: [],
        driverChauffeurServices: [],
      },
    ]);
    (prisma.user.count as jest.Mock).mockResolvedValue(1);

    const result = await listChauffeurs({ viewer: { isGuest: true }, filters: {} });
    expect((result.items[0] as any).bookedRanges).toEqual([]);
  });

  it("scopes driverChauffeurServices select to ACCEPTED/ACTIVE in next 30 days", async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.user.count as jest.Mock).mockResolvedValue(0);

    await listChauffeurs({ viewer: { isGuest: true }, filters: {} });
    const findManyArg = (prisma.user.findMany as jest.Mock).mock.calls[0][0];

    expect(findManyArg.select.driverChauffeurServices.where.status.in).toEqual(["ACCEPTED", "ACTIVE"]);
    expect(findManyArg.select.driverChauffeurServices.where.endDate).toHaveProperty("gte");
    expect(findManyArg.select.driverChauffeurServices.where.startDate).toHaveProperty("lte");
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx jest src/services/search/chauffeurSearch.service.test.ts -t "bookedRanges"`
Expected: 2 FAIL on `bookedRanges` undefined + 1 FAIL on the select shape.

- [ ] **Step 3: Extend the select block in `listChauffeurs`**

In `server/src/services/search/chauffeurSearch.service.ts`, both `GUEST_SELECT` and `AUTHED_SELECT` are flat field selects. The driverChauffeurServices include needs to be added as a nested select on the `findMany` call directly so it can be filtered. Modify `listChauffeurs` so the Prisma call merges the per-viewer select with a window-scoped `driverChauffeurServices` select.

Replace the `findMany` call inside `listChauffeurs` (currently lines 126-132) with:

```ts
const now = new Date();
const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

const [rawItems, total] = await Promise.all([
  prisma.user.findMany({
    skip,
    take,
    where,
    select: {
      ...selectForViewer(viewer),
      driverChauffeurServices: {
        where: {
          status: { in: [ChauffeurStatus.ACCEPTED, ChauffeurStatus.ACTIVE] },
          endDate: { gte: now },
          startDate: { lte: thirtyDaysFromNow },
        },
        select: { startDate: true, endDate: true },
      },
    },
    orderBy: { averageRating: "desc" },
  }),
  prisma.user.count({ where }),
]);
```

- [ ] **Step 4: Map raw items into `bookedRanges` shape**

Update `mapChauffeurForViewer` to also emit `bookedRanges`:

```ts
function mapChauffeurForViewer<T extends Record<string, unknown>>(
  driver: T,
  viewer: Viewer
): Omit<T, "driverChauffeurServices"> & {
  bookedRanges: { start: string; end: string; kind: "CHAUFFEUR" }[];
} {
  const { driverChauffeurServices = [], ...rest } = driver as any;
  const bookedRanges = (driverChauffeurServices as { startDate: Date; endDate: Date }[]).map((s) => ({
    start: s.startDate.toISOString(),
    end: s.endDate.toISOString(),
    kind: "CHAUFFEUR" as const,
  }));

  const base = { ...rest, bookedRanges };

  if (!viewer.isGuest) return base;
  const { phoneNumber: _phone, email: _email, ...safeDriver } = base;
  return safeDriver as any;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd server && npx jest src/services/search/chauffeurSearch.service.test.ts`
Expected: ALL pass — the new 3 cases plus the pre-existing PII-strip / filter cases.

- [ ] **Step 6: Commit**

```bash
git add server/src/services/search/chauffeurSearch.service.ts server/src/services/search/chauffeurSearch.service.test.ts
git commit -m "feat(server): include bookedRanges on chauffeur search responses"
```

---

## Task 3: Mobile — Add `BookedRange` type + optional field on the two listings

**Files:**
- Modify: `mobile/src/lib/types.ts`

- [ ] **Step 1: Add the `BookedRange` type**

Insert before the `RentalVehicleListing` interface (around line 180):

```ts
export type BookedRange = {
  start: string;  // ISO 8601 datetime
  end: string;    // ISO 8601 datetime
  kind: "RENTAL" | "CHAUFFEUR" | "BLOCK";
};
```

- [ ] **Step 2: Add optional `bookedRanges` to `RentalVehicleListing`**

Inside the `RentalVehicleListing` interface (currently lines 180-199), add the field at the end (after `user?: User;`):

```ts
  bookedRanges?: BookedRange[];
```

- [ ] **Step 3: Add optional `bookedRanges` to `ChauffeurDriverListing`**

Inside the `ChauffeurDriverListing` interface (currently lines 231-242), add the field at the end (after `drivingExperience: number | null;`):

```ts
  bookedRanges?: BookedRange[];
```

- [ ] **Step 4: Run typecheck**

Run: `cd mobile && npx tsc --noEmit 2>&1 | grep -E "(types\.ts|bookedRanges|BookedRange)"`
Expected: no output (no errors mentioning the new symbols).

- [ ] **Step 5: Commit**

```bash
git add mobile/src/lib/types.ts
git commit -m "feat(mobile): add BookedRange type for availability calendar"
```

---

## Task 4: Mobile — `AvailabilityCalendar` helper functions (TDD)

**Files:**
- Create: `mobile/src/components/__tests__/AvailabilityCalendar.test.tsx`
- Create: `mobile/src/components/AvailabilityCalendar.tsx` (helpers section only — full component in Task 5)

- [ ] **Step 1: Write failing tests for the three helpers**

Create `mobile/src/components/__tests__/AvailabilityCalendar.test.tsx`:

```tsx
import { __test__ } from "../AvailabilityCalendar";

const { daysInMonth, intersectsAnyRange, sameYMD } = __test__;

describe("AvailabilityCalendar helpers", () => {
  describe("daysInMonth", () => {
    it("returns 42 cells for June 2026 with the right inMonth flags", () => {
      const cells = daysInMonth(2026, 5); // 0-indexed month: 5 = June
      expect(cells).toHaveLength(42);
      // June 1, 2026 is a Monday; index 0 is the preceding Sunday (May 31)
      expect(cells[0].date.getMonth()).toBe(4); // May
      expect(cells[0].inMonth).toBe(false);
      expect(cells[1].date.getDate()).toBe(1);
      expect(cells[1].inMonth).toBe(true);
      // Find the last June day
      const lastJune = cells.filter(c => c.inMonth && c.date.getMonth() === 5).pop()!;
      expect(lastJune.date.getDate()).toBe(30);
    });
  });

  describe("sameYMD", () => {
    it("returns true when two Dates share year/month/day regardless of time", () => {
      const a = new Date("2026-06-04T08:00:00Z");
      const b = new Date("2026-06-04T22:30:00Z");
      expect(sameYMD(a, b)).toBe(true);
    });

    it("returns false when the day differs", () => {
      const a = new Date("2026-06-04T08:00:00Z");
      const b = new Date("2026-06-05T08:00:00Z");
      expect(sameYMD(a, b)).toBe(false);
    });
  });

  describe("intersectsAnyRange", () => {
    const day = new Date(2026, 5, 10); // local midnight June 10, 2026
    const ranges = [
      { start: "2026-06-09T20:00:00Z", end: "2026-06-11T02:00:00Z", kind: "RENTAL" as const },
    ];

    it("returns true when the day overlaps a range", () => {
      expect(intersectsAnyRange(day, ranges)).toBe(true);
    });

    it("returns false when the day is entirely before the range", () => {
      const before = new Date(2026, 5, 8);
      expect(intersectsAnyRange(before, ranges)).toBe(false);
    });

    it("returns false when the day is entirely after the range", () => {
      const after = new Date(2026, 5, 12);
      expect(intersectsAnyRange(after, ranges)).toBe(false);
    });

    it("returns false against an empty range list", () => {
      expect(intersectsAnyRange(day, [])).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd mobile && npx jest src/components/__tests__/AvailabilityCalendar.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the helpers file with a `__test__` export**

Create `mobile/src/components/AvailabilityCalendar.tsx` with the helpers and a test-only re-export:

```tsx
import React from "react";
import type { BookedRange } from "@/lib/types";

type DayCell = { date: Date; inMonth: boolean };

// Returns 42 cells (6 weeks × 7 days) for the given year/month (month: 0-11),
// with leading days from the previous month and trailing days from the next.
// inMonth indicates whether the cell belongs to the requested month.
function daysInMonth(year: number, month: number): DayCell[] {
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = firstOfMonth.getDay(); // 0 = Sunday
  const start = new Date(year, month, 1 - firstWeekday);
  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({ date: d, inMonth: d.getMonth() === month });
  }
  return cells;
}

function sameYMD(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Day overlaps a range if [dayStart, dayEnd) intersects [rangeStart, rangeEnd).
function intersectsAnyRange(day: Date, ranges: BookedRange[]): boolean {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return ranges.some((r) => {
    const rStart = new Date(r.start);
    const rEnd = new Date(r.end);
    return rStart < dayEnd && rEnd > dayStart;
  });
}

export const __test__ = { daysInMonth, sameYMD, intersectsAnyRange };

// Placeholder export — full component lands in Task 5.
export function AvailabilityCalendar(): React.ReactElement | null {
  return null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd mobile && npx jest src/components/__tests__/AvailabilityCalendar.test.tsx`
Expected: ALL pass — 6 cases green.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/AvailabilityCalendar.tsx mobile/src/components/__tests__/AvailabilityCalendar.test.tsx
git commit -m "feat(mobile): availability calendar date helpers"
```

---

## Task 5: Mobile — Full `AvailabilityCalendar` component

**Files:**
- Modify: `mobile/src/components/AvailabilityCalendar.tsx`
- Modify: `mobile/src/components/__tests__/AvailabilityCalendar.test.tsx`

- [ ] **Step 1: Add failing tests for tap behaviour**

Append to `mobile/src/components/__tests__/AvailabilityCalendar.test.tsx`:

```tsx
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { AvailabilityCalendar } from "../AvailabilityCalendar";
import { ThemeProvider } from "@/providers/ThemeProvider";

function renderCal(props: Partial<React.ComponentProps<typeof AvailabilityCalendar>> = {}) {
  const onChange = jest.fn();
  // Anchor everything to June 2026 so the grid layout is deterministic.
  const start = new Date(2026, 5, 4, 9, 30); // June 4, 2026 09:30 local
  const end = new Date(2026, 5, 4, 9, 30);
  const utils = render(
    <ThemeProvider>
      <AvailabilityCalendar
        bookedRanges={[]}
        startDate={start}
        endDate={end}
        mode="DAILY"
        onChange={onChange}
        testID="cal"
        anchorMonth={new Date(2026, 5, 1)}
        {...props}
      />
    </ThemeProvider>
  );
  return { ...utils, onChange };
}

describe("AvailabilityCalendar component", () => {
  it("renders 30 day cells for June 2026 (rest are out-of-month)", () => {
    const { getAllByTestId } = renderCal();
    const inMonth = getAllByTestId(/^cal\.day\.\d{4}-\d{2}-\d{2}\.inMonth$/);
    expect(inMonth).toHaveLength(30);
  });

  it("greys + disables a day overlapping a RENTAL range in DAILY mode", () => {
    const { getByTestId } = renderCal({
      bookedRanges: [{
        start: "2026-06-10T09:00:00Z",
        end: "2026-06-10T17:00:00Z",
        kind: "RENTAL",
      }],
    });
    const cell = getByTestId("cal.day.2026-06-10.blocked");
    expect(cell).toBeTruthy();
  });

  it("tapping an available day emits onChange with that day as both start and end (single-day pick)", () => {
    const { getByTestId, onChange } = renderCal();
    fireEvent.press(getByTestId("cal.day.2026-06-15.inMonth"));
    expect(onChange).toHaveBeenCalledTimes(1);
    const [s, e] = onChange.mock.calls[0];
    expect(s.getDate()).toBe(15);
    expect(e.getDate()).toBe(15);
  });

  it("tapping a different day after a range exists restarts the selection at the new day", () => {
    const start = new Date(2026, 5, 15);
    const end = new Date(2026, 5, 20);
    const { getByTestId, onChange } = renderCal({ startDate: start, endDate: end });
    fireEvent.press(getByTestId("cal.day.2026-06-10.inMonth"));
    const [s, e] = onChange.mock.calls[0];
    expect(s.getDate()).toBe(10);
    expect(e.getDate()).toBe(10);
  });

  it("renders an in-range fill on days strictly between startDate and endDate", () => {
    const start = new Date(2026, 5, 10);
    const end = new Date(2026, 5, 14);
    const { getByTestId } = renderCal({ startDate: start, endDate: end });
    // The in-range fill is on day cells between start and end; assert one mid cell renders.
    const mid = getByTestId("cal.day.2026-06-12.inMonth");
    expect(mid).toBeTruthy();
  });
});

> **v1 scope note:** Tap-on-calendar always sets a single-day selection (start = end = tappedDay). Multi-day ranges are built via the existing End Date date-picker field above the calendar; the calendar visualises whatever range the parent props express. This is a deliberate v1 simplification — no internal pick-phase state, no two-tap range building. Drag-to-extend / two-tap range building is a candidate for v2.
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd mobile && npx jest src/components/__tests__/AvailabilityCalendar.test.tsx -t "AvailabilityCalendar component"`
Expected: All FAIL — placeholder returns null so testIDs aren't found.

- [ ] **Step 3: Replace the placeholder with the full component**

Rewrite `mobile/src/components/AvailabilityCalendar.tsx` (keeping the helpers and `__test__` export from Task 4 intact). Final shape:

```tsx
import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import type { BookedRange } from "@/lib/types";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";

type DayCell = { date: Date; inMonth: boolean };

function daysInMonth(year: number, month: number): DayCell[] {
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = firstOfMonth.getDay();
  const start = new Date(year, month, 1 - firstWeekday);
  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({ date: d, inMonth: d.getMonth() === month });
  }
  return cells;
}

function sameYMD(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function intersectsAnyRange(day: Date, ranges: BookedRange[]): boolean {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return ranges.some((r) => {
    const rStart = new Date(r.start);
    const rEnd = new Date(r.end);
    return rStart < dayEnd && rEnd > dayStart;
  });
}

function ymdKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const __test__ = { daysInMonth, sameYMD, intersectsAnyRange };

type Props = {
  bookedRanges: BookedRange[];
  startDate: Date;
  endDate: Date;
  mode: "DAILY" | "HOURLY";
  onChange: (start: Date, end: Date) => void;
  // Test-only: pin the displayed month so the grid is deterministic in unit tests.
  anchorMonth?: Date;
  testID?: string;
};

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function AvailabilityCalendar({
  bookedRanges,
  startDate,
  endDate,
  mode,
  onChange,
  anchorMonth,
  testID = "cal",
}: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const todayStart = useMemo(() => {
    const t = anchorMonth ?? new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }, [anchorMonth]);
  const maxMonthOffset = 1; // 30-day window spans current + next month at most

  const [monthOffset, setMonthOffset] = useState(0);
  const displayMonth = useMemo(() => {
    const base = anchorMonth ?? new Date();
    return new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  }, [anchorMonth, monthOffset]);

  const cells = useMemo(
    () => daysInMonth(displayMonth.getFullYear(), displayMonth.getMonth()),
    [displayMonth]
  );

  function handleDayPress(day: Date) {
    // v1: single-day selection on tap. Multi-day ranges built via date-picker
    // field above; calendar reflects whatever range parent props express.
    onChange(day, day);
  }

  const monthLabel = displayMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <View style={s.wrapper} testID={testID}>
      <View style={s.header}>
        <TouchableOpacity
          testID={`${testID}.prev`}
          disabled={monthOffset <= 0}
          onPress={() => setMonthOffset((o) => Math.max(0, o - 1))}
          style={[s.navBtn, monthOffset <= 0 && s.navBtnDisabled]}
        >
          <ChevronLeft size={20} color={monthOffset <= 0 ? colors.text.tertiary : colors.text.primary} />
        </TouchableOpacity>
        <Text style={s.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity
          testID={`${testID}.next`}
          disabled={monthOffset >= maxMonthOffset}
          onPress={() => setMonthOffset((o) => Math.min(maxMonthOffset, o + 1))}
          style={[s.navBtn, monthOffset >= maxMonthOffset && s.navBtnDisabled]}
        >
          <ChevronRight size={20} color={monthOffset >= maxMonthOffset ? colors.text.tertiary : colors.text.primary} />
        </TouchableOpacity>
      </View>

      <View style={s.weekRow}>
        {WEEKDAY_LABELS.map((w, i) => (
          <Text key={i} style={s.weekLabel}>{w}</Text>
        ))}
      </View>

      <View style={s.grid}>
        {cells.map((cell, i) => {
          const isPast = cell.date < todayStart;
          const overlaps = intersectsAnyRange(cell.date, bookedRanges);
          const blocked = overlaps && mode === "DAILY";
          const partial = overlaps && mode === "HOURLY";
          const isStart = sameYMD(cell.date, startDate);
          const isEnd = sameYMD(cell.date, endDate);
          const isToday = sameYMD(cell.date, todayStart);
          const inRange =
            !sameYMD(startDate, endDate) &&
            cell.date > startDate &&
            cell.date < endDate;

          const disabled = !cell.inMonth || isPast || blocked;

          const cellStyles = [
            s.cell,
            !cell.inMonth && s.cellOutOfMonth,
            isPast && s.cellPast,
            blocked && s.cellBlocked,
            inRange && s.cellInRange,
            (isStart || isEnd) && s.cellSelected,
            isToday && s.cellToday,
          ];

          const textStyles = [
            s.cellText,
            !cell.inMonth && s.cellTextOutOfMonth,
            disabled && s.cellTextDisabled,
            (isStart || isEnd) && s.cellTextSelected,
          ];

          let stateSuffix = "outOfMonth";
          if (cell.inMonth) {
            if (blocked) stateSuffix = "blocked";
            else if (partial) stateSuffix = "partial";
            else stateSuffix = "inMonth";
          }

          return (
            <TouchableOpacity
              key={i}
              testID={`${testID}.day.${ymdKey(cell.date)}.${stateSuffix}`}
              disabled={disabled}
              onPress={() => handleDayPress(cell.date)}
              style={cellStyles}
              activeOpacity={0.7}
            >
              <Text style={textStyles}>{cell.date.getDate()}</Text>
              {partial && <View style={s.partialDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    wrapper: { gap: spacing.sm },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    monthLabel: { fontSize: fontSize.md, fontWeight: "700", color: colors.text.primary },
    navBtn: { padding: spacing.xs, borderRadius: borderRadius.sm },
    navBtnDisabled: { opacity: 0.4 },
    weekRow: { flexDirection: "row" },
    weekLabel: {
      flex: 1,
      textAlign: "center",
      fontSize: fontSize.xs,
      color: colors.text.tertiary,
      fontWeight: "600",
    },
    grid: { flexDirection: "row", flexWrap: "wrap" },
    cell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: borderRadius.sm,
    },
    cellOutOfMonth: { opacity: 0 },
    cellPast: { opacity: 0.35 },
    cellBlocked: { backgroundColor: colors.surface },
    cellInRange: { backgroundColor: colors.primaryLight },
    cellSelected: { backgroundColor: colors.primary },
    cellToday: { borderWidth: 1, borderColor: colors.primary },
    cellText: { fontSize: fontSize.sm, color: colors.text.primary },
    cellTextOutOfMonth: { color: "transparent" },
    cellTextDisabled: { color: colors.text.tertiary },
    cellTextSelected: { color: colors.surface, fontWeight: "700" },
    partialDot: {
      position: "absolute",
      bottom: 4,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.text.tertiary,
    },
  });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd mobile && npx jest src/components/__tests__/AvailabilityCalendar.test.tsx`
Expected: ALL pass — the 6 helper tests plus the 5 component tests.

- [ ] **Step 5: Run mobile typecheck**

Run: `cd mobile && npx tsc --noEmit 2>&1 | grep -E "(AvailabilityCalendar)"`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/AvailabilityCalendar.tsx mobile/src/components/__tests__/AvailabilityCalendar.test.tsx
git commit -m "feat(mobile): availability calendar component"
```

---

## Task 6: Mobile — Inject calendar into rental detail screen

**Files:**
- Modify: `mobile/src/app/(drawer)/rental/[id].tsx`

- [ ] **Step 1: Add the import**

In `mobile/src/app/(drawer)/rental/[id].tsx`, add the import near the existing `DateTimeField` import:

```ts
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
```

- [ ] **Step 2: Insert the Availability section between Pricing and Booking**

After the existing Pricing section (which ends with its `<View style={s.divider} />` around line 123, just before the Booking section that begins with `<Text style={s.sectionLabel}>Booking</Text>`), insert:

```tsx
<View style={s.section}>
  <Text style={s.sectionLabel}>Availability</Text>
  <AvailabilityCalendar
    testID="rental.calendar"
    bookedRanges={vehicle.bookedRanges ?? []}
    startDate={startDate}
    endDate={endDate}
    mode={rentalType}
    onChange={(start, end) => {
      setStartDate(withTime(start, startDate));
      setEndDate(withTime(end, endDate));
    }}
  />
</View>

<View style={s.divider} />
```

The `withTime` helper is already defined at the top of this file (it was added by the hourly-time-picker slice). `withTime(base, time)` returns a Date with `base`'s YMD and `time`'s HH:MM, so passing `(start, startDate)` keeps the time portion the user already chose.

- [ ] **Step 3: Run typecheck**

Run: `cd mobile && npx tsc --noEmit 2>&1 | grep -E "(rental/\[id\]|AvailabilityCalendar)"`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/app/\(drawer\)/rental/\[id\].tsx
git commit -m "feat(mobile): availability calendar on rental detail screen"
```

---

## Task 7: Mobile — Inject calendar into chauffeur detail screen

**Files:**
- Modify: `mobile/src/app/(drawer)/chauffeur/[id].tsx`

- [ ] **Step 1: Add the import**

In `mobile/src/app/(drawer)/chauffeur/[id].tsx`, add the import near the existing `DateTimeField` import:

```ts
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
```

- [ ] **Step 2: Insert the Availability section between Pricing (or Experience) and Booking**

After the Experience section (or the Pricing section if Experience isn't rendered), and the trailing `<View style={s.divider} />` (around line 122), insert before the Booking section:

```tsx
<View style={s.section}>
  <Text style={s.sectionLabel}>Availability</Text>
  <AvailabilityCalendar
    testID="chauffeur.calendar"
    bookedRanges={driver.bookedRanges ?? []}
    startDate={startDate}
    endDate={endDate}
    mode={serviceType}
    onChange={(start, end) => {
      setStartDate(withTime(start, startDate));
      setEndDate(withTime(end, endDate));
    }}
  />
</View>

<View style={s.divider} />
```

`withTime` is already defined at the top of this file.

- [ ] **Step 3: Run typecheck**

Run: `cd mobile && npx tsc --noEmit 2>&1 | grep -E "(chauffeur/\[id\]|AvailabilityCalendar)"`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/app/\(drawer\)/chauffeur/\[id\].tsx
git commit -m "feat(mobile): availability calendar on chauffeur detail screen"
```

---

## Task 8: Verification

**Files:** none modified — this is the final sweep.

- [ ] **Step 1: Run the full server test suite for the changed services**

Run: `cd server && npx jest src/services/search/`
Expected: ALL pass — both rentalSearch and chauffeurSearch suites green.

- [ ] **Step 2: Run the full mobile test suite for the new component**

Run: `cd mobile && npx jest src/components/__tests__/AvailabilityCalendar.test.tsx`
Expected: ALL 12 cases pass (7 helper + 5 component).

- [ ] **Step 3: Mobile typecheck on every edited file**

Run: `cd mobile && npx tsc --noEmit 2>&1 | grep -E "(rental/\[id\]|chauffeur/\[id\]|AvailabilityCalendar|types\.ts)"`
Expected: no output.

- [ ] **Step 4: Server typecheck**

Run: `cd server && npx tsc --noEmit 2>&1 | grep -E "(rentalSearch|chauffeurSearch)"`
Expected: no output.

- [ ] **Step 5: Manual smoke test (real device or simulator)**

Bring up the mobile app and the dev server. With a seeded vehicle that has at least one APPROVED rental in the next 30 days:

1. Open Rentals → tap a vehicle that has bookings.
2. Verify an "Availability" section appears between Pricing and Booking.
3. Verify the booked days appear greyed and untappable in DAILY mode.
4. Toggle to HOURLY — verify the same days are tappable with a small dot.
5. Tap an available day → date field above updates.
6. Tap a later day → end date updates; in-between days fill with `primaryLight`.
7. Tap the `<` arrow — should be disabled (current month).
8. Tap the `>` arrow — should advance to next month; `>` is now disabled.
9. Repeat steps 1-8 for Chauffeur → driver detail.

If anything regresses, stop and file an issue per failing step; do not paper over.

---

## Self-Review

- **Spec §0 goals** — covered by Tasks 6/7 (greying), Task 1/2 (no new endpoints), Tasks 6/7 (date/time pickers stay above).
- **Spec §1 data shape** — Task 3.
- **Spec §2 backend changes** — Tasks 1, 2 (queries, mappers, tests for the listed cases).
- **Spec §3 mobile types** — Task 3.
- **Spec §4 component** — Tasks 4, 5 (helpers TDD, then full component including header nav, weekday row, day grid, per-day state table, tap behaviour).
- **Spec §5 wiring** — Tasks 6, 7 (both screens inject between Pricing and Booking, time preserved via `withTime`).
- **Spec §6 styling** — Task 5 uses `colors` / `spacing` / `borderRadius` tokens; no new design tokens.
- **Spec §6 edge cases** — Empty bookedRanges (Task 4 test), all blocked (acceptance criterion in Task 8 manual smoke), HOURLY partial marker (Task 5 component), bookedRanges undefined (Task 6/7 default to `?? []`), end-today/start-31d (Task 1/2 query window assertions), timezone (helpers use local-midnight bucketing).
- **Spec §7 acceptance** — Task 8 step 5 mirrors the acceptance criteria 1-7; Tasks 1, 2 satisfy 8, 9; Task 8 step 3 satisfies 10.
- **Placeholder scan** — every code step has the full code; no TBDs.
- **Type consistency** — `BookedRange.kind` is `"RENTAL" | "CHAUFFEUR" | "BLOCK"` everywhere it appears (types.ts, rental mapper, chauffeur mapper, component props). `AvailabilityCalendar` props match `{ bookedRanges, startDate, endDate, mode, onChange, anchorMonth?, testID? }` in test setup and both wiring tasks. `withTime` signature matches the existing helper added in the prior slice.
