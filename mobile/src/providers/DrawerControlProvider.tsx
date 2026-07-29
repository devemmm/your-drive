import { useNavigation } from "expo-router";

/**
 * Imperatively open the Drawer from any screen inside `(drawer)/`, including
 * those nested in another navigator (rental/, chauffeur/, post-ride/,
 * ride-requests/, chat/).
 *
 * How: expo-router's `withLayoutContext` automatically sets `id={contextKey}`
 * on every layout's underlying navigator. The Drawer in `(drawer)/_layout.tsx`
 * ends up with `id="/(drawer)"`, so `navigation.getParent("/(drawer)")` from
 * any descendant returns the Drawer's `DrawerNavigationProp` — which has
 * `.openDrawer()` directly. No action dispatch, no walk-up, no chicken-and-egg
 * with `drawerContent`.
 *
 * Called from outside `(drawer)/` (vehicle/, transactions/, etc.) the lookup
 * returns nothing and the call is a safe no-op. ScreenHeader only invokes this
 * when `variant="root"`, which only happens inside `(drawer)/`.
 */
const DRAWER_ID = "/(drawer)";

export function useOpenDrawer(): () => void {
  const navigation = useNavigation();
  return () => {
    const drawerNav = navigation.getParent(DRAWER_ID as any) as any;
    drawerNav?.openDrawer?.();
  };
}
