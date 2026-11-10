import React from "react";
import { StyleSheet, View, TextInput, Pressable } from "react-native";
import AppText from "../../../components/common/AppText";
import { colors, fonts, spacing, radius, touchTarget } from "../../../theme/tokens";

/**
 * Component trạm quét và kiểm tra mã QR Check-in dành cho Nhà cung cấp
 */
export default function ProviderQrScannerBox({ qrInput, setQrInput, scanResult, onVerifyQr }) {
  return (
    <View style={styles.scannerCard}>
      <AppText variant="h3">Quét & Xác thực Mã QR Check-in</AppText>
      <AppText variant="bodySmall" style={styles.subtleText}>
        Chỉ Nhà cung cấp sở hữu dịch vụ mới có quyền xác nhận mã QR của khách để chuyển đơn sang
        trạng thái Đang phục vụ (ongoing).
      </AppText>

      <TextInput
        value={qrInput}
        onChangeText={setQrInput}
        placeholder="Nhập hoặc quét qr_checkin_token..."
        placeholderTextColor={colors.inkSubtle}
        style={styles.input}
      />

      <Pressable
        onPress={onVerifyQr}
        style={({ pressed }) => [styles.verifyBtn, pressed && styles.verifyBtnPressed]}
      >
        <AppText variant="label" style={styles.verifyBtnText}>
          Xác nhận khách Check-in
        </AppText>
      </Pressable>

      {Boolean(scanResult) && (
        <View style={styles.resultBanner}>
          <AppText variant="caption" style={styles.resultBannerText}>
            {scanResult}
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scannerCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.lg,
    gap: spacing.md,
  },
  subtleText: {
    color: colors.inkSubtle,
    lineHeight: 20,
  },
  input: {
    minHeight: touchTarget.minHeight,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceBase,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.inkPrimary,
  },
  verifyBtn: {
    minHeight: touchTarget.minHeight,
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyBtnPressed: {
    backgroundColor: colors.brandHover,
  },
  verifyBtnText: {
    color: colors.inkInverse,
    fontWeight: "700",
  },
  resultBanner: {
    backgroundColor: colors.statusSuccessBg,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  resultBannerText: {
    color: colors.statusSuccess,
    fontWeight: "600",
  },
});
