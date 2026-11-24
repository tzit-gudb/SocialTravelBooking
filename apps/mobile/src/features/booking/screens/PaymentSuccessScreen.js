import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { CheckCircle2, FileText, Home, ShieldCheck } from "lucide-react-native";
import AppText from "../../../components/common/AppText";
import { colors, radius, spacing } from "../../../theme/tokens";
import { formatCurrencyVnd } from "../../explore/models/exploreModel";

/**
 * Màn hình Xác nhận thanh toán thành công (thay thế popup Alert).
 * Footer gồm 2 hành động cân đối: "Quay về trang chủ" và "Chi tiết đặt chỗ".
 */
export default function PaymentSuccessScreen({ navigation, route }) {
  const { bookingId, bookingCode, contactPhone, serviceName, amount } = route?.params || {};

  const handleGoHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "TouristMainTabs" }],
    });
  };

  const handleViewDetail = () => {
    navigation.replace("BookingDetail", {
      bookingId,
      bookingCode,
      contactPhone,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroBox}>
          <View style={styles.iconCircle}>
            <CheckCircle2 size={48} color="#059669" />
          </View>
          <AppText style={styles.title}>Thanh toán thành công!</AppText>
          <AppText style={styles.subtitle}>
            Giao dịch của bạn đã được hệ thống Sepay xác nhận. Đơn đặt chỗ đã sẵn sàng cho chuyến đi
            của bạn.
          </AppText>
        </View>

        <View style={styles.summaryCard}>
          <AppText style={styles.cardHeading}>Thông tin giao dịch</AppText>

          <View style={styles.row}>
            <AppText style={styles.label}>Mã đơn đặt chỗ</AppText>
            <AppText style={styles.codeValue}>{bookingCode || "—"}</AppText>
          </View>

          {serviceName ? (
            <View style={styles.row}>
              <AppText style={styles.label}>Dịch vụ</AppText>
              <AppText style={styles.value} numberOfLines={2}>
                {serviceName}
              </AppText>
            </View>
          ) : null}

          {amount != null ? (
            <View style={styles.row}>
              <AppText style={styles.label}>Số tiền đã thanh toán</AppText>
              <AppText style={styles.amountValue}>{formatCurrencyVnd(amount)}</AppText>
            </View>
          ) : null}

          <View style={styles.row}>
            <AppText style={styles.label}>Trạng thái đơn</AppText>
            <View style={styles.statusPill}>
              <AppText style={styles.statusPillText}>Đã xác nhận</AppText>
            </View>
          </View>
        </View>

        <View style={styles.escrowBox}>
          <ShieldCheck size={18} color={colors.brandPrimary} />
          <AppText style={styles.escrowText}>
            Khoản thanh toán của bạn được bảo vệ an toàn bởi cơ chế ký quỹ Escrow và sẽ chỉ giải
            ngân cho đối tác sau khi bạn hoàn tất check-in.
          </AppText>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.homeBtn, pressed && { opacity: 0.85 }]}
          onPress={handleGoHome}
        >
          <Home size={16} color={colors.inkPrimary} />
          <AppText style={styles.homeBtnText}>Quay về trang chủ</AppText>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.detailBtn, pressed && { opacity: 0.9 }]}
          onPress={handleViewDetail}
        >
          <FileText size={16} color="#FFFFFF" />
          <AppText style={styles.detailBtnText}>Chi tiết đặt chỗ</AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.surfaceBase,
  },
  content: {
    padding: spacing.lg,
    gap: 16,
    paddingTop: 36,
  },
  heroBox: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.sm,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#D1FAE5",
    borderWidth: 2,
    borderColor: "#A7F3D0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.inkPrimary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.inkBody,
    textAlign: "center",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: spacing.md,
    gap: 12,
    marginTop: 6,
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  label: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  value: {
    flex: 1,
    textAlign: "right",
    fontSize: 13.5,
    fontWeight: "600",
    color: colors.inkPrimary,
  },
  codeValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  amountValue: {
    fontSize: 15.5,
    fontWeight: "700",
    color: "#059669",
  },
  statusPill: {
    backgroundColor: "#D1FAE5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#047857",
  },
  escrowBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#F0F9FF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    padding: spacing.md,
  },
  escrowText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: "#0369A1",
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  homeBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  homeBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  detailBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.brandPrimary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  detailBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
