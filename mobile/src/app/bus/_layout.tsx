import React from "react";
import { Stack } from "expo-router";

export default function BusLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[operatorId]" options={{ headerShown: false }} />
      <Stack.Screen name="route" options={{ headerShown: false }} />
      <Stack.Screen name="trip" options={{ headerShown: false }} />
    </Stack>
  );
}
