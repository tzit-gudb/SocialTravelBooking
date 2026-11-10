import React from "react";
import { StyleSheet, View } from "react-native";
import AppText from "../../../components/common/AppText";
import { colors, spacing, radius } from "../../../theme/tokens";

/**
 * Component hiển thị các chỉ số nhanh của Nhà cung cấp (Khách chờ check-in & Doanh thu)
 */
export default function ProviderMetricsRow({ pendingCheckins = 12, balance = 45800000 }) {
  const formattedBalance = Number(balance).toLocaleString("vi-VN");

  return (
    <View style={styles.metricsRow}>
      <View style={styles.metricCard}>
        <AppText variant="caption" style={styles.metricLabel}>
          Khách chờ Check-in
        </AppText>
        <AppText variant="h1" style={styles.brandText}>
          {pendingCheckins}
        </AppText>
      </View>

      <View style={styles.metricCard}>
        <AppText variant="caption" style={styles.metricLabel}>
          Số dư khả dụng
        </AppText>
        <AppText variant="h3" style={styles.successText}>
          {formattedBalance} ₫
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  metricsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.base,
    justifyContent: "center",
    gap: 4,
  },
  metricLabel: {
    color: colors.inkSubtle,
  },
  brandText: {
    color: colors.brandPrimary,
    fontWeight: "700",
  },
  successText: {
    color: colors.statusSuccess,
    fontWeight: "700",
  },
});
