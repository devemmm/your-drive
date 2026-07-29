import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from "react-native";
import { ChevronRight } from "lucide-react-native";
import { VehiclePill, type IconKey } from "@/components/ui/VehiclePill";
import { useTheme } from "@/providers/ThemeProvider";
import { spacing, ColorPalette } from "@/lib/theme";

export type VehicleType = "CAR" | "MOTORBIKE" | "BUS";

interface VehicleOption {
  type: VehicleType;
  label: string;
  iconKey: IconKey;
}

const VEHICLE_OPTIONS: VehicleOption[] = [
  { type: "CAR", label: "Car", iconKey: "car" },
  { type: "MOTORBIKE", label: "Moto", iconKey: "bike" },
  { type: "BUS", label: "Bus", iconKey: "bus" },
];

// How close (in px) the viewport must be to the content's trailing edge
// before we consider the user "at the end" and hide the overflow cue.
const NEAR_END_THRESHOLD = 16;

interface HomeServiceRowProps {
  vehicleType: VehicleType;
  onSelectVehicle: (type: VehicleType) => void;
  onOpenRental: () => void;
  onOpenChauffeur: () => void;
}

export function HomeServiceRow({
  vehicleType,
  onSelectVehicle,
  onOpenRental,
  onOpenChauffeur,
}: HomeServiceRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const scrollRef = useRef<ScrollView>(null);

  const [layoutWidth, setLayoutWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [nearEnd, setNearEnd] = useState(false);

  const overflowing = contentWidth > layoutWidth;
  const showCue = overflowing && !nearEnd;

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setLayoutWidth(e.nativeEvent.layout.width);
  }, []);

  const handleContentSizeChange = useCallback((width: number) => {
    setContentWidth(width);
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromEnd = contentSize.width - layoutMeasurement.width - contentOffset.x;
    setNearEnd(distanceFromEnd <= NEAR_END_THRESHOLD);
  }, []);

  const handleCuePress = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, []);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        testID="home.serviceRow.scroll"
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        onLayout={handleLayout}
        onContentSizeChange={handleContentSizeChange}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {VEHICLE_OPTIONS.map((opt) => (
          <VehiclePill
            key={opt.type}
            testID={`home.vehicleTab.${opt.type}`}
            icon={opt.iconKey}
            label={opt.label}
            selected={vehicleType === opt.type}
            style={styles.pill}
            onPress={() => onSelectVehicle(opt.type)}
          />
        ))}

        <View style={styles.divider} />

        <VehiclePill
          testID="home.serviceTab.RENTAL"
          icon="key"
          label="Rent"
          style={styles.pill}
          onPress={onOpenRental}
        />
        <VehiclePill
          testID="home.serviceTab.CHAUFFEUR"
          icon="userCheck"
          label="Driver"
          style={styles.pill}
          onPress={onOpenChauffeur}
        />
      </ScrollView>

      {showCue ? (
        <TouchableOpacity
          testID="home.serviceScrollCue"
          style={styles.cue}
          onPress={handleCuePress}
          activeOpacity={0.8}
        >
          <ChevronRight size={20} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    wrapper: { position: "relative" },
    content: { flexGrow: 1, gap: spacing.sm },
    pill: { flex: 1 },
    divider: {
      width: 1,
      alignSelf: "stretch",
      marginVertical: 6,
      backgroundColor: colors.border,
    },
    cue: {
      position: "absolute",
      right: 4,
      top: "50%",
      marginTop: -17,
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(45,52,54,0.8)",
    },
  });
