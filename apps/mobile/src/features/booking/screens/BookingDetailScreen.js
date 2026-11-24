import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react-native";
import AppText from "../../../components/common/AppText";
import { useAuth } from "../../../hooks/useAuth";
import { resolveMediaUrl } from "../../../lib/apiClient";
import { colors, radius, spacing } from "../../../theme/tokens";
import { formatCurrencyVnd, getServiceTypeLabel } from "../../explore/models/exploreModel";
import BookingStatusBadge from "../components/BookingStatusBadge";
import CancelBookingModal from "../components/CancelBookingModal";
import {
  canCancelBooking,
  formatBookingDateRange,
  formatCountdown,
  getHoldRemainingSeconds,
} from "../models/bookingModel";
import bookingService from "../services/bookingService";

export default function BookingDetailScreen({ navigation, route }) {
  const { isAuthenticated } = useAuth();
  const { bookingId, bookingCode, contactPhone, initialBooking } = route.params || {};

  const [booking, setBooking] = useState(initialBooking || null);
  const [loading, setLoading] = useState(!initialBooking);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const loadDetail = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      try {
        let data = null;
        if (bookingId && isAuthenticated) {
          data = await bookingService.getBookingDetail(bookingId);
        } else if (bookingCode) {
          data = await bookingService.lookupGuestBooking(
            bookingCode,
            contactPhone || initialBooking?.contact_phone || "",
          );
        }
        if (data) {
          setBooking(data);
        } else if (!initialBooking) {
          setError("Không tìm thấy thông tin đơn đặt chỗ.");
        }
      } catch (err) {
        setError(err?.message || "Không thể tải chi tiết đơn đặt chỗ.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [bookingId, bookingCode, contactPhone, isAuthenticated, initialBooking],
  );

  useEffect(() => {
    loadDetail(false);
  }, [loadDetail]);

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

  const handleConfirmCancel = async (reason) => {
    if (!booking?.id) return;
    setCancelling(true);
    try {
      const result = await bookingService.cancelBooking(booking.id, reason);
      setCancelModalVisible(false);
      setBooking((prev) => ({
        ...prev,
        ...result.data,
        status: "cancelled",
        cancel_reason: result.data?.cancel_reason || reason,
      }));
      Alert.alert("Thành công", result.message);
    } catch (err) {
      Alert.alert("Không thể hủy đơn", err?.message || "Vui lòng thử lại sau.");
    } finally {
      setCancelling(false);
    }
  };

  const handlePayDepositPress = () => {
    if (!booking) return;
    navigation.navigate("SepayPayment", {
      bookingId: booking.id,
      bookingCode: booking.booking_code,
      contactPhone: booking.contact_phone || contactPhone || "",
      serviceName: booking.service?.name || "Đơn đặt chỗ của bạn",
      depositAmount: booking.deposit_amount,
      paymentExpiresAt: booking.payment_expires_at,
    });
  };

  const service = booking?.service;
  const coverRaw =
    service?.cover_image ||
    service?.media?.find((m) => m.is_cover)?.url ||
    service?.media?.[0]?.url ||
    "";
  const coverUrl = resolveMediaUrl(coverRaw);
  const locationName = service?.location?.name || service?.location_name || "";
  const roomType = booking?.room_type || booking?.roomType;
  const showCancelButton = isAuthenticated && canCancelBooking(booking);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.inkPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText style={styles.headerTitle}>Chi tiết đơn đặt chỗ</AppText>
          <AppText style={styles.headerSub}>{booking?.booking_code || "Đang tải..."}</AppText>
        </View>
        {booking?.status ? <BookingStatusBadge status={booking.status} /> : null}
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.brandPrimary} />
          <AppText style={styles.centerText}>Đang tải thông tin đơn...</AppText>
        </View>
      ) : error && !booking ? (
        <View style={styles.centerBox}>
          <AppText style={styles.errorTitle}>Không thể tải đơn đặt chỗ</AppText>
          <AppText style={styles.centerText}>{error}</AppText>
          <Pressable style={styles.retryBtn} onPress={() => loadDetail(false)}>
            <AppText style={styles.retryBtnText}>Thử lại</AppText>
          </Pressable>
        </View>
      ) : booking ? (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadDetail(true)}
                tintColor={colors.brandPrimary}
              />
            }
          >
            {booking.status === "pending_payment" && remainingSeconds > 0 ? (
              <View style={styles.countdownCard}>
                <Clock size={20} color="#B45309" />
                <View style={{ flex: 1 }}>
                  <AppText style={styles.countdownTitle}>
                    Đang giữ chỗ · Còn {formatCountdown(remainingSeconds)}
                  </AppText>
                  <AppText style={styles.countdownDesc}>
                    Vui lòng hoàn tất thanh toán cọc {booking.deposit_rate}% trước khi hết thời gian
                    giữ chỗ.
                  </AppText>
                </View>
              </View>
            ) : null}

            {booking.status === "cancelled" && booking.cancel_reason ? (
              <View style={styles.cancelBanner}>
                <XCircle size={18} color="#BE123C" />
                <View style={{ flex: 1 }}>
                  <AppText style={styles.cancelBannerTitle}>Đơn đặt chỗ đã bị hủy</AppText>
                  <AppText style={styles.cancelBannerDesc}>Lý do: {booking.cancel_reason}</AppText>
                </View>
              </View>
            ) : null}

            {/* Thông tin dịch vụ */}
            <View style={styles.card}>
              <AppText style={styles.sectionTitle}>Dịch vụ đã đặt</AppText>
              <View style={styles.serviceRow}>
                {coverUrl ? (
                  <Image source={{ uri: coverUrl }} style={styles.cover} resizeMode="cover" />
                ) : (
                  <View style={[styles.cover, styles.coverPlaceholder]}>
                    <AppText style={styles.coverPlaceholderText}>
                      {getServiceTypeLabel(service?.type).slice(0, 2).toUpperCase()}
                    </AppText>
                  </View>
                )}
                <View style={{ flex: 1, gap: 4 }}>
                  <AppText style={styles.serviceName}>{service?.name || "Dịch vụ du lịch"}</AppText>
                  {roomType?.name ? (
                    <AppText style={styles.roomTypeText}>Hạng phòng: {roomType.name}</AppText>
                  ) : null}
                  {locationName ? (
                    <View style={styles.inlineRow}>
                      <MapPin size={13} color={colors.inkMuted} />
                      <AppText style={styles.inlineText}>{locationName}</AppText>
                    </View>
                  ) : null}
                  {service?.address ? (
                    <AppText style={styles.addressText}>{service.address}</AppText>
                  ) : null}
                </View>
              </View>

              {booking.provider ? (
                <View style={styles.providerRow}>
                  <Building2 size={15} color={colors.brandPrimary} />
                  <AppText style={styles.providerText}>
                    Đối tác: {booking.provider.business_name}
                    {booking.provider.phone ? ` · ${booking.provider.phone}` : ""}
                  </AppText>
                </View>
              ) : null}
            </View>

            {/* Lịch trình & Số lượng */}
            <View style={styles.card}>
              <AppText style={styles.sectionTitle}>Lịch trình & Số lượng</AppText>
              {(() => {
                const isStay = service?.type === "hotel" || service?.type === "homestay";
                const isTrain =
                  service?.type === "train" ||
                  String(service?.category?.slug || "")
                    .toLowerCase()
                    .includes("tau");
                const isVehicle = service?.type === "vehicle" && !isTrain;
                const unitLabel = isStay ? "phòng" : isVehicle ? "phương tiện" : "vé";
                const durationLabel = isStay
                  ? `${booking.duration_units || 1} đêm`
                  : isVehicle
                    ? `${booking.duration_units || 1} ngày`
                    : null;

                return (
                  <View style={styles.scheduleList}>
                    <View style={styles.scheduleRow}>
                      <View style={styles.scheduleLabelWrap}>
                        <Calendar size={15} color={colors.brandPrimary} />
                        <AppText style={styles.scheduleLabel}>Thời gian</AppText>
                      </View>
                      <AppText style={styles.scheduleValue}>
                        {formatBookingDateRange(booking.start_date, booking.end_date)}
                        {durationLabel ? ` (${durationLabel})` : ""}
                      </AppText>
                    </View>

                    <View style={styles.scheduleRow}>
                      <AppText style={styles.scheduleLabel}>Số lượng</AppText>
                      <AppText style={styles.scheduleValue}>
                        {booking.quantity || 1} {unitLabel}
                      </AppText>
                    </View>

                    {isStay ? (
                      <View style={styles.scheduleRow}>
                        <AppText style={styles.scheduleLabel}>Số khách</AppText>
                        <AppText style={styles.scheduleValue}>
                          {booking.metadata?.num_adults || 1} người lớn
                          {Number(booking.metadata?.num_children) > 0
                            ? `, ${booking.metadata.num_children} trẻ em`
                            : ""}
                        </AppText>
                      </View>
                    ) : null}

                    {booking.policy_rules?.checkin_time || booking.policy_rules?.checkout_time ? (
                      <View style={styles.scheduleRow}>
                        <View style={styles.scheduleLabelWrap}>
                          <Clock size={15} color={colors.brandPrimary} />
                          <AppText style={styles.scheduleLabel}>
                            {isStay ? "Giờ nhận / trả" : "Giờ giao / nhận"}
                          </AppText>
                        </View>
                        <AppText style={styles.scheduleValue}>
                          {booking.policy_rules.checkin_time || "14:00"} –{" "}
                          {booking.policy_rules.checkout_time || "12:00"}
                        </AppText>
                      </View>
                    ) : null}

                    {booking.policy_rules?.cancellation?.label ? (
                      <View style={styles.scheduleRow}>
                        <View style={styles.scheduleLabelWrap}>
                          <ShieldCheck
                            size={15}
                            color={
                              booking.policy_rules.cancellation.refundable ? "#059669" : "#E11D48"
                            }
                          />
                          <AppText style={styles.scheduleLabel}>Hoàn / hủy</AppText>
                        </View>
                        <AppText style={styles.scheduleValue}>
                          {booking.policy_rules.cancellation.label}
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                );
              })()}
              {booking.metadata?.special_requests ? (
                <View style={styles.noteBox}>
                  <AppText style={styles.noteLabel}>Ghi chú đặc biệt</AppText>
                  <AppText style={styles.noteValue}>{booking.metadata.special_requests}</AppText>
                </View>
              ) : null}
            </View>

            {/* Thông tin liên hệ */}
            <View style={styles.card}>
              <AppText style={styles.sectionTitle}>Thông tin liên hệ</AppText>
              <View style={styles.infoRow}>
                <User size={15} color={colors.inkMuted} />
                <AppText style={styles.infoValue}>{booking.contact_name || "—"}</AppText>
              </View>
              <View style={styles.infoRow}>
                <Phone size={15} color={colors.inkMuted} />
                <AppText style={styles.infoValue}>{booking.contact_phone || "—"}</AppText>
              </View>
              <View style={styles.infoRow}>
                <Mail size={15} color={colors.inkMuted} />
                <AppText style={styles.infoValue}>{booking.contact_email || "—"}</AppText>
              </View>
            </View>

            {/* Chi tiết thanh toán */}
            <View style={styles.card}>
              <AppText style={styles.sectionTitle}>Chi tiết giá & Đặt cọc</AppText>

              <View style={styles.priceRow}>
                <AppText style={styles.priceLabel}>Tạm tính</AppText>
                <AppText style={styles.priceVal}>{formatCurrencyVnd(booking.subtotal)}</AppText>
              </View>

              {Number(booking.promotion_discount_amount) > 0 ? (
                <View style={styles.priceRow}>
                  <AppText style={styles.priceLabel}>Ưu đãi chiến dịch</AppText>
                  <AppText style={styles.discountVal}>
                    -{formatCurrencyVnd(booking.promotion_discount_amount)}
                  </AppText>
                </View>
              ) : null}

              {Number(booking.coupon_discount_amount) > 0 ? (
                <View style={styles.priceRow}>
                  <AppText style={styles.priceLabel}>
                    Mã giảm giá{booking.coupon?.code ? ` (${booking.coupon.code})` : ""}
                  </AppText>
                  <AppText style={styles.discountVal}>
                    -{formatCurrencyVnd(booking.coupon_discount_amount)}
                  </AppText>
                </View>
              ) : null}

              <View style={styles.divider} />

              <View style={styles.priceRow}>
                <AppText style={styles.totalLabel}>Tổng giá trị đơn</AppText>
                <AppText style={styles.totalVal}>{formatCurrencyVnd(booking.total_amount)}</AppText>
              </View>

              <View style={styles.priceRow}>
                <AppText style={styles.priceLabel}>
                  Thanh toán trước ({booking.deposit_rate}%)
                </AppText>
                <AppText style={styles.depositVal}>
                  {formatCurrencyVnd(booking.deposit_amount)}
                </AppText>
              </View>

              {Number(booking.remaining_amount) > 0 ? (
                <View style={styles.priceRow}>
                  <AppText style={styles.priceLabel}>Thanh toán khi nhận dịch vụ</AppText>
                  <AppText style={styles.priceVal}>
                    {formatCurrencyVnd(booking.remaining_amount)}
                  </AppText>
                </View>
              ) : null}

              <View style={styles.escrowNote}>
                <ShieldCheck size={16} color={colors.brandPrimary} />
                <AppText style={styles.escrowNoteText}>
                  Tiền cọc được ký quỹ Escrow an toàn và chỉ giải ngân sau khi check-in thành công.
                </AppText>
              </View>
            </View>
          </ScrollView>

          {(booking.status === "pending_payment" || showCancelButton) && (
            <View style={styles.bottomBar}>
              {showCancelButton ? (
                <Pressable
                  style={styles.cancelOutlineBtn}
                  onPress={() => setCancelModalVisible(true)}
                >
                  <AppText style={styles.cancelOutlineText}>Hủy đơn</AppText>
                </Pressable>
              ) : null}

              {booking.status === "pending_payment" ? (
                <Pressable style={styles.payBtn} onPress={handlePayDepositPress}>
                  <CreditCard size={17} color="#FFFFFF" />
                  <AppText style={styles.payBtnText}>
                    Thanh toán {formatCurrencyVnd(booking.deposit_amount)}
                  </AppText>
                </Pressable>
              ) : null}
            </View>
          )}
        </>
      ) : null}

      <CancelBookingModal
        visible={cancelModalVisible}
        bookingCode={booking?.booking_code}
        loading={cancelling}
        onClose={() => setCancelModalVisible(false)}
        onConfirm={handleConfirmCancel}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  headerSub: {
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 1,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.surfaceBase,
  },
  content: {
    padding: spacing.md,
    gap: 12,
    paddingBottom: 32,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: 10,
    backgroundColor: colors.surfaceBase,
  },
  centerText: {
    fontSize: 13.5,
    color: colors.inkBody,
    textAlign: "center",
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  retryBtn: {
    marginTop: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.brandPrimary,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13.5,
  },
  countdownCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FEF3C7",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: spacing.md,
  },
  countdownTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#B45309",
  },
  countdownDesc: {
    fontSize: 12.5,
    color: "#92400E",
    marginTop: 2,
    lineHeight: 18,
  },
  cancelBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FFF1F2",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FECDD3",
    padding: spacing.md,
  },
  cancelBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#BE123C",
  },
  cancelBannerDesc: {
    fontSize: 12.5,
    color: "#9F1239",
    marginTop: 2,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: spacing.md,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  serviceRow: {
    flexDirection: "row",
    gap: 12,
  },
  cover: {
    width: 82,
    height: 82,
    borderRadius: radius.lg,
    backgroundColor: "#F1F5F9",
  },
  coverPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E0F2FE",
  },
  coverPlaceholderText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  roomTypeText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.brandPrimary,
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  inlineText: {
    fontSize: 12.5,
    color: colors.inkBody,
  },
  addressText: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  providerText: {
    flex: 1,
    fontSize: 12.5,
    color: colors.inkBody,
    fontWeight: "500",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  infoValue: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "600",
    color: colors.inkPrimary,
  },
  scheduleList: {
    gap: 10,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  scheduleLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  scheduleLabel: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  scheduleValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 13.5,
    fontWeight: "600",
    color: colors.inkPrimary,
  },
  noteBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    gap: 2,
  },
  noteLabel: {
    fontSize: 11.5,
    color: colors.inkMuted,
    fontWeight: "600",
  },
  noteValue: {
    fontSize: 13,
    color: colors.inkBody,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceLabel: {
    fontSize: 13,
    color: colors.inkBody,
  },
  priceVal: {
    fontSize: 13.5,
    fontWeight: "600",
    color: colors.inkPrimary,
  },
  discountVal: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#059669",
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 2,
  },
  totalLabel: {
    fontSize: 14.5,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  totalVal: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  depositVal: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  escrowNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0F9FF",
    borderRadius: 12,
    padding: 10,
    marginTop: 4,
  },
  escrowNoteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#0369A1",
  },
  bottomBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  cancelOutlineBtn: {
    paddingHorizontal: 18,
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#FECDD3",
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelOutlineText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#BE123C",
  },
  payBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.brandPrimary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  payBtnText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
