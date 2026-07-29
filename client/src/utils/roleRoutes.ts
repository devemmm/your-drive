/**
 * Maps a user's role to their "home" dashboard route.
 *
 * Single source of truth for role-based landing, mirrored by the post-login
 * redirect in `AuthProvider.login`. Used by nav components so the "Dashboard"
 * link takes a bus operator to the operator dashboard rather than the passenger
 * dashboard.
 */
export function dashboardPathForRole(role?: string | null): string {
  const normalized = String(role ?? "").toUpperCase();
  if (normalized === "ADMIN") return "/admin";
  if (normalized === "BUS_OPERATOR") return "/operator";
  return "/dashboard";
}
