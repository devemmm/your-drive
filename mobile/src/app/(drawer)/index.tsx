import React from "react";
import { useMode } from "@/providers/ModeProvider";
import { PassengerHome } from "./_components/PassengerHome";
import { DriverHome } from "./_components/DriverHome";

export default function HomeRoute() {
  const { isDriverMode } = useMode();
  return isDriverMode ? <DriverHome /> : <PassengerHome />;
}
