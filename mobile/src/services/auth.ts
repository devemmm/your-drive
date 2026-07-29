import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@/lib/constants";

let cachedToken: string | null = null;

export const authStorage = {
  async getToken(): Promise<string | null> {
    if (cachedToken !== null) return cachedToken;
    cachedToken = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
    return cachedToken;
  },
  async setToken(token: string): Promise<void> {
    cachedToken = token;
    await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token);
  },
  async removeToken(): Promise<void> {
    cachedToken = null;
    await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
  },
  getCachedToken(): string | null {
    return cachedToken;
  },

  async hasSeenWelcome(): Promise<boolean> {
    try {
      const v = await AsyncStorage.getItem(STORAGE_KEYS.HAS_SEEN_WELCOME);
      return v === "true";
    } catch {
      return false;
    }
  },
  async setHasSeenWelcome(value: boolean): Promise<void> {
    await AsyncStorage.setItem(
      STORAGE_KEYS.HAS_SEEN_WELCOME,
      value ? "true" : "false",
    );
  },
};
