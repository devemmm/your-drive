import React from "react";
import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="passenger" />
      <Stack.Screen name="verify-phone" />
      <Stack.Screen name="driver" />
    </Stack>
  );
}
