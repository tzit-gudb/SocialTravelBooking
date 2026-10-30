import React from "react";
import { StyleSheet, View } from "react-native";
import AppText from "../../../components/common/AppText";
import { colors, spacing, radius } from "../../../theme/tokens";

/**
 * Component hiển thị số dư Ví du lịch & định danh MXH của Du khách
 */
export default function TouristSummaryCards({ wallet, socialProfile }) {
  const balance = Number(wallet?.balance || 0).toLocaleString("vi-VN");
  const currency = wallet?.currency || "VND";
  const username = socialProfile?.username || "traveler";

  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryBox}>
        <AppText variant="caption" style={styles.summaryLabel}>
          Ví du lịch
        </AppText>
        <AppText variant="h3" style={styles.walletValue}>
          {balance} {currency}
        </AppText>
      </View>

      <View style={styles.summaryBox}>
        <AppText variant="caption" style={styles.summaryLabel}>
          Tài khoản MXH
        </AppText>
        <AppText variant="h3" style={styles.usernameValue}>
          @{username}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.base,
    gap: 4,
  },
  summaryLabel: {
    color: colors.inkSubtle,
  },
  walletValue: {
    color: colors.statusSuccess,
    fontWeight: "700",
  },
  usernameValue: {
    color: colors.inkPrimary,
    fontWeight: "700",
  },
});
