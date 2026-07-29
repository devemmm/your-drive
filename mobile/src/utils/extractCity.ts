export interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

const PRIORITY: string[] = [
  "locality",
  "postal_town",
  "administrative_area_level_2",
  "administrative_area_level_1",
  "administrative_area_level_3",
];

export function extractCity(components: AddressComponent[]): string {
  for (const type of PRIORITY) {
    const match = components.find((c) => c.types.includes(type));
    if (match) return match.long_name;
  }
  return "";
}
