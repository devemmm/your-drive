import React from "react";
import { UserCheck } from "lucide-react-native";
import { useAvailableDrivers } from "@/hooks/useChauffeur";
import { ChauffeurCard } from "@/components/ChauffeurCard";
import { BrowseScreen } from "@/components/BrowseScreen";
import { useTheme } from "@/providers/ThemeProvider";

export default function ChauffeurBrowseScreen() {
  const { colors } = useTheme();
  const { data, isLoading } = useAvailableDrivers();
  return (
    <BrowseScreen
      title="Hire a Driver"
      data={data?.data}
      isLoading={isLoading}
      renderItem={(driver) => <ChauffeurCard driver={driver} />}
      keyExtractor={(d) => d.id}
      emptyIcon={<UserCheck size={48} color={colors.text.tertiary} />}
      emptyTitle="No drivers available"
      emptySubtitle="Check back later for chauffeur services"
    />
  );
}
