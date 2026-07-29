# Bus Multi-Seat Booking — Design

**Date:** 2026-07-18
**Status:** Approved

## Problem

When booking a bus ticket from an operator, a user can only book one seat for
themselves. Families or groups travelling together must each create separate
bookings. The mobile confirm-booking screen hardcodes `seats = 1`.

## Context

The backend already supports multi-seat bookings end to end:

- `POST /rides/:rideId/book` accepts `seatsBooked` (int ≥ 1, validated in
  `server/src/middlewares/validators/ride.request.validator.ts`).
- The controller checks `ride.availableSeats`, scales fare and platform fee by
  seat count, creates one `BookingSeat` per seat (each with a unique QR
  attendance code), and decrements `availableSeats`.
- The mobile `useBookRide` hook already sends `seatsBooked`.
- The ticket screen (`mobile/src/app/bus/trip/[rideId]/ticket.tsx`) already
  renders one QR code per `bookingSeat`.

Only the mobile booking screen blocks multi-passenger booking.

## Decision: seat count only, no passenger names

Only the number of seats is collected. No per-passenger details (names, etc.)
are gathered; each seat gets its own QR code and the conductor scans each on
boarding. This requires zero backend changes. A passenger manifest can be added
later if operators need one.

## Change

**File:** `mobile/src/app/bus/trip/[rideId]/index.tsx`

1. Replace `const [seats] = useState(1)` with mutable state.
2. Add a "PASSENGERS" section between the drop-off stop picker and the price
   card: a stepper row (− button, seat count, + button) styled like the
   existing option cards.
   - Minimum 1; maximum `ride.availableSeats`.
   - Buttons disable at the bounds (− disabled at 1, + disabled at max).
   - If `availableSeats` ≤ 1, the stepper renders with + disabled.
3. Price card shows `Fare · N seat(s)` and total
   `ride.contribution × N` (formatted with `formatCurrency`, cents-rounded as
   today). Keep the "Pay operator on boarding (cash)" note.
4. `onConfirm` passes the selected count to `useBookRide` (already wired).

**No changes** to the ticket screen, `useBookRide`, or the server.

## Error handling

If seats sell out between screen load and confirmation, the server responds
with "Not enough seats available. Only N seat(s) left." The existing
`handleApiError(e, t)` path surfaces this. No additional handling.

## Testing

- Pure helper (e.g. `clampSeats(next, max)` in `mobile/src/lib/busBooking.ts`)
  unit-tested alongside `isValidStopSelection` in
  `mobile/src/lib/__tests__/busBooking.test.ts`: respects min 1, respects max,
  handles max < 1.
- Component behavior: stepper increments/decrements within bounds, fare total
  reflects seat count, booking mutation receives the chosen seat count.
