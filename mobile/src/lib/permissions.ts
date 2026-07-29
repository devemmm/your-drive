import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Result = "granted" | "denied";
const PUSH_ASKED_KEY = "@yourdrive/perm/pushAsked";
const LOC_ASKED_KEY = "@yourdrive/perm/locAsked";

export async function ensurePushPermission(): Promise<Result> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return "granted";

  const asked = await AsyncStorage.getItem(PUSH_ASKED_KEY);
  if (current.status === "denied" && asked) return "denied";

  const res = await Notifications.requestPermissionsAsync();
  await AsyncStorage.setItem(PUSH_ASKED_KEY, "1");
  return res.status === "granted" ? "granted" : "denied";
}

export async function ensureLocationPermission(): Promise<Result> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.status === "granted") return "granted";

  const asked = await AsyncStorage.getItem(LOC_ASKED_KEY);
  if (current.status === "denied" && asked) return "denied";

  const res = await Location.requestForegroundPermissionsAsync();
  await AsyncStorage.setItem(LOC_ASKED_KEY, "1");
  return res.status === "granted" ? "granted" : "denied";
}
