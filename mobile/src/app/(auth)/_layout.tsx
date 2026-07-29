import React from "react";
import { Redirect, Stack } from "expo-router";
import { useAuthContext } from "@/providers/AuthProvider";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuthContext();
  if (isLoading) return <LoadingIndicator fullScreen />;
  if (isAuthenticated) return <Redirect href="/(drawer)" />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
