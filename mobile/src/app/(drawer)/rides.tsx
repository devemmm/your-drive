import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ticket, Car, ArrowRight, Briefcase } from "lucide-react-native";
import { useMyBookings } from "@/hooks/useBookings";
import { useMyRides } from "@/hooks/useRides";
import { useMyChauffeurServices } from "@/hooks/useChauffeur";
import { Card } from "@/components/ui/Card";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useTheme } from "@/providers/ThemeProvider";
import { useMode } from "@/providers/ModeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";
import { Booking, Ride, BookingStatus, ChauffeurService, ChauffeurStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const getStatusColors = (colors: ColorPalette): Record<BookingStatus, string> => ({
  APPROVED: colors.success,
  PENDING: colors.warning,
  DECLINED: colors.error,
  CANCELLED: colors.error,
  COMPLETED: colors.text.secondary,
  EXPIRED: colors.text.tertiary,
  DISPUTED: colors.warning,
});

const getRideStatusColors = (colors: ColorPalette): Record<string, string> => ({
  PUBLISHED: colors.success,
  DRAFT: colors.text.tertiary,
  ONGOING: colors.primary,
  COMPLETED: colors.text.secondary,
  CANCELLED: colors.error,
  EXPIRED: colors.text.secondary,
  BLOCKED: colors.error,
});

const getChauffeurStatusColors = (colors: ColorPalette): Record<ChauffeurStatus, string> => ({
  REQUESTED: colors.warning,
  ACCEPTED: colors.success,
  ACTIVE: colors.primary,
  COMPLETED: colors.text.secondary,
  DECLINED: colors.error,
  CANCELLED: colors.error,
  DISPUTED: colors.warning,
});

function ChauffeurServiceCard({
  service,
  viewerRole,
  onPress,
}: {
  service: ChauffeurService;
  viewerRole: "driver" | "passenger";
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const statusColor = getChauffeurStatusColors(colors)[service.status] ?? colors.text.secondary;
  const otherParty = viewerRole === "driver" ? service.passenger : service.driver;
  const otherName = `${otherParty?.firstName ?? ""} ${otherParty?.lastName ?? ""}`.trim() || "—";
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card style={s.card}>
        <View style={s.cardRow}>
          <View style={s.routeInfo}>
            <Briefcase size={14} color={colors.text.secondary} />
            <Text style={s.routeText} numberOfLines={1}>
              {viewerRole === "driver" ? "Passenger: " : "Driver: "}
              {otherName}
            </Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: statusColor + "20" }]}>
            <Text style={[s.statusText, { color: statusColor }]}>{service.status}</Text>
          </View>
        </View>
        <View style={s.cardFooter}>
          <Text style={s.metaText}>
            {new Date(service.startDate).toLocaleDateString()} ·{" "}
            {service.serviceType === "HOURLY" ? "Hourly" : "Daily"}
          </Text>
          <Text style={s.priceText}>{formatCurrency(Math.round(parseFloat(service.totalAmount) * 100))}</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

function BookingCard({ booking, onPress }: { booking: Booking; onPress: () => void }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const statusColor = getStatusColors(colors)[booking.status] ?? colors.text.secondary;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card style={s.card}>
        <View style={s.cardRow}>
          <View style={s.routeInfo}>
            <Text style={s.routeText} numberOfLines={1}>
              {booking.ride?.departureLocation?.locationName ?? "Origin"}
            </Text>
            <ArrowRight size={14} color={colors.text.secondary} />
            <Text style={s.routeText} numberOfLines={1}>
              {booking.ride?.destinationLocation?.locationName ?? "Destination"}
            </Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: statusColor + "20" }]}>
            <Text style={[s.statusText, { color: statusColor }]}>{booking.status}</Text>
          </View>
        </View>
        <View style={s.cardFooter}>
          <Text style={s.metaText}>
            {booking.ride?.departureTime
              ? new Date(booking.ride.departureTime).toLocaleDateString()
              : "—"}
          </Text>
          <Text style={s.priceText}>RWF {booking.totalAmount?.toLocaleString()}</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

function RideCard({ ride, onPress, testID }: { ride: Ride; onPress: () => void; testID?: string }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const statusColor = getRideStatusColors(colors)[ride.status] ?? colors.text.secondary;
  return (
    <TouchableOpacity testID={testID} onPress={onPress} activeOpacity={0.8}>
      <Card style={s.card}>
        <View style={s.cardRow}>
          <View style={s.routeInfo}>
            <Text style={s.routeText} numberOfLines={1}>{ride.departureLocation?.locationName ?? "Origin"}</Text>
            <ArrowRight size={14} color={colors.text.secondary} />
            <Text style={s.routeText} numberOfLines={1}>{ride.destinationLocation?.locationName ?? "Destination"}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: statusColor + "20" }]}>
            <Text style={[s.statusText, { color: statusColor }]}>{ride.status}</Text>
          </View>
        </View>
        <View style={s.cardFooter}>
          <Text style={s.metaText}>
            {ride.departureTime ? new Date(ride.departureTime).toLocaleDateString() : "—"}
          </Text>
          <Text style={s.metaText}>{ride.availableSeats} seats available</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

function SectionHeader({ label }: { label: string }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return <Text style={s.sectionHeader}>{label}</Text>;
}

function PassengerView() {
  const router = useRouter();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { data: bookingsData, isLoading: bookingsLoading } = useMyBookings();
  const { data: servicesData, isLoading: servicesLoading } =
    useMyChauffeurServices({ role: "passenger" });
  const bookings = bookingsData?.data ?? [];
  const services = servicesData?.data ?? [];

  if (bookingsLoading || servicesLoading) return <LoadingIndicator fullScreen />;

  if (bookings.length === 0 && services.length === 0) {
    return (
      <EmptyState
        icon={<Ticket size={48} color={colors.text.tertiary} />}
        title="Nothing booked yet"
        subtitle="Your ride bookings and chauffeur services will appear here"
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={s.list}>
      {bookings.length > 0 && (
        <>
          <SectionHeader label="Ride Bookings" />
          {bookings.map((b) => (
            <BookingCard
              key={`b-${b.id}`}
              booking={b}
              onPress={() => router.push(`/ride/${b.rideId}` as any)}
            />
          ))}
        </>
      )}
      {services.length > 0 && (
        <>
          <SectionHeader label="Chauffeur Services" />
          {services.map((svc) => (
            <ChauffeurServiceCard
              key={`c-${svc.id}`}
              service={svc}
              viewerRole="passenger"
              onPress={() => router.push(`/chauffeur/service/${svc.id}` as any)}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
}

function DriverView() {
  const router = useRouter();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { data: ridesData, isLoading: ridesLoading } = useMyRides();
  const { data: servicesData, isLoading: servicesLoading } =
    useMyChauffeurServices({ role: "driver" });
  const rides = ridesData?.data ?? [];
  const services = servicesData?.data ?? [];

  if (ridesLoading || servicesLoading) return <LoadingIndicator fullScreen />;

  if (rides.length === 0 && services.length === 0) {
    return (
      <EmptyState
        icon={<Car size={48} color={colors.text.tertiary} />}
        title="No driving work yet"
        subtitle="Rides you post and chauffeur requests you accept will appear here"
      />
    );
  }

  return (
    <ScrollView testID="myRides.list" contentContainerStyle={s.list}>
      {rides.length > 0 && (
        <>
          <SectionHeader label="My Rides" />
          {rides.map((r) => (
            <RideCard
              key={`r-${r.id}`}
              ride={r}
              testID={`myRides.row.${r.id}`}
              onPress={() => router.push(`/ride/${r.id}` as any)}
            />
          ))}
        </>
      )}
      {services.length > 0 && (
        <>
          <SectionHeader label="Chauffeur Services" />
          {services.map((svc) => (
            <ChauffeurServiceCard
              key={`c-${svc.id}`}
              service={svc}
              viewerRole="driver"
              onPress={() => router.push(`/chauffeur/service/${svc.id}` as any)}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
}

export default function RidesScreen() {
  const { isDriverMode } = useMode();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={s.container} edges={["top", "left", "right"]}>
      <ScreenHeader title="My Rides" variant="root" />
      <View style={s.content}>
        {isDriverMode ? <DriverView /> : <PassengerView />}
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  list: { padding: spacing.xl, gap: spacing.md },
  sectionHeader: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: -spacing.xs,
  },
  card: { gap: spacing.sm },
  cardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  routeInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.xs },
  routeText: { flex: 1, fontSize: fontSize.sm, fontWeight: "600", color: colors.text.primary },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  statusText: { fontSize: fontSize.xs, fontWeight: "700" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  metaText: { fontSize: fontSize.xs, color: colors.text.secondary },
  priceText: { fontSize: fontSize.sm, fontWeight: "700", color: colors.primary },
});
