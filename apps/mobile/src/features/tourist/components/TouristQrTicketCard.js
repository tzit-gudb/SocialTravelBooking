import React from "react";
import { StyleSheet, View } from "react-native";
import AppText from "../../../components/common/AppText";
import { colors, spacing, radius } from "../../../theme/tokens";

/**
 * Component hiển thị thẻ vé điện tử QR Check-in bảo mật của Du khách
 */
export default function TouristQrTicketCard({
  bookingCode = "STB-20261019-8492",
  tourTitle = "Tour Lặn Ngắm San Hô Bán Đảo Sơn Trà",
  scheduleTime = "20/10/2026 · 08:00 SA · Bến du thuyền Sơn Trà",
  qrToken = "QR-TOKEN-8492-SONTRA-VERIFIED",
  paymentStatus = "Đã thanh toán",
}) {
  return (
    <View style={styles.ticketCard}>
      <View style={styles.ticketHeader}>
        <AppText variant="label" style={styles.ticketCode}>
          Mã đơn: {bookingCode}
        </AppText>
        <View style={styles.paidBadge}>
          <AppText variant="caption" style={styles.paidBadgeText}>
            {paymentStatus}
          </AppText>
        </View>
      </View>

      <AppText variant="h3" style={styles.ticketTitle}>
        {tourTitle}
      </AppText>
      <AppText variant="bodySmall" style={styles.ticketMeta}>
        Khởi hành: {scheduleTime}
      </AppText>

      <View style={styles.qrTokenBox}>
        <AppText variant="caption" style={styles.qrLabel}>
          Mã QR Check-in bảo mật:
        </AppText>
        <AppText variant="label" style={styles.qrTokenValue}>
          {qrToken}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ticketCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  ticketHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ticketCode: {
    color: colors.inkSubtle,
  },
  paidBadge: {
    backgroundColor: colors.statusSuccessBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  paidBadgeText: {
    color: colors.statusSuccess,
    fontWeight: "700",
  },
  ticketTitle: {
    color: colors.inkPrimary,
  },
  ticketMeta: {
    color: colors.inkBody,
  },
  qrTokenBox: {
    marginTop: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.surfaceBase,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: 2,
  },
  qrLabel: {
    color: colors.inkSubtle,
  },
  qrTokenValue: {
    color: colors.brandHover,
    fontWeight: "700",
  },
});
