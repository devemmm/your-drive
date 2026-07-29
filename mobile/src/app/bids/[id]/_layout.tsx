import React from "react";
import { Stack } from "expo-router";

export default function BidIdLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="waiting" />
    </Stack>
  );
}
