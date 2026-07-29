# InDrive-Style Home Screen Redesign

## Overview

Redesign the mobile app home screen from a scrollable list layout to an InDrive-style map-first experience with a swipeable bottom sheet. The home screen becomes focused purely on rides (Request / Find), while Rental and Chauffeur services remain in their own tabs.

## Design Decisions

- **Map-first**: Full-screen map background showing nearby drivers with vehicle-type icons
- **Bottom sheet**: Collapsed shows vehicle type tabs + search bar; expanded adds destination, mode toggle, contextual fields, and recent destinations
- **Merged ride flow**: "Request a Ride" (on-demand, name-your-price) and "Find a Ride" (search existing scheduled rides) are unified behind a single destination entry, then split via a segmented toggle
- **Hamburger menu**: Secondary features (Upcoming Rides, Settings/Profile) accessible from top-left menu
- **Rental & Chauffeur**: Removed from home screen entirely — they live in their own bottom tabs

## Color Palette (from design variables)

| Token | Value | Usage |
|---|---|---|
| `$primary` | #1A6373 | Active tab borders, selected states, toggle active bg |
| `$primary-light` | #E6F0F2 | Active vehicle tab background |
| `$primary-darker` | #0A282E | Text headings, dark text |
| `$secondary` | #4CAF50 | Action buttons (Request Ride, Search Rides) |
| `$bg-white` | #FFFFFF | Bottom sheet background |
| `$bg-gray` | #F8FAFB | Input fields, inactive tabs background |
| `$border` | #E5E7EB | Input field borders, dividers |
| `$text-dark` | #0A282E | Primary text |
| `$text-muted` | #666666 | Secondary/placeholder text |
| `$error` | #EF4444 | Destination dot indicator |
| `$warning` | #F59E0B | Warning states |
| `$accent` | #30BFDD | Location dot on map |

## Screen Structure

### Map Layer (background, full screen)

- Dark-themed map (uses device/map provider dark mode)
- Driver icons rendered at real GPS positions — car icon for CAR, motorcycle icon for MOTORBIKE
- User's current location shown as a blue pulsing dot (`$accent`)
- Auto-detected pickup location displayed as a floating bubble above the dot:
  - Dark semi-transparent background with rounded corners
  - "Pickup point" label (small, muted) + street name (white, bold)
  - Chevron to tap and edit pickup location

### Top Controls (over map)

- **Hamburger menu** (top-left): 40px circle, white bg with shadow. Opens side drawer with:
  - Upcoming Rides
  - Settings
  - Profile
- **GPS re-center button** (right, above bottom sheet): 40px circle, white bg with shadow. Tap to re-center map on current location.

### Bottom Sheet — Collapsed State (default)

White background (`$bg-white`), rounded top corners (20px radius), subtle top shadow.

Contents (top to bottom):
1. **Drag handle**: 40px wide, 4px tall, `$border` color, centered
2. **Vehicle type tabs** (horizontal row, equal width):
   - **Car** (selected by default): `$primary-light` background, `$primary` border (1.5px), car icon + "Car" label in `$primary`
   - **Moto**: `$bg-gray` background, no border, moto icon + "Moto" label in `$text-muted`
   - **Bus** (disabled): Same as Moto but 40% opacity, shows "Coming soon" alert on tap
3. **Search bar**: `$bg-gray` background, `$border` border, 14px rounded. Search icon + "Where to & for how much?" placeholder in `$text-muted`

### Bottom Sheet — Expanded State (swipe up or tap search bar)

Sheet expands to cover ~85% of screen. Same white background. Scrollable content:

1. **Drag handle** (same as collapsed)
2. **Vehicle type tabs** (same as collapsed, persist at top)
3. **Destination input field**: `$bg-gray` background, `$border` border, rounded. Red dot (`$error`) + destination text or placeholder. Clear (X) button when filled.
4. **Mode toggle** (segmented control):
   - Container: `$bg-gray` background, rounded
   - **Request a Ride** (default): `$primary` background when active, white text. Hand icon.
   - **Find a Ride**: Transparent when inactive, `$text-muted` text. Search icon.
5. **Contextual fields** (change based on selected mode):

   **Request a Ride mode:**
   - Fare input: `$bg-gray` field, dollar icon, "Your offer (e.g. 2500)" placeholder
   - Passenger stepper: `$bg-gray` field, users icon, count, −/+ buttons

   **Find a Ride mode:**
   - Date picker: `$bg-gray` field, calendar icon, shows "Today" or selected date
   - Passenger stepper: Same as Request mode

6. **Recent destinations** (section):
   - "Recent" label (uppercase, small, `$text-muted`)
   - List of recent destinations, each with: clock icon in circular `$bg-gray` bg + location name (bold, `$text-dark`) + area subtitle (`$text-muted`)
   - Tapping a recent destination fills the destination field

7. **Action button** (full width):
   - `$secondary` (#4CAF50) background, white bold text, 14px rounded
   - **Request mode**: "Request Ride"
   - **Find mode**: "Search Rides"

## Interaction Flow

1. User opens app → sees map with nearby drivers and collapsed bottom sheet
2. Pickup location auto-detected from GPS, shown on map
3. User selects vehicle type (Car/Moto/Bus) from tabs
4. User taps search bar or swipes sheet up → sheet expands
5. User enters destination (typed or selected from recent)
6. User picks mode: "Request a Ride" or "Find a Ride"
7. User fills contextual fields (fare/date + passengers)
8. User taps action button → navigates to ride request confirmation or search results

## Navigation Change: Bottom Tabs → Hamburger Side Menu

The bottom tab bar is **removed entirely**. All navigation moves to the hamburger side menu (drawer), which becomes the primary navigation pattern.

### Hamburger Menu Items

- Rides (upcoming & history)
- Rent a Car
- Hire a Chauffeur
- Chat
- Profile
- Settings
- Help / Support

## What Changes from Current Home Screen

| Current | New |
|---|---|
| Scrollable page with greeting header | Map-first with bottom sheet overlay |
| SearchCard with origin + destination | Destination only (pickup from GPS) |
| Mode toggle inside SearchCard | Mode toggle inside expanded bottom sheet |
| "Rent a Car" / "Hire a Driver" service cards | Removed — these live in their own tabs |
| Upcoming Rides section | Moved to hamburger menu link |
| Greeting + avatar in header | Removed (avatar accessible via hamburger → profile) |
| Bottom tab bar (5 tabs) | Removed — replaced by hamburger side menu drawer |

## Pencil Design Updates

Update frame "4 - Home" (`cevtb`) to reflect:
- Dark map background fill with street line indicators
- Driver car icons scattered on map
- Pickup location bubble overlay
- Hamburger menu button (top-left)
- GPS button (right side, above sheet)
- Bottom sheet with white bg, vehicle tabs, search bar
- Design both collapsed and expanded states as separate frames

## Out of Scope

- Actual map integration (react-native-maps) — that's implementation, not design
- Real-time driver position streaming
- Recent destinations storage/API — will use local storage
- Side drawer/hamburger menu full design — just the trigger button for now
