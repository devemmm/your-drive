# Theme consumers to migrate

Generated 2026-05-11 — Task 21.

Total files importing from `@/lib/theme` under `mobile/src`: **64**
- Consumers to migrate to `useTheme()`: **62**
- Theme-invariant (no change needed): **1** (`FilterBar.tsx`, imports only `spacing`)
- Source / provider files (excluded): **1** (`ThemeProvider.tsx`)

## Migrate to useTheme()

Files importing `colors` from `@/lib/theme` that need to swap to `useTheme()` in Task 22:

- [ ] mobile/src/app/(auth)/forgot-password.tsx
- [ ] mobile/src/app/(auth)/login.tsx
- [ ] mobile/src/app/(auth)/register.tsx
- [ ] mobile/src/app/(auth)/terms.tsx
- [ ] mobile/src/app/(auth)/welcome.tsx
- [ ] mobile/src/app/(drawer)/_layout.tsx
- [ ] mobile/src/app/(drawer)/chat.tsx
- [ ] mobile/src/app/(drawer)/index.tsx
- [ ] mobile/src/app/(drawer)/profile.tsx
- [ ] mobile/src/app/(drawer)/rides.tsx
- [ ] mobile/src/app/(drawer)/wallet.tsx
- [ ] mobile/src/app/chat/[threadId].tsx
- [ ] mobile/src/app/chauffeur/[id].tsx
- [ ] mobile/src/app/chauffeur/availability.tsx
- [ ] mobile/src/app/chauffeur/index.tsx
- [ ] mobile/src/app/chauffeur/service/[id].tsx
- [ ] mobile/src/app/notifications/index.tsx
- [ ] mobile/src/app/onboarding/driver.tsx
- [ ] mobile/src/app/onboarding/passenger.tsx
- [ ] mobile/src/app/onboarding/verify-phone.tsx
- [ ] mobile/src/app/post-ride/index.tsx
- [ ] mobile/src/app/profile/edit.tsx
- [ ] mobile/src/app/rental/[id].tsx
- [ ] mobile/src/app/rental/index.tsx
- [ ] mobile/src/app/ride-request/[id].tsx
- [ ] mobile/src/app/ride-request/open.tsx
- [ ] mobile/src/app/ride/[id]/active.tsx
- [ ] mobile/src/app/ride/[id]/complete.tsx
- [ ] mobile/src/app/ride/[id]/index.tsx
- [ ] mobile/src/app/ride/search-results.tsx
- [ ] mobile/src/app/transactions/index.tsx
- [ ] mobile/src/app/vehicle/[id].tsx
- [ ] mobile/src/app/vehicle/add.tsx
- [ ] mobile/src/app/vehicle/index.tsx
- [ ] mobile/src/components/ActiveRideMap.tsx
- [ ] mobile/src/components/BookingSummary.tsx
- [ ] mobile/src/components/BrowseScreen.tsx
- [ ] mobile/src/components/CancelReasonModal.tsx
- [ ] mobile/src/components/ChatInput.tsx
- [ ] mobile/src/components/ChatThreadItem.tsx
- [ ] mobile/src/components/ChauffeurCard.tsx
- [ ] mobile/src/components/DrawerContent.tsx
- [ ] mobile/src/components/ErrorBoundary.tsx
- [ ] mobile/src/components/HomeBottomSheet.tsx
- [ ] mobile/src/components/LocationPicker.tsx
- [ ] mobile/src/components/MapErrorBoundary.tsx
- [ ] mobile/src/components/MessageBubble.tsx
- [ ] mobile/src/components/NetworkBanner.tsx
- [ ] mobile/src/components/NotificationBell.tsx
- [ ] mobile/src/components/RentalCard.tsx
- [ ] mobile/src/components/RideResultCard.tsx
- [ ] mobile/src/components/SearchCard.tsx
- [ ] mobile/src/components/ui/Avatar.tsx
- [ ] mobile/src/components/ui/Badge.tsx
- [ ] mobile/src/components/ui/Button.tsx
- [ ] mobile/src/components/ui/Card.tsx
- [ ] mobile/src/components/ui/Checkbox.tsx
- [ ] mobile/src/components/ui/EmptyState.tsx
- [ ] mobile/src/components/ui/Input.tsx
- [ ] mobile/src/components/ui/LoadingIndicator.tsx
- [ ] mobile/src/components/ui/ScreenHeader.tsx
- [ ] mobile/src/components/ui/StarRating.tsx

## No change needed

Files importing only `spacing` / `fontSize` / `borderRadius` (theme-invariant — leave alone):

- mobile/src/components/FilterBar.tsx (imports `spacing` only)

## Excluded from migration

These files define / consume the theme system itself and are not consumers:

- mobile/src/providers/ThemeProvider.tsx (source of `useTheme`; imports `lightColors`/`darkColors`)
- mobile/src/app/_layout.tsx (Task 21 — already mounts `ThemeProvider` and uses `useTheme`)

## Methodology

Generated via:

```sh
# All files importing from @/lib/theme
grep -rln 'from "@/lib/theme"' mobile/src --include="*.tsx" --include="*.ts"

# Subset importing the `colors` identifier specifically
grep -rln 'import.*\bcolors\b.*from "@/lib/theme"' mobile/src --include="*.tsx" --include="*.ts"
```

Counts above: 64 importers - 62 colors-consumers = 2 non-color importers, of which 1 is the
provider itself (`ThemeProvider.tsx`) and 1 is theme-invariant (`FilterBar.tsx`).

Cross-checked that no files in `mobile/src` outside of `_layout.tsx` and `ThemeProvider.tsx`
already use `useTheme()`, so no files are mid-migration.
