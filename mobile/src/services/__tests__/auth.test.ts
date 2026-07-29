import AsyncStorage from "@react-native-async-storage/async-storage";
import { authStorage } from "../auth";
import { STORAGE_KEYS } from "@/lib/constants";

describe("authStorage.hasSeenWelcome", () => {
  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockReset();
    (AsyncStorage.setItem as jest.Mock).mockReset();
  });

  it("returns false when no value is stored", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    expect(await authStorage.hasSeenWelcome()).toBe(false);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(
      STORAGE_KEYS.HAS_SEEN_WELCOME,
    );
  });

  it("returns false when stored value is unparseable / unexpected", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("not-a-boolean");
    expect(await authStorage.hasSeenWelcome()).toBe(false);
  });

  it("returns true after setHasSeenWelcome(true) persists 'true'", async () => {
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    await authStorage.setHasSeenWelcome(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.HAS_SEEN_WELCOME,
      "true",
    );

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("true");
    expect(await authStorage.hasSeenWelcome()).toBe(true);
  });

  it("persists 'false' when setHasSeenWelcome(false)", async () => {
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    await authStorage.setHasSeenWelcome(false);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.HAS_SEEN_WELCOME,
      "false",
    );

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("false");
    expect(await authStorage.hasSeenWelcome()).toBe(false);
  });

  it("returns false on AsyncStorage read failure", async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error("boom"));
    expect(await authStorage.hasSeenWelcome()).toBe(false);
  });
});
