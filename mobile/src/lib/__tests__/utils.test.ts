import { getVehicleImageUrl } from "../utils";
import { Asset } from "../types";

const asset = (url: string): Asset => ({ id: 1, url });

describe("getVehicleImageUrl", () => {
  it("prefers the default image url", () => {
    expect(
      getVehicleImageUrl({
        defaultImage: asset("https://cdn.example.com/default.jpg"),
        files: [asset("https://cdn.example.com/first.jpg")],
      })
    ).toBe("https://cdn.example.com/default.jpg");
  });

  it("falls back to the first file url", () => {
    expect(
      getVehicleImageUrl({
        defaultImage: null,
        files: [asset("https://cdn.example.com/first.jpg")],
      })
    ).toBe("https://cdn.example.com/first.jpg");
  });

  it("returns null when there are no images", () => {
    expect(getVehicleImageUrl({ defaultImage: null, files: [] })).toBeNull();
  });

  it("rejects non-http urls", () => {
    expect(
      getVehicleImageUrl({ defaultImage: asset("file:///local.jpg"), files: [] })
    ).toBeNull();
  });
});
