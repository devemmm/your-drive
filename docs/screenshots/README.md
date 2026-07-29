# Bus Operator (Provider) Feature — E2E Verification Screenshots

Captured 2026-06-30 with Playwright against the full Docker stack
(client :8480, server :3003, postgres, minio). Admin: `admin@yourdrive.com`.
Test operator created during the run: **Zupco Buses** (`ops@zupco.co.zw`).

## Timeline

`01`–`08` were captured **before** the fix and include the first-login bug.
`09`–`13` were captured **after** the fix, from a genuine first-login state.

| # | File | What it shows |
|---|------|---------------|
| 01 | `01-admin-bus-operators-empty.png` | Admin → Bus Operators tab, empty list before creation |
| 02 | `02-admin-create-operator-form-filled.png` | Create-bus-operator form filled in |
| 03 | `03-admin-operator-created-in-list.png` | **Created operator appears in the list** — `Operators (1)`, Zupco Buses, ACTIVE (the reported "doesn't appear" bug is fixed) |
| 04 | `04-operator-login-trapped-passenger-onboarding.png` | **BUG (now fixed):** first operator login used to land on the passenger "Travel Preferences" onboarding wizard instead of `/operator` |
| 05 | `05-operator-dashboard-my-buses.png` | Operator dashboard — My Buses tab |
| 06 | `06-operator-route-created.png` | Operator created a route (Harare → Bulawayo) |
| 07 | `07-operator-trips-schedule.png` | Trips/Schedule tab — route wired into the trip form |
| 08 | `08-operator-blocked-from-admin-redirect-home.png` | Operator blocked from `/admin` (redirected home) — guard works |
| 09 | `09-operator-first-login-now-reaches-dashboard-FIXED.png` | **FIX VERIFIED:** first login (isPassengerOnboarded=false) now lands directly on `/operator` |
| 10 | `10-operator-bus-added.png` | Added a bus with image upload — Scania Marcopolo, ZUP-001, 60 seats |
| 11 | `11-operator-trip-scheduled.png` | Scheduled a trip — Harare → Bulawayo, Scania Marcopolo, 7/15/2026, 60/60, fare 15 |
| 12 | `12-operator-passengers-manifest.png` | Passenger manifest for the trip (no bookings yet) |
| 13 | `13-operator-routes-two.png` | Two routes before deleting the second one (delete verified, 204) |

## Result summary

- ✅ Admin can create a bus operator, and it appears in the Bus Operators list immediately (the reported bug is fixed).
- ✅ **Fixed:** a newly-created operator now reaches `/operator` on first login.
  Root cause was `client/src/providers/AuthProvider.tsx` redirecting any user
  with `!isPassengerOnboarded` into passenger onboarding without excluding
  `BUS_OPERATOR`; the fix adds that exclusion (mirroring `Login.tsx`).
- ✅ All provider actions verified end-to-end (all returned 2xx, 0 console errors):
  - Buses — create (`POST /vehicles` 201, with image upload) + list
  - Routes — create (`POST /operator/routes` 201) + delete (`DELETE` 204) + list
  - Trips — schedule (`POST /operator/trips` 201) + list
  - Passengers — manifest (`GET /operator/trips/:id/manifest` 200)
- ✅ Access guards: operator blocked from `/admin`; operator/admin APIs return 401 without a token.

### Known separate issue (not part of this feature)

The admin dashboard fires `GET /api/v1/admin/users` which returns 404 (the admin
router only defines `POST /users`). It does not affect the Bus Operators tab
(which uses `GET /api/v1/users?role=BUS_OPERATOR`). Left as-is.
