import * as ImagePicker from "expo-image-picker";
import { Alert, Platform } from "react-native";

export interface PickedImage {
  uri: string;
  fileName: string;
  mimeType: string;
}

interface PickOptions {
  fallbackName?: string;
  quality?: number;
}

/**
 * Present a two-choice prompt (Camera or Gallery), request the matching
 * permission, and return a normalized PickedImage. Returns null if the user
 * cancels at any step.
 */
export async function pickImageFromSource(opts: PickOptions = {}): Promise<PickedImage | null> {
  const source = await chooseSource();
  if (!source) return null;

  if (source === "camera") {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow camera access to take a photo.");
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: opts.quality ?? 0.8,
      allowsEditing: false,
    });
    return normalizeResult(result, opts.fallbackName ?? "photo");
  }

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Permission required", "Please allow access to your photo library.");
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: opts.quality ?? 0.8,
    allowsMultipleSelection: false,
  });
  return normalizeResult(result, opts.fallbackName ?? "photo");
}

function chooseSource(): Promise<"camera" | "gallery" | null> {
  return new Promise((resolve) => {
    Alert.alert(
      "Add a photo",
      undefined,
      [
        { text: "Take Photo", onPress: () => resolve("camera") },
        { text: Platform.OS === "ios" ? "Choose from Library" : "Choose from Gallery", onPress: () => resolve("gallery") },
        { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
}

function normalizeResult(
  result: ImagePicker.ImagePickerResult,
  fallbackName: string
): PickedImage | null {
  if (result.canceled || !result.assets?.[0]) return null;
  const a = result.assets[0];
  return {
    uri: a.uri,
    fileName: a.fileName || `${fallbackName}-${Date.now()}.jpg`,
    mimeType: a.mimeType || "image/jpeg",
  };
}
