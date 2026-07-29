# YourDrive Mobile App — Client Test Script

**App version:** _____________  **Device / OS:** _____________  **Tester:** _____________  **Date:** _____________

## How to use this document

Work through each section in order. For every test case:

- Follow the **Steps** exactly as written.
- Compare what you see to the **Expected result**.
- Mark the **Status** column: `PASS`, `FAIL`, `BLOCKED` (cannot run), or `N/A` (feature not needed).
- If `FAIL`, write what actually happened in **Notes** and attach a screenshot if possible.

Legend used in "Status" columns:
- `[ ]` not tested yet
- `[x]` tested — record result next to it

---

## 1. Installation & First Launch

> **2026-05-11 update:** Permission prompts moved from app-open to just-in-time (slice A polish, PR 2B). Don't expect prompts on the very first launch — they fire when the relevant feature is reached.

| # | Test case | Steps | Expected result | Status | Notes |
|---|---|---|---|---|---|
| 1.1 | App installs | Install the build sent by the team onto your phone. | App installs without error; YourDrive icon appears on home screen. | [ ] | |
| 1.2 | App opens | Tap the YourDrive icon. | App launches to the Welcome screen within a few seconds; no crash. | [ ] | |
| 1.3 | Location permission prompt | Open any flow that needs the map (e.g. tap on the home map screen, or open a ride request). | First time you reach the map, the location permission prompt appears. Allow location. | [ ] | |
| 1.4 | Notification permission prompt | Submit a ride booking (e.g. tap "Book" on a ride card) or post a ride. | First time you submit a booking, the push notification prompt appears. Allow notifications. | [ ] | |
| 1.5 | Offline banner | Turn phone to airplane mode, then open the app. | An "offline" / "no internet" banner appears at the top. | [ ] | |
| 1.6 | Recovers when back online | Turn airplane mode off. | Offline banner disappears; app works normally. | [ ] | |

---

## 2. Sign Up Flow

| # | Test case | Steps | Expected result | Status | Notes |
|---|---|---|---|---|---|
| 2.1 | Welcome screen | Open the app while logged out. | You see a Welcome screen with "Sign Up" and "Login" buttons. | [ ] | |
| 2.2 | Open sign up | Tap "Sign Up". | Registration form opens with fields: first name, last name, email, password, referral code (optional), terms checkbox. | [ ] | |
| 2.3 | Required fields validation | Leave all fields blank and tap "Create account". | Form shows validation errors for every required field. | [ ] | |
| 2.4 | Invalid email rejected | Enter an invalid email (e.g. `abc`) and submit. | Clear "invalid email" error is shown. | [ ] | |
| 2.5 | Weak password rejected | Enter a very short password (e.g. `12`). | Password rule error is shown. | [ ] | |
| 2.6 | Terms must be accepted | Fill everything but do NOT tick the T&Cs checkbox. | Submit is blocked / an error asks you to accept terms. | [ ] | |
| 2.7 | Successful sign up | Fill valid details, accept terms, submit. | Account is created; you are taken to the next onboarding step (phone verification or role selection). | [ ] | |
| 2.8 | Duplicate email rejected | Sign up again using the same email. | Clear error: "account already exists" (or equivalent). | [ ] | |
| 2.9 | Referral code accepted | Sign up with a referral code a friend gives you. | Account is created successfully; referral is linked. | [ ] | |
| 2.10 | Phone verification — send code | On phone verification screen, enter your number and tap "Send code". | You receive an SMS with a code within a minute. | [ ] | |
| 2.11 | Phone verification — wrong code | Enter an obviously wrong code. | App shows "invalid code" (or similar) and does not proceed. | [ ] | |
| 2.12 | Phone verification — correct code | Enter the real code from SMS. | Phone is marked as verified; app moves to the next step. | [ ] | |

---

## 3. Login & Password Recovery

| # | Test case | Steps | Expected result | Status | Notes |
|---|---|---|---|---|---|
| 3.1 | Login — wrong password | Log out, log in with correct email but wrong password. | Clear error ("invalid credentials" or similar); you stay on login. | [ ] | |
| 3.2 | Login — wrong email | Log in with an email that doesn't exist. | Clear error; no crash. | [ ] | |
| 3.3 | Login — valid credentials | Log in with correct email and password. | You land on the home map screen within a few seconds. | [ ] | |
| 3.4 | Stay logged in | Close the app fully, then reopen it. | App opens directly to the home screen — you should NOT be asked to log in again. | [ ] | |
| 3.5 | Forgot password — open screen | From login, tap "Forgot password?". | Reset screen opens with an email field. | [ ] | |
| 3.6 | Forgot password — submit | Enter your email and submit. | Success message shown; you receive a password reset email within a few minutes. | [ ] | |
| 3.7 | Forgot password — reset | Follow the link in the email and set a new password. | New password works on login. | [ ] | |
| 3.8 | Logout | From profile / drawer, tap Logout. | You are returned to the Welcome screen; reopening the app requires login. | [ ] | |

---

## 4. Onboarding — Passenger

| # | Test case | Steps | Expected result | Status | Notes |
|---|---|---|---|---|---|
| 4.1 | Passenger onboarding screen | After signup, choose the passenger path (if asked). | Welcome / intro screen is shown. | [ ] | |
| 4.2 | Get started | Tap "Get Started". | You land on the home map screen as a passenger. | [ ] | |

---

## 5. Onboarding — Driver

| # | Test case | Steps | Expected result | Status | Notes |
|---|---|---|---|---|---|
| 5.1 | Driver onboarding — open | From the profile or driver flow, open driver onboarding. | Form is shown: license number, driving experience, license front & back photo upload. | [ ] | |
| 5.2 | Required fields validation | Try to submit empty form. | Errors are shown for each missing field. | [ ] | |
| 5.3 | Upload license — front | Tap to upload front of licence, pick a photo from gallery or camera. | Selected image appears in the form. | [ ] | |
| 5.4 | Upload license — back | Repeat for back of licence. | Image appears in the form. | [ ] | |
| 5.5 | Submit driver details | Fill everything and submit. | Submission succeeds; you are taken to the driver home / next step. | [ ] | |
| 5.6 | Driver status pending | After submission, check your profile. | Profile shows a "pending verification" (or similar) indicator if verification is required. | [ ] | |

---

## 6. Profile

| # | Test case | Steps | Expected result | Status | Notes |
|---|---|---|---|---|---|
| 6.1 | Open profile | From the drawer menu, tap "Profile". | Profile screen shows: avatar/initials, name, email, rating, vehicle count, wallet balance, availability toggle. | [ ] | |
| 6.2 | Open edit profile | Tap "Edit profile". | Edit form opens with: first name, last name, phone, date of birth. | [ ] | |
| 6.3 | Edit first name | Change first name and save. | Changes saved; profile screen reflects the new name. | [ ] | |
| 6.4 | Edit last name | Change last name and save. | Changes saved and visible. | [ ] | |
| 6.5 | Edit phone number | Change phone number and save. | Number is saved; if phone re-verification is required, SMS flow starts again. | [ ] | |
| 6.6 | Set date of birth | Open date picker, pick a date, save. | Date of birth is stored and displayed. | [ ] | |
| 6.7 | Change photo (placeholder) | Tap "Change Photo". | Shows a "Coming Soon" message (known placeholder). | [ ] | |
| 6.8 | Ratings visible | On the profile screen, check your rating. | Star rating is visible (0 or higher). | [ ] | |
| 6.9 | Language — switch to Kinyarwanda | Toggle language to RW. | All visible labels across the app change to Kinyarwanda. | [ ] | |
| 6.10 | Language — switch to English | Toggle back to EN. | Labels revert to English. | [ ] | |
| 6.11 | Language persists | Set a language, close and reopen the app. | App remembers your language choice. | [ ] | |

---

## 7. Vehicle Management

| # | Test case | Steps | Expected result | Status | Notes |
|---|---|---|---|---|---|
| 7.1 | Open vehicles list | From profile, open "My vehicles". | List shows your vehicles with make/model/plate/capacity (empty state if none). | [ ] | |
| 7.2 | Add new vehicle | Tap the "+" (add) button. | Add vehicle form opens. | [ ] | |
| 7.3 | Required fields | Try to submit an empty add-vehicle form. | Validation errors shown for required fields. | [ ] | |
| 7.4 | Pick category | Select a category (CAR, MOTORBIKE, VAN, BUS). | Category is set; rest of the form updates accordingly. | [ ] | |
| 7.5 | Upload vehicle photos | Add up to 4 photos. | All photos appear as thumbnails before saving. | [ ] | |
| 7.6 | Save vehicle | Fill all fields and save. | Vehicle appears in the list. | [ ] | |
| 7.7 | Edit vehicle | Tap a vehicle to edit. | Form opens pre-filled; changes save correctly. | [ ] | |
| 7.8 | Set rental pricing | On edit, fill in daily rate, hourly rate, security deposit, mileage limit, description. | All fields save; vehicle is available for rental browsing. | [ ] | |
| 7.9 | Delete vehicle (if available) | Delete a test vehicle. | Vehicle is removed from the list. | [ ] | |

---

## 8. Home Map & Nearby Drivers (Passenger)

| # | Test case | Steps | Expected result | Status | Notes |
|---|---|---|---|---|---|
| 8.1 | Home map loads | After login, land on home. | Google map loads showing your area. | [ ] | |
| 8.2 | Current location pin | Check your location on the map. | A pin / marker shows your current position with your address below. | [ ] | |
| 8.3 | Nearby drivers visible | Wait a few seconds. | Car and motorbike icons appear on the map for nearby drivers (if any are online). | [ ] | |
| 8.4 | Locate-me button | Scroll the map away, then tap the locate-me button. | Map recenters on your current position. | [ ] | |
| 8.5 | Search bottom sheet | Pull up the bottom sheet from the bottom of the screen. | Sheet expands to show search fields (pickup, destination, etc.). | [ ] | |

---

## 9. Request a Ride (Passenger)

| # | Test case | Steps | Expected result | Status | Notes |
|---|---|---|---|---|---|
| 9.1 | Set pickup | Tap the pickup field in the search sheet. | Location picker opens; you can search or use current location. | [ ] | |
| 9.2 | Set destination | Pick a destination. | Destination is set and shown in the form. | [ ] | |
| 9.3 | Pick vehicle type | Select CAR, MOTO, or BUS. | Choice is highlighted. | [ ] | |
| 9.4 | Set passenger count | Choose number of passengers (1–8). | Number is set; capacity shown. | [ ] | |
| 9.5 | Set proposed fare | Enter a proposed fare in RWF. | Amount accepted; formatted as currency. | [ ] | |
| 9.6 | Pick date / time | Pick a future date and time. | Date and time are set. | [ ] | |
| 9.7 | Submit request | Submit the ride request. | Request created; you see a "waiting for driver" / OPEN status screen. | [ ] | |
| 9.8 | Cancel open request | From the request screen, cancel the request. | Request status becomes cancelled; you return to home. | [ ] | |
| 9.9 | Driver accepts | Have a test driver accept your request from their app. | Your app navigates you to the ride details screen automatically. | [ ] | |

---

## 10. Post / Search / Book Rides

### 10a. Post a Ride (Driver)

| # | Test case | Steps | Expected result | Status | Notes |
|---|---|---|---|---|---|
| 10.1 | Open post ride | From the drawer, tap "Post a ride". | Multi-step form opens at Step 1 (Route). | [ ] | |
| 10.2 | Step 1 — Route | Enter origin, destination, date and time. | "Next" is enabled; moves to Step 2. | [ ] | |
| 10.3 | Step 2 — Vehicle | Pick a vehicle, seats, A/C toggle, smoking toggle. | "Next" is enabled. | [ ] | |
| 10.4 | Step 3 — Preferences | Set ride preferences (e.g. music, pets). | Selections saved; moves to Step 4. | [ ] | |
| 10.5 | Step 4 — Contribution | Set the price (fare), collection method (Direct / Via platform), booking type (Automatic / Manual). | Options save; moves to Step 5. | [ ] | |
| 10.6 | Step 5 — Review | Review all details on the summary screen. | Everything you entered is shown correctly. | [ ] | |
| 10.7 | Publish ride | Tap "Publish". | Ride is published; appears in "My rides" under PUBLISHED. | [ ] | |
| 10.8 | Save as draft (if available) | Exit mid-way; reopen. | Progress / draft is remembered (or cleared — confirm which). | [ ] | |

### 10b. Search & Book a Ride (Passenger)

| # | Test case | Steps | Expected result | Status | Notes |
|---|---|---|---|---|---|
| 10.9 | Search results load | After submitting a ride request, open search results. | List of matching rides shown with driver, vehicle, times, price. | [ ] | |
| 10.10 | Filter P2P vs D2D | Toggle the ride type filter. | List updates to match the filter. | [ ] | |
| 10.11 | Infinite scroll | Scroll down the list. | More rides load automatically until exhausted. | [ ] | |
| 10.12 | Open ride details | Tap a ride card. | Ride details show driver info, vehicle, route, times, available seats, price. | [ ] | |
| 10.13 | Book a ride | Tap "Book". | Booking is created in PENDING state (or APPROVED if automatic). | [ ] | |
| 10.14 | Booking appears in My rides | Open "My rides". | Your booking is listed with correct status. | [ ] | |
| 10.15 | Cancel booking | Cancel the booking. | Status updates to CANCELLED. | [ ] | |

### 10c. Manage Bookings (Driver)

| # | Test case | Steps | Expected result | Status | Notes |
|---|---|---|---|---|---|
| 10.16 | View bookings on ride | Open the ride details for a published ride. | List of passenger bookings shown with status. | [ ] | |
| 10.17 | Approve booking | Approve a PENDING booking. | Status becomes APPROVED; passenger is notified. | [ ] | |
| 10.18 | Decline booking | Decline a booking with a reason. | Status becomes DECLINED; passenger is notified. | [ ] | |
| 10.19 | Cancel ride | Cancel the whole ride with a reason. | All bookings are cancelled; passengers are notified. | [ ] | |

---

## 11. Active Ride & Manifest

| # | Test case | Steps | Expected result | Status | Notes |
|---|---|---|---|---|---|
| 11.1 | Start ride (driver) | On the ride details, tap "Start ride". | Ride moves to ONGOING; active ride screen opens. | [ ] | |
| 11.2 | Live map | On active ride screen. | Map shows live vehicle position and route. | [ ] | |
| 11.3 | ETA shown | Look at the ETA indicator. | Estimated minutes / arrival time is visible. | [ ] | |
| 11.4 | Call driver | Tap the phone icon (as passenger). | Device's phone dialer opens with driver's number. | [ ] | |
| 11.5 | Attendance code | View attendance code / QR on the ride. | Code / QR is visible. | [ ] | |
| 11.6 | Driver opens manifest | From active ride, open manifest. | List of passengers with boarding status. | [ ] | |
| 11.7 | Scan QR | Tap "Scan" on a passenger. | Camera opens; scanning their code marks them boarded. | [ ] | |
| 11.8 | Mark boarded manually | Without QR, tap "Mark boarded". | Status updates to boarded. | [ ] | |
| 11.9 | Complete ride | Driver taps "Complete". | Ride moves to COMPLETED; completion screen opens for both parties. | [ ] | |
| 11.10 | Rate ride | Passenger rates 1–5 stars, adds comment, submits. | Thank-you / success shown; rating saved on driver's profile. | [ ] | |
| 11.11 | Skip rating | Alternatively tap "Skip". | Returns to home without rating. | [ ] | |

---

## 12. Driver "Go Online" / Availability

| # | Test case | Steps | Expected result | Status | Notes |
|---|---|---|---|---|---|
| 12.1 | Toggle availability ON | On profile, flip "Available for ride requests" to ON. | If you have multiple vehicles, picker asks which to use; confirmation shows you are online. | [ ] | |
| 12.2 | Appear on passenger map | From a second test device (passenger), view home map in your area. | Your driver icon is visible. | [ ] | |
| 12.3 | Receive ride requests | Have a passenger submit a matching ride request. | You receive a notification / see the request. | [ ] | |
| 12.4 | Toggle availability OFF | Flip the toggle to OFF. | You disappear from passenger maps within a short time. | [ ] | |

---

## 13. Rentals

| # | Test case | Steps | Expected result | Status | Notes |
|---|---|---|---|---|---|
| 13.1 | Browse rentals | Open the Rentals section. | List of rental vehicles with photos, make/model, category, capacity. | [ ] | |
| 13.2 | Open rental details | Tap a vehicle. | Full details: images, specs, rental type (Hourly / Daily), date pickers. | [ ] | |
| 13.3 | Pick rental type | Toggle Hourly and Daily. | Price and pickers update accordingly. | [ ] | |
| 13.4 | Pick dates | Choose start and end date (or start time + hours). | Dates are accepted; end must be after start. | [ ] | |
| 13.5 | Submit rental request | Submit. | Request is created and appears in "My rides" under the rental section. | [ ] | |
| 13.6 | Owner sees request | As vehicle owner, check notifications / rides. | Request is visible for acceptance. | [ ] | |
| 13.7 | Owner accepts / declines | Accept or decline request. | Renter is notified; status updates. | [ ] | |
| 13.8 | Rental completes | Mark rental complete at end of period. | Status becomes COMPLETED; both parties can rate (if applicable). | [ ] | |

---

## 14. Chauffeur Services

| # | Test case | Steps | Expected result | Status | Notes |
|---|---|---|---|---|---|
| 14.1 | Driver opts in | On Chauffeur availability screen, toggle "Available for chauffeur", set hourly & daily rates, description. | Saved; driver now appears in chauffeur listings. | [ ] | |
| 14.2 | Requires driver onboarding | As a non-verified driver, try to opt in. | Prompt tells you driver onboarding is required first. | [ ] | |
| 14.3 | Browse chauffeurs | As a passenger, open Chauffeur section. | List of verified drivers with rating, rates, availability. | [ ] | |
| 14.4 | Open driver details | Tap a driver. | Profile with hourly / daily rates, description, availability, date pickers. | [ ] | |
| 14.5 | Book chauffeur | Choose service type (hourly / daily), pick dates, submit. | Request is created; visible under "My rides" chauffeur tab. | [ ] | |
| 14.6 | Driver accepts | From the driver's side, accept the service. | Status becomes ACCEPTED; passenger is notified. | [ ] | |
| 14.7 | Start service | Driver marks active. | Status becomes ACTIVE. | [ ] | |
| 14.8 | Complete service | Driver marks complete. | Status becomes COMPLETED; rating flow available. | [ ] | |
| 14.9 | Decline service | As driver, decline a request. | Status becomes DECLINED; passenger is notified. | [ ] | |

---

## 15. Ride History ("My Rides")

| # | Test case | Steps | Expected result | Status | Notes |
|---|---|---|---|---|---|
| 15.1 | Open My Rides | From the drawer, tap "Rides". | Lists show passenger bookings, driver rides, and chauffeur services with the correct status badges. | [ ] | |
| 15.2 | Filter by status | If filters are available, filter by status. | List updates correctly. | [ ] | |
| 15.3 | Tap a past ride | Open any past ride. | Correct details are shown (history preserved). | [ ] | |
| 15.4 | Empty state | As a brand new user, open the screen. | Friendly empty-state message is shown. | [ ] | |

---

## 16. Chat / Messaging

| # | Test case | Steps | Expected result | Status | Notes |
|---|---|---|---|---|---|
| 16.1 | Open chat tab | From the drawer, open Chat. | List of threads with avatars, names, last message, unread count. | [ ] | |
| 16.2 | Open a thread | Tap a thread. | Messages load in order; your messages are on the right, others on the left; timestamps visible. | [ ] | |
| 16.3 | Send a message | Type a message, send. | Message appears instantly in the thread. | [ ] | |
| 16.4 | Real-time delivery | With a second test device, reply. | New message appears on your screen in near real time without pulling to refresh. | [ ] | |
| 16.5 | Mark as read | Enter a thread with an unread message. | Unread badge clears; message shows as read on the sender's side. | [ ] | |
| 16.6 | Deep link from ride | From a ride details screen, tap "Chat". | Opens the chat thread linked to that ride. | [ ] | |
| 16.7 | Deep link from ride request | From a ride request, tap chat. | Opens the relevant thread. | [ ] | |
| 16.8 | Keyboard behaviour | Open a long thread, tap the input. | Keyboard opens; input stays visible above the keyboard; list scrolls correctly. | [ ] | |

---

## 17. Notifications

| # | Test case | Steps | Expected result | Status | Notes |
|---|---|---|---|---|---|
| 17.1 | Notification centre | Open the notification icon / screen. | List of notifications with type, time, unread badge. | [ ] | |
| 17.2 | Unread count | Check the bell / drawer badge. | Badge count matches the number of unread items. | [ ] | |
| 17.3 | Tap a notification | Tap a notification (e.g. "ride accepted"). | App navigates straight to the relevant screen (ride / chat / booking). | [ ] | |
| 17.4 | Mark all as read | Tap "Mark all read". | All unread badges clear. | [ ] | |
| 17.5 | Push notification — foreground | With app open, trigger a notification from another device. | Notification appears as a banner or in the centre; tapping it navigates correctly. | [ ] | |
| 17.6 | Push notification — background | Close the app fully, trigger a notification. | Push arrives on the lock screen; tapping opens the app on the correct screen. | [ ] | |

---

## 18. Wallet & Transactions

| # | Test case | Steps | Expected result | Status | Notes |
|---|---|---|---|---|---|
| 18.1 | Open wallet | From the drawer, open Wallet. | Shows current balance (RWF), debt limit, available funds, recent activity. | [ ] | |
| 18.2 | Transactions list | Open Transactions. | List of all transactions with type, amount, date/time, and status badge (PENDING / COMPLETED / FAILED / REFUNDED). | [ ] | |
| 18.3 | Transaction status colours | Review several transactions. | Status colours are consistent and legible. | [ ] | |
| 18.4 | Empty state | With no activity, open the screen. | Friendly empty-state is shown. | [ ] | |

> **Known gap — confirm with team:** top-up, payment method picker and driver payout flows are not yet exposed in the mobile UI and should be treated as out of scope for this round.

---

## 19. Maps & Location (cross-cutting)

| # | Test case | Steps | Expected result | Status | Notes |
|---|---|---|---|---|---|
| 19.1 | Location picker — search | Open any location picker (ride request, post ride). | Typing shows Google Places suggestions. | [ ] | |
| 19.2 | Location picker — use current location | Tap "Use my location". | Current location is used as the value. | [ ] | |
| 19.3 | Permission denied | Revoke location permission in phone settings, re-open the app. | App prompts / informs you that location is required; no crash. | [ ] | |
| 19.4 | Live tracking accuracy | During an active ride, watch the live position. | Position updates reasonably (not frozen) on both driver and passenger screens. | [ ] | |

---

## 20. Deep Linking

| # | Test case | Steps | Expected result | Status | Notes |
|---|---|---|---|---|---|
| 20.1 | Open a ride link | Tap a `yourdrive://ride/...` link sent from another app (e.g. WhatsApp). | App opens directly to that ride. | [ ] | |
| 20.2 | Open a chat link | Tap a `yourdrive://chat/...` link. | App opens directly to that chat thread. | [ ] | |
| 20.3 | Open while logged out | Tap a deep link while not logged in. | App asks you to log in first, then routes to the intended screen. | [ ] | |

---

## 21. Language (i18n)

| # | Test case | Steps | Expected result | Status | Notes |
|---|---|---|---|---|---|
| 21.1 | All core labels translated (RW) | Switch to Kinyarwanda; walk through signup, home, post ride, chat, profile. | No English leakage on main screens. | [ ] | |
| 21.2 | All core labels translated (EN) | Switch back to English. | All labels are in English. | [ ] | |
| 21.3 | Currency format | Check any price in the app (rides, rentals, wallet). | Amount is shown in RWF with clean formatting (e.g. `RWF 2,500`). | [ ] | |

---

## 22. Error Handling & Recovery

| # | Test case | Steps | Expected result | Status | Notes |
|---|---|---|---|---|---|
| 22.1 | Server error | Trigger a known failure (e.g. post ride with backend down). | Clear error message; no raw technical output; no crash. | [ ] | |
| 22.2 | Slow network | Throttle network to 3G; load any list. | Loading indicator shown; screen eventually loads or shows a clear error. | [ ] | |
| 22.3 | Force-close during action | Close the app mid-action (e.g. while posting a ride). | Reopening the app returns you to a sensible screen with no corrupted data. | [ ] | |
| 22.4 | Global error boundary | Trigger any unexpected error. | A friendly fallback screen appears instead of a white screen or crash. | [ ] | |

---

## 23. Known Gaps — Do Not Test

The following features are **not yet implemented** in this build and should be skipped:

- Social login (Google / Apple)
- Profile photo change (button shows "Coming Soon")
- Notification preference settings
- Delete account
- Wallet top-up, payment method picker, driver payout
- In-chat media / file sharing
- Dedicated T&Cs / Help / Support screens
- Promos and discount codes

---

## 24. Sign-off

| Role | Name | Signature | Date |
|---|---|---|---|
| Client tester | | | |
| Project lead | | | |

**Overall verdict:** `ACCEPTED`  /  `ACCEPTED WITH NOTES`  /  `REJECTED — FIXES REQUIRED`
