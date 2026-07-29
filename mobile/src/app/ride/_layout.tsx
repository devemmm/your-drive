import React from "react";
import { Stack } from "expo-router";

export default function RideLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="search-results" />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
