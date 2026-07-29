// Generates a simple round SVG avatar with centered initials.
// Runs locally (no network call) and guarantees pixel-perfect centering.

const BACKGROUND_PALETTE = [
  "#22C55E", // primary green
  "#0EA5E9", // sky
  "#8B5CF6", // violet
  "#F59E0B", // amber
  "#EF4444", // red
  "#EC4899", // pink
  "#14B8A6", // teal
  "#F97316", // orange
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // 32-bit
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export const generateAvatar = async (name: string): Promise<string> => {
  const initials = getInitials(name);
  const bg = BACKGROUND_PALETTE[hashString(name) % BACKGROUND_PALETTE.length];
  const size = 256;
  const fontSize = Math.round(size * 0.4);

  // Using dominant-baseline="central" on a text element placed at the circle
  // center ensures glyphs are optically centered on every SVG renderer.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${bg}"/>
  <text
    x="50%"
    y="50%"
    text-anchor="middle"
    dominant-baseline="central"
    font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    font-size="${fontSize}"
    font-weight="700"
    fill="#FFFFFF"
  >${initials}</text>
</svg>`;

  return svg;
};
