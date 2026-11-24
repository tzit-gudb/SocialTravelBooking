import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight, Clock, CreditCard } from "lucide-react-native";
import AppText from "../../../components/common/AppText";
import { usePendingBooking } from "../../../context/PendingBookingContext";
import { colors, spacing } from "../../../theme/tokens";
import { formatCurrencyVnd } from "../../explore/models/exploreModel";
import { formatCountdown, getHoldRemainingSeconds } from "../models/bookingModel";

/**
 * Thanh nổi hiển thị đơn đặt chỗ chưa thanh toán kèm bộ đếm ngược thời gian giữ chỗ.
 * Đặt phía trên LiquidGlassTabBar để cả Khách vãng lai lẫn Thành viên có thể bấm quay lại
 * màn hình thanh toán ngay lập tức mà không cần nhớ mã đơn.
 */
export default function FloatingPendingBookingBanner() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { pendingBooking, clearPendingBooking } = usePendingBooking();

  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    getHoldRemainingSeconds(pendingBooking?.paymentExpiresAt),
  );

  useEffect(() => {
    if (!pendingBooking?.paymentExpiresAt) {
      setRemainingSeconds(0);
      return undefined;
    }

    const updateTimer = () => {
      const secs = getHoldRemainingSeconds(pendingBooking.paymentExpiresAt);
      setRemainingSeconds(secs);
      if (secs <= 0) {
        clearPendingBooking();
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [pendingBooking?.paymentExpiresAt, clearPendingBooking]);

  if (!pendingBooking || remainingSeconds <= 0) {
    return null;
  }

  const bottomOffset = Math.max(insets.bottom, 10) + 64;

  const handleResumePayment = () => {
    navigation.navigate("SepayPayment", {
      bookingId: pendingBooking.bookingId,
      bookingCode: pendingBooking.bookingCode,
      contactPhone: pendingBooking.contactPhone,
      serviceName: pendingBooking.serviceName,
      depositAmount: pendingBooking.depositAmount,
      paymentExpiresAt: pendingBooking.paymentExpiresAt,
    });
  };

  return (
    <View style={[styles.outer, { bottom: bottomOffset }]} pointerEvents="box-none">
      <Pressable
        style={({ pressed }) => [styles.banner, pressed && styles.bannerPressed]}
        onPress={handleResumePayment}
      >
        <View style={styles.iconWrap}>
          <CreditCard size={18} color="#FFFFFF" />
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.topRow}>
            <AppText style={styles.title} numberOfLines={1}>
              Chờ thanh toán · {pendingBooking.bookingCode}
            </AppText>
            <View style={styles.timerPill}>
              <Clock size={11} color="#B45309" />
              <AppText style={styles.timerText}>{formatCountdown(remainingSeconds)}</AppText>
            </View>
          </View>

          <AppText style={styles.sub} numberOfLines={1}>
            {pendingBooking.serviceName} · {formatCurrencyVnd(pendingBooking.depositAmount)}
          </AppText>
        </View>

        <View style={styles.cta}>
          <AppText style={styles.ctaText}>Trả ngay</AppText>
          <ChevronRight size={14} color={colors.brandPrimary} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    zIndex: 20,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0F172A",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.35)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 12,
  },
  bannerPressed: {
    opacity: 0.92,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  title: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  timerText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B45309",
  },
  sub: {
    fontSize: 11.5,
    color: "#CBD5E1",
    marginTop: 2,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  ctaText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
});
