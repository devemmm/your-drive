import { extractCity, AddressComponent } from "../extractCity";

const make = (parts: Array<[string, string[]]>): AddressComponent[] =>
  parts.map(([long_name, types]) => ({ long_name, short_name: long_name, types }));

describe("extractCity", () => {
  it("uses locality when present (Kigali Heights → Kigali)", () => {
    const components = make([
      ["Kigali Heights", ["establishment", "point_of_interest"]],
      ["KG 7 Ave", ["route"]],
      ["Kigali", ["locality", "political"]],
      ["Kigali", ["administrative_area_level_1", "political"]],
      ["Rwanda", ["country", "political"]],
    ]);
    expect(extractCity(components)).toBe("Kigali");
  });

  it("uses locality when present (Avondale → Harare)", () => {
    const components = make([
      ["Avondale", ["sublocality", "sublocality_level_1", "political"]],
      ["Harare", ["locality", "political"]],
      ["Harare Province", ["administrative_area_level_1", "political"]],
      ["Zimbabwe", ["country", "political"]],
    ]);
    expect(extractCity(components)).toBe("Harare");
  });

  it("falls back to postal_town when no locality", () => {
    const components = make([
      ["Somewhere", ["postal_town"]],
      ["Region X", ["administrative_area_level_1", "political"]],
    ]);
    expect(extractCity(components)).toBe("Somewhere");
  });

  it("falls back to administrative_area_level_2 (Huye)", () => {
    const components = make([
      ["Huye Bus Park", ["establishment"]],
      ["Huye District", ["administrative_area_level_2", "political"]],
      ["Southern Province", ["administrative_area_level_1", "political"]],
      ["Rwanda", ["country", "political"]],
    ]);
    expect(extractCity(components)).toBe("Huye District");
  });

  it("falls back to administrative_area_level_1 when level_2 is missing", () => {
    const components = make([
      ["Southern Province", ["administrative_area_level_1", "political"]],
      ["Rwanda", ["country", "political"]],
    ]);
    expect(extractCity(components)).toBe("Southern Province");
  });

  it("falls back to administrative_area_level_3 as a last admin step", () => {
    const components = make([
      ["Some Sector", ["administrative_area_level_3", "political"]],
    ]);
    expect(extractCity(components)).toBe("Some Sector");
  });

  it("returns empty string when no usable component exists", () => {
    const components = make([
      ["Bobbins", ["route"]],
      ["12345", ["postal_code"]],
    ]);
    expect(extractCity(components)).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(extractCity([])).toBe("");
  });
});
