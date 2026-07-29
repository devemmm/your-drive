import React from "react";
import { View, Text, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";

export function TicketQr({ attendanceCode }: { attendanceCode: string }) {
  return (
    <View style={styles.wrap}>
      <QRCode value={attendanceCode} size={180} />
      <Text style={styles.code}>{attendanceCode}</Text>
      <Text style={styles.hint}>Show this to the conductor on boarding.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", padding: 16, gap: 8 },
  code: { fontFamily: "monospace", fontSize: 18, letterSpacing: 2 },
  hint: { fontSize: 12, color: "#666", textAlign: "center" },
});
