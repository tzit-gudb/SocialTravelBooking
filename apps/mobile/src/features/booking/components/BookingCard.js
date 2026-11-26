import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Calendar, Clock, MapPin, ChevronRight, Star } from "lucide-react-native";
import AppText from "../../../components/common/AppText";
import { resolveMediaUrl } from "../../../lib/apiClient";
import { colors, radius, spacing } from "../../../theme/tokens";
import { formatCurrencyVnd, getServiceTypeLabel } from "../../explore/models/exploreModel";
import {
  formatBookingDateRange,
  formatCountdown,
  getHoldRemainingSeconds,
} from "../models/bookingModel";
import BookingStatusBadge from "./BookingStatusBadge";

export default function BookingCard({ booking, onPress }) {
  const service = booking?.service;
  const coverUrl = resolveMediaUrl(service?.cover_image);

  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    booking?.status === "pending_payment"
      ? getHoldRemainingSeconds(booking?.payment_expires_at)
      : 0,
  );

  useEffect(() => {
    if (booking?.status !== "pending_payment" || !booking?.payment_expires_at) {
      setRemainingSeconds(0);
      return undefined;
    }

    setRemainingSeconds(getHoldRemainingSeconds(booking.payment_expires_at));
    const timer = setInterval(() => {
      setRemainingSeconds(getHoldRemainingSeconds(booking.payment_expires_at));
    }, 1000);

    return () => clearInterval(timer);
  }, [booking?.status, booking?.payment_expires_at]);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress?.(booking)}
    >
      <View style={styles.topBar}>
        <View style={styles.codeWrap}>
          <AppText style={styles.codeLabel}>Mã đơn</AppText>
          <AppText style={styles.codeValue}>{booking?.booking_code || "—"}</AppText>
        </View>
        <BookingStatusBadge status={booking?.status} />
      </View>

      <View style={styles.mainRow}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <AppText style={styles.thumbPlaceholderText}>
              {getServiceTypeLabel(service?.type).slice(0, 2).toUpperCase()}
            </AppText>
          </View>
        )}

        <View style={styles.infoCol}>
          <AppText style={styles.serviceName} numberOfLines={2}>
            {service?.name || "Dịch vụ du lịch"}
          </AppText>

          {booking?.room_type?.name ? (
            <AppText style={styles.roomType} numberOfLines={1}>
              {booking.room_type.name}
            </AppText>
          ) : null}

          {service?.location_name ? (
            <View style={styles.metaRow}>
              <MapPin size={13} color={colors.inkMuted} />
              <AppText style={styles.metaText} numberOfLines={1}>
                {service.location_name}
              </AppText>
            </View>
          ) : null}

          <View style={styles.metaRow}>
            <Calendar size={13} color={colors.brandPrimary} />
            <AppText style={styles.metaText} numberOfLines={1}>
              {formatBookingDateRange(booking?.start_date, booking?.end_date)} · SL:{" "}
              {booking?.quantity || 1}
            </AppText>
          </View>
        </View>
      </View>

      {booking?.status === "pending_payment" && remainingSeconds > 0 ? (
        <View style={styles.holdBanner}>
          <Clock size={14} color="#B45309" />
          <AppText style={styles.holdBannerText}>
            Giữ chỗ còn {formatCountdown(remainingSeconds)} — Vui lòng thanh toán cọc
          </AppText>
        </View>
      ) : null}

      {booking?.status === "completed" && (
        <View
          style={[
            styles.reviewHintRow,
            booking?.has_review ? styles.reviewDoneRow : styles.reviewPendingRow,
          ]}
        >
          <Star
            size={13}
            color={booking?.has_review ? "#047857" : "#B45309"}
            fill={booking?.has_review ? "#047857" : "transparent"}
          />
          <AppText
            style={[styles.reviewHintText, { color: booking?.has_review ? "#047857" : "#B45309" }]}
          >
            {booking?.has_review
              ? "Đã đánh giá dịch vụ · Chạm để xem/sửa"
              : "Chạm để đánh giá trải nghiệm dịch vụ"}
          </AppText>
        </View>
      )}

      <View style={styles.footer}>
        <View>
          <AppText style={styles.priceLabel}>
            {Number(booking?.deposit_rate) > 0 && Number(booking?.deposit_rate) < 100
              ? `Cọc ${booking.deposit_rate}% · Tổng ${formatCurrencyVnd(booking?.total_amount)}`
              : "Tổng thanh toán"}
          </AppText>
          <AppText style={styles.priceValue}>
            {Number(booking?.deposit_rate) > 0 && Number(booking?.deposit_rate) < 100
              ? formatCurrencyVnd(booking?.deposit_amount)
              : formatCurrencyVnd(booking?.total_amount)}
          </AppText>
        </View>

        <View style={styles.detailCta}>
          <AppText style={styles.detailCtaText}>Chi tiết</AppText>
          <ChevronRight size={16} color={colors.brandPrimary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: spacing.md,
    gap: 12,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  codeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  codeLabel: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  codeValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  mainRow: {
    flexDirection: "row",
    gap: 12,
  },
  thumb: {
    width: 78,
    height: 78,
    borderRadius: radius.lg,
    backgroundColor: "#F1F5F9",
  },
  thumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E0F2FE",
  },
  thumbPlaceholderText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  infoCol: {
    flex: 1,
    gap: 4,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.inkPrimary,
    lineHeight: 20,
  },
  roomType: {
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.brandPrimary,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    flex: 1,
    fontSize: 12.5,
    color: colors.inkBody,
  },
  holdBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  holdBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#B45309",
  },
  reviewHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  reviewPendingRow: {
    backgroundColor: "#FFFBEB",
  },
  reviewDoneRow: {
    backgroundColor: "#ECFDF5",
  },
  reviewHintText: {
    fontSize: 12,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  priceLabel: {
    fontSize: 11.5,
    color: colors.inkMuted,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.brandPrimary,
    marginTop: 2,
  },
  detailCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
  },
  detailCtaText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
});
