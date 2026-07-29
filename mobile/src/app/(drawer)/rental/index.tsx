import React from "react";
import { Car } from "lucide-react-native";
import { useAvailableRentals } from "@/hooks/useRentals";
import { RentalCard } from "@/components/RentalCard";
import { BrowseScreen } from "@/components/BrowseScreen";
import { useTheme } from "@/providers/ThemeProvider";

export default function RentalBrowseScreen() {
  const { colors } = useTheme();
  const { data, isLoading } = useAvailableRentals();
  return (
    <BrowseScreen
      title="Rent a Car"
      data={data?.data}
      isLoading={isLoading}
      renderItem={(vehicle) => <RentalCard vehicle={vehicle} />}
      keyExtractor={(v) => v.id}
      emptyIcon={<Car size={48} color={colors.text.tertiary} />}
      emptyTitle="No vehicles available"
      emptySubtitle="Check back later for rental vehicles"
    />
  );
}
