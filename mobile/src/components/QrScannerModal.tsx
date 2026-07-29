import React, { useState } from "react";
import { Modal, View, StyleSheet, Text, TouchableOpacity, Dimensions } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

// Reticle dimensions: a centered square sized to roughly 70% of the
// screen's shorter edge. Anything inside the clear window is the scan
// target; the surrounding mask is dim so the user understands they
// should aim there.
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const RETICLE_SIZE = Math.min(SCREEN_W, SCREEN_H) * 0.7;

export function QrScannerModal({
  visible, onClose, onScan,
}: { visible: boolean; onClose: () => void; onScan: (code: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        {/* SafeAreaProvider must wrap the modal's content because React
            Native's <Modal> renders in a separate window where the app
            root's provider doesn't reach. Without this, SafeAreaView/
            useSafeAreaInsets return 0 and overlay controls sit under the
            Dynamic Island. */}
        <SafeAreaProvider>
          <SafeAreaView style={styles.permWrap}>
            <Text style={styles.permTitle}>Camera permission required</Text>
            <Text style={styles.permBody}>
              We use the camera to scan passenger boarding QR codes.
            </Text>
            <TouchableOpacity onPress={requestPermission} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Allow camera access</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>Close</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={(e) => {
            if (scanned) return;
            setScanned(true);
            onScan(e.data);
          }}
        />

        {/* Dim mask + clear reticle window. The four strips around the
            reticle are semi-opaque black so the unmasked centre stands
            out as the aiming target. */}
        <View pointerEvents="none" style={styles.maskRow}>
          <View style={styles.maskFill} />
        </View>
        <View pointerEvents="none" style={styles.maskMiddle}>
          <View style={styles.maskFill} />
          <View style={[styles.reticle, { width: RETICLE_SIZE, height: RETICLE_SIZE }]}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.maskFill} />
        </View>
        <View pointerEvents="none" style={styles.maskRow}>
          <View style={styles.maskFill} />
        </View>

        <SafeAreaView style={styles.controls} edges={["top", "bottom", "left", "right"]}>
          <View style={styles.controlsRow}>
            <Text style={styles.hint}>Align the passenger's QR inside the frame</Text>
            <TouchableOpacity
              testID="qrScanner.closeButton"
              onPress={onClose}
              accessibilityLabel="Close scanner"
              accessibilityRole="button"
              style={styles.closeBtn}
            >
              <X size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  cameraWrap: { flex: 1, backgroundColor: "black" },

  // Permission gate styles.
  permWrap: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  permTitle: { fontSize: 18, fontWeight: "700", color: "#111", textAlign: "center" },
  permBody: { fontSize: 14, color: "#555", textAlign: "center", lineHeight: 20 },
  primaryBtn: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: "#111",
  },
  primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  secondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  secondaryBtnText: { color: "#555", fontSize: 14 },

  // Reticle + dim mask.
  maskRow: {
    flex: 1,
    flexDirection: "row",
  },
  maskMiddle: {
    flexDirection: "row",
    height: RETICLE_SIZE,
  },
  maskFill: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  reticle: {
    borderRadius: 16,
    overflow: "visible",
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: "#fff",
  },
  cornerTL: { top: -2, left: -2, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 16 },
  cornerTR: { top: -2, right: -2, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 16 },
  cornerBL: { bottom: -2, left: -2, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 16 },
  cornerBR: { bottom: -2, right: -2, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 16 },

  // Top + bottom controls layer (close button and hint).
  controls: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    justifyContent: "space-between",
  },
  hint: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});
