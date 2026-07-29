# Availability Calendar — Rental & Chauffeur

**Date:** 2026-06-04
**Status:** Approved for planning
**Scope:** Add an in-payload bookings field to the existing rental and chauffeur listing endpoints, and render a month-grid availability calendar under the Pricing section of both detail screens on mobile.

## Goals

1. Make it impossible to accidentally book a slot that is already taken by greying out occupied days in the date picker UI.
2. Avoid adding a new endpoint or a new round trip — piggyback on the existing listing responses so the mobile detail screen already has booking data when it renders.
3. Keep the existing date / time pickers as a direct-entry fallback and as the source of truth for the hour portion in HOURLY mode.

## Non-goals

- Owner / admin UI to author `VehicleBlockedRange` rows (the model exists; no screen does).
- Multi-month browsing beyond a 30-day horizon.
- Per-hour cell rendering inside a day for HOURLY bookings (a partially-booked day shows a marker; the user picks free hours via the existing time fields).
- Treating REQUESTED rentals or REQUESTED chauffeur services as blocking — only confirmed slots (APPROVED/ACCEPTED + ACTIVE + owner blocks) count. Server-side overlap validation on submit is the safety net for the race.

## Background

The schema already has every model we need:

- `Vehicle.rentals: CarRental[]` — `RentalStatus` enum: REQUESTED / APPROVED / DECLINED / ACTIVE / COMPLETED / CANCELLED / DISPUTED (`server/prisma/schema.prisma:1146-1154`).
- `Vehicle.chauffeurServices: ChauffeurService[]` — `ChauffeurStatus` enum: REQUESTED / ACCEPTED / DECLINED / ACTIVE / COMPLETED / CANCELLED / DISPUTED (`server/prisma/schema.prisma:1166-1174`).
- `Vehicle.blockedRanges: VehicleBlockedRange[]` — owner-set blocks (`server/prisma/schema.prisma:471-481`).
- Chauffeur (driver) bookings live on `ChauffeurService` filtered by `driverId` — independent of which vehicle is attached.

The mobile listing hooks already fetch the full listing and the detail screen calls `.find()` to pick one item (`mobile/src/app/(drawer)/rental/[id].tsx:36`, `mobile/src/app/(drawer)/chauffeur/[id].tsx:35`). So enriching the listing response is sufficient — no detail-fetch path to change.

## Design

### 1. Shared data shape

A booked range is a flat object:

```ts
type BookedRange = {
  start: string;  // ISO 8601 datetime
  end: string;    // ISO 8601 datetime
  kind: "RENTAL" | "CHAUFFEUR" | "BLOCK";
};
```

Embedded as `bookedRanges: BookedRange[]` on each item in the listing response.

### 2. Backend — extend the two existing handlers

Both controllers delegate to a shared search service. Changes live in the services so the four endpoints (public + guest-browse mirror) inherit them.

**`server/src/services/search/rentalSearch.service.ts`** — `searchAvailableVehicles`-equivalent:

Add to the Prisma query for each returned vehicle (via `include` or a follow-up `findMany`):

```ts
rentals: {
  where: {
    status: { in: ["APPROVED", "ACTIVE"] },
    endDate:   { gte: now },
    startDate: { lte: addDays(now, 30) },
  },
  select: { startDate: true, endDate: true },
},
chauffeurServices: {
  where: {
    status: { in: ["ACCEPTED", "ACTIVE"] },
    endDate:   { gte: now },
    startDate: { lte: addDays(now, 30) },
  },
  select: { startDate: true, endDate: true },
},
blockedRanges: {
  where: {
    to:   { gte: now },
    from: { lte: addDays(now, 30) },
  },
  select: { from: true, to: true },
},
```

Map into `bookedRanges` on the response shape:

```ts
bookedRanges: [
  ...rentals.map(r => ({ start: r.startDate.toISOString(), end: r.endDate.toISOString(), kind: "RENTAL" as const })),
  ...chauffeurServices.map(s => ({ start: s.startDate.toISOString(), end: s.endDate.toISOString(), kind: "CHAUFFEUR" as const })),
  ...blockedRanges.map(b => ({ start: b.from.toISOString(), end: b.to.toISOString(), kind: "BLOCK" as const })),
]
```

**`server/src/services/search/chauffeurSearch.service.ts`** — `searchAvailableDrivers`-equivalent:

Each driver is a User. Source the windows from `ChauffeurService` filtered by `driverId`:

```ts
driverChauffeurServices: {
  where: {
    status: { in: ["ACCEPTED", "ACTIVE"] },
    endDate:   { gte: now },
    startDate: { lte: addDays(now, 30) },
  },
  select: { startDate: true, endDate: true },
},
```

Map into `bookedRanges` with `kind: "CHAUFFEUR"`.

**Mappers / response types:** the existing public-facing rentalSearch and chauffeurSearch mappers (used by the guest-browse `/rentals/search` and `/chauffeur-services/search` mirrors at `server/src/routes/public.routes.ts:84,102`) already strip owner contact info. Adding `bookedRanges` to the mapped shape carries the field through both authed and guest endpoints with no privacy change — only start/end and a kind code are exposed.

**Validation:** server-side overlap rejection on rental and chauffeur create stays. Calendar is UX, not a security boundary.

**Tests:** the two services already have test files (`rentalSearch.service.test.ts`, `chauffeurSearch.service.test.ts`). Add cases per service:

- Vehicle with one APPROVED rental in the next 30d → `bookedRanges` contains it.
- Vehicle with a REQUESTED rental → NOT in `bookedRanges`.
- Vehicle with an ACCEPTED chauffeur service → in `bookedRanges` with `kind: "CHAUFFEUR"`.
- Vehicle with a `VehicleBlockedRange` → in `bookedRanges` with `kind: "BLOCK"`.
- Booking starting >30 days out → NOT in `bookedRanges`.
- Booking that ended yesterday → NOT in `bookedRanges`.
- Driver with one ACCEPTED service in the next 30d → driver `bookedRanges` contains it.
- Driver with no upcoming services → `bookedRanges` is `[]`.

### 3. Mobile types

`mobile/src/lib/types.ts`:

```ts
export type BookedRange = {
  start: string;
  end: string;
  kind: "RENTAL" | "CHAUFFEUR" | "BLOCK";
};
```

Add optional `bookedRanges?: BookedRange[]` to `RentalVehicleListing` (around line 190) and `ChauffeurDriverListing` (around line 238). Optional so older client builds against the new server still parse, and the new client treats `undefined` as "no info" and gracefully degrades to no greying.

### 4. New component — `mobile/src/components/AvailabilityCalendar.tsx`

```ts
type Props = {
  bookedRanges: BookedRange[];
  startDate: Date;
  endDate: Date;
  mode: "DAILY" | "HOURLY";
  onChange: (start: Date, end: Date) => void;
  testID?: string;
};
```

**Layout**

- Header: `< June 2026 >` arrows. Arrows are disabled when leaving the [thisMonth, thisMonth+1] window. The 30-day server cap means at most two months are reachable; we cap navigation to those two.
- Weekday row: `S M T W T F S`.
- Day grid: 6 rows × 7 columns of cells, leading and trailing cells outside the current month shown as faint and untappable.

**Per-day cell state** (computed once per render from `bookedRanges`):

| State | Condition | Visual | Tappable |
|---|---|---|---|
| Past | `day < startOfToday` | faint, struck | no |
| Fully blocked (DAILY) | day intersects any range AND mode is DAILY | `colors.surface` bg, `text.tertiary` | no |
| Partial (HOURLY) | day intersects any range AND mode is HOURLY | dotted underline marker, normal text | yes |
| Available | otherwise | `colors.background`, normal text | yes |
| Today | `day == startOfToday` | thin ring on the cell | depends on rules above |
| Selected start / end | `day == startDate` or `day == endDate` (date portion only) | `colors.primary` solid bg, white text | yes |
| In-range fill | `startDate < day < endDate` (date portion only) | `colors.primaryLight` bg | yes |

**Tap behavior**

```
if no startDate selected, or both startDate and endDate already set:
  onChange(pickedDay, pickedDay)    // start a new range
else if pickedDay > startDate:
  onChange(startDate, pickedDay)    // extend
else if pickedDay < startDate:
  onChange(pickedDay, pickedDay)    // new range
else (pickedDay == startDate):
  onChange(pickedDay, pickedDay)    // collapse to single day
```

When `mode === "HOURLY"`, the time portion of the existing `startDate` / `endDate` is preserved across the call (the wiring code in §5 handles this — the calendar always emits midnight; the screen merges with the prior time).

**Helpers (local to component)**

- `daysInMonth(year, month)` → grid of 42 Date objects with `inMonth: bool`.
- `intersectsAnyRange(day: Date, ranges: BookedRange[]) → bool` — overlap if any range's `[start, end]` overlaps the day's `[00:00, 24:00)`.
- `sameYMD(a: Date, b: Date) → bool`.

### 5. Wiring into the two screens

**`mobile/src/app/(drawer)/rental/[id].tsx`** — between the Pricing section divider and the Booking section (after line 123):

```tsx
<View style={s.section}>
  <Text style={s.sectionLabel}>Availability</Text>
  <AvailabilityCalendar
    testID="rental.calendar"
    bookedRanges={vehicle.bookedRanges ?? []}
    startDate={startDate}
    endDate={endDate}
    mode={rentalType}
    onChange={(s, e) => {
      // Preserve the time portion already on startDate / endDate
      setStartDate(withTime(s, startDate));
      setEndDate(withTime(e, endDate));
    }}
  />
</View>
<View style={s.divider} />
```

The existing `withTime` helper (added in the hourly-time-picker slice) is reused.

**`mobile/src/app/(drawer)/chauffeur/[id].tsx`** — identical injection between Experience / Pricing and Booking. Passes `mode={serviceType}` and `vehicle.bookedRanges` becomes `driver.bookedRanges`.

### 6. Styling

All colors via `useTheme().colors`. Reuse:

- `colors.surface` / `colors.background` for cell backgrounds.
- `colors.primary` / `colors.primaryLight` for selection.
- `colors.text.{primary, secondary, tertiary}` for text states.
- `spacing.sm` for cell padding, `borderRadius.sm` for cell rounding.

No new design tokens. Cell size: `flex: 1, aspectRatio: 1` inside a row.

## Edge cases

1. **No bookings.** `bookedRanges` empty → every future day available.
2. **All days blocked.** User cannot pick via the calendar; date pickers above still work and server rejects on submit.
3. **Range crosses a blocked day in DAILY.** The wiring layer detects overlap after `onChange` runs and could warn — for v1, we let the server-side overlap rejection handle it on submit. (Client-side overlap warning is a v2 nicety.)
4. **HOURLY booking on a partially-booked day.** Calendar shows the partial marker; user picks free hours via the time field; server validates.
5. **`bookedRanges` undefined.** Old server, new client → calendar renders with no greying; functions as a normal date picker.
6. **Booking that ends today.** Excluded by `endDate >= now` filter.
7. **Booking that starts in 31 days.** Excluded by `startDate <= now + 30d`.
8. **Timezone.** All dates are ISO strings round-tripped through `new Date(...)`. Day cells are bucketed in the device's local timezone. Acceptable: Rwanda is UTC+2 year-round, no DST.

## Acceptance criteria

1. **Rental detail** shows an Availability section between Pricing and Booking with a month grid.
2. **Chauffeur detail** shows the same section in the same position.
3. Days that overlap an APPROVED/ACTIVE rental, an ACCEPTED/ACTIVE chauffeur service, or a `VehicleBlockedRange` are greyed and untappable when `mode === "DAILY"`.
4. The same days are tappable with a marker when `mode === "HOURLY"`; the user can still pick hours via the time field above.
5. Tapping an available day populates `startDate`; tapping a later day populates `endDate`. The time portion of `startDate` / `endDate` is preserved across calendar interactions.
6. `< >` arrows navigate within the [thisMonth, thisMonth+1] window; cannot go further.
7. Submitting an overlapping range still produces the existing server-side rejection (UX-only protection).
8. Listing responses on rental and chauffeur endpoints (authed + guest-browse mirror) include `bookedRanges` per item.
9. Service tests added for the eight cases enumerated in §2.
10. Mobile typecheck passes; the optional `bookedRanges?` field on the listing types does not break any existing consumer.

## Files touched

| Path | Change |
|---|---|
| `server/src/services/search/rentalSearch.service.ts` | Extend query + mapper to emit `bookedRanges`. |
| `server/src/services/search/rentalSearch.service.test.ts` | Add four test cases (APPROVED, REQUESTED, BLOCK, out-of-window). |
| `server/src/services/search/chauffeurSearch.service.ts` | Extend query + mapper to emit `bookedRanges` per driver. |
| `server/src/services/search/chauffeurSearch.service.test.ts` | Add four test cases (ACCEPTED, REQUESTED, empty, out-of-window). |
| `mobile/src/lib/types.ts` | Add `BookedRange` type; optional `bookedRanges` on the two listing types. |
| `mobile/src/components/AvailabilityCalendar.tsx` | New ~250-line component. |
| `mobile/src/app/(drawer)/rental/[id].tsx` | Inject Availability section between Pricing and Booking. |
| `mobile/src/app/(drawer)/chauffeur/[id].tsx` | Same injection. |

No schema migration. No new routes. No new mobile hooks.

## Open questions

None — the three forks confirmed in brainstorming:
- Block statuses: confirmed only (APPROVED/ACCEPTED + ACTIVE + BLOCK).
- Time horizon: 30 days.
- UI: month grid with greyed blocked days.
