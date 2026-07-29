import React from "react";
import { Stack } from "expo-router";

export default function RideIdLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="active" />
      <Stack.Screen name="manifest" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}
