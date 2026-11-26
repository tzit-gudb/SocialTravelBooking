import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle2,
  Flame,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  Users,
  XCircle,
} from "lucide-react-native";
import AppText from "../../../components/common/AppText";
import Skeleton from "../../../components/common/Skeleton";
import { colors, radius, spacing, touchTarget } from "../../../theme/tokens";
import { echo } from "../../../lib/echo";
import exploreService from "../services/exploreService";
import {
  formatCurrencyVnd,
  formatPriceUnit,
  getRatingVerdict,
  getServiceTypeLabel,
} from "../models/exploreModel";
import ServiceDetailGallery from "../components/ServiceDetailGallery";
import ServiceDetailReviews from "../components/ServiceDetailReviews";

function DetailSkeleton({ onBack }) {
  return (
    <SafeAreaView style={styles.skeletonSafe} edges={["top"]}>
      <StatusBar style="dark" />
      <View style={styles.skeletonTopBar}>
        <Pressable onPress={onBack} style={styles.skeletonBackBtn}>
          <ArrowLeft size={20} color={colors.inkPrimary} />
        </Pressable>
      </View>
      <Skeleton width="100%" height={250} borderRadius={0} />
      <View style={styles.skeletonBody}>
        <Skeleton width="35%" height={22} borderRadius={999} />
        <Skeleton width="90%" height={26} />
        <Skeleton width="65%" height={16} />
        <Skeleton width="100%" height={110} borderRadius={16} />
        <Skeleton width="100%" height={140} borderRadius={16} />
      </View>
    </SafeAreaView>
  );
}

function formatSlotDate(isoDate) {
  if (!isoDate) return "";
  const [, m, d] = String(isoDate).split("-");
  return d && m ? `${d}/${m}` : String(isoDate);
}

/**
 * Màn hình Chi tiết Dịch vụ chuẩn Booking.com / Trip.com:
 * Gallery ảnh, Thông tin đối tác KYC, Tiện nghi, Loại phòng / Lịch trình Tour,
 * Lịch trống & giá theo ngày, Đánh giá khách hàng và Thanh đặt chỗ.
 */
export default function ServiceDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();

  const initialPreview = route?.params?.tour || null;
  const serviceId = route?.params?.serviceId || initialPreview?.id;

  const [service, setService] = useState(initialPreview);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [selectedDateId, setSelectedDateId] = useState(null);
  const [descExpanded, setDescExpanded] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!serviceId) {
      setErrorMsg("Không tìm thấy mã dịch vụ.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await exploreService.fetchServiceDetail(serviceId);
      const data = res?.data;
      if (!data) {
        setErrorMsg("Không thể tải thông tin dịch vụ.");
      } else {
        setService(data);
        if (Array.isArray(data.room_types) && data.room_types.length > 0) {
          setSelectedRoomId(data.room_types[0].id);
        }
        if (Array.isArray(data.availability) && data.availability.length > 0) {
          const firstOpen = data.availability.find(
            (slot) => Math.max(0, (slot.total_slots || 0) - (slot.booked_slots || 0)) > 0,
          );
          if (firstOpen) setSelectedDateId(firstOpen.id);
        }
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || "Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!serviceId) return undefined;

    const channelName = `service.${serviceId}.reviews`;
    const channel = echo.channel(channelName);

    channel.listen(".review.updated", () => {
      loadDetail();
    });

    return () => {
      echo.leaveChannel(channelName);
    };
  }, [serviceId, loadDetail]);

  useEffect(() => {
    if (route?.params?.selectedRoomId) {
      setSelectedRoomId(route.params.selectedRoomId);
    }
  }, [route?.params?.selectedRoomId]);

  const isAccommodation = service?.type === "hotel" || service?.type === "homestay";
  const isTrainService =
    service?.type === "train" ||
    String(service?.category?.slug || "")
      .toLowerCase()
      .includes("tau") ||
    String(service?.category?.name || "")
      .toLowerCase()
      .includes("vé tàu");
  const showAvailabilitySection = service?.type === "tour" || isTrainService;
  const hasDepositPolicy =
    Array.isArray(service?.policies) &&
    service.policies.some((p) => /đặt cọc giữ chỗ 30%/i.test(p.name || ""));

  const selectedRoom = useMemo(() => {
    if (!Array.isArray(service?.room_types)) return null;
    return service.room_types.find((r) => r.id === selectedRoomId) || service.room_types[0] || null;
  }, [service, selectedRoomId]);

  const selectedSlot = useMemo(() => {
    if (!Array.isArray(service?.availability)) return null;
    return service.availability.find((a) => a.id === selectedDateId) || null;
  }, [service, selectedDateId]);

  const baseEffectivePrice = useMemo(() => {
    if (selectedSlot?.price_override) return Number(selectedSlot.price_override);
    if (isAccommodation && selectedRoom?.base_price) return Number(selectedRoom.base_price);
    return Number(service?.base_price || 0);
  }, [selectedSlot, isAccommodation, selectedRoom, service]);

  const activePromotion = service?.active_promotion || null;

  const effectivePrice = useMemo(() => {
    if (!activePromotion) return baseEffectivePrice;
    if (activePromotion.discount_type === "fixed") {
      return Math.max(
        0,
        Math.round(baseEffectivePrice - Number(activePromotion.discount_value || 0)),
      );
    }
    const pct = Number(activePromotion.discount_value || 0);
    return Math.max(0, Math.round(baseEffectivePrice * (1 - pct / 100)));
  }, [baseEffectivePrice, activePromotion]);

  const handleBookNow = () => {
    navigation.navigate("BookingCheckout", {
      service,
      selectedRoom,
      selectedSlot,
    });
  };

  if (loading && !service) {
    return <DetailSkeleton onBack={() => navigation.goBack()} />;
  }

  if (errorMsg && !service) {
    return (
      <SafeAreaView style={styles.errorSafe}>
        <StatusBar style="dark" />
        <AppText style={styles.errorTitle}>Không thể mở dịch vụ</AppText>
        <AppText style={styles.errorDesc}>{errorMsg}</AppText>
        <View style={styles.errorActions}>
          <Pressable style={styles.retryBtn} onPress={loadDetail}>
            <AppText style={styles.retryBtnText}>Thử lại</AppText>
          </Pressable>
          <Pressable style={styles.backOutlineBtn} onPress={() => navigation.goBack()}>
            <AppText style={styles.backOutlineText}>Quay lại</AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = service?.name || service?.title || "Chi tiết Dịch vụ";
  const categoryLabel = service?.category?.name || getServiceTypeLabel(service?.type);
  const ratingScore = Number(service?.rating_avg || service?.avg_rating || 0);
  const reviewsCount = Number(service?.reviews_count || 0);
  const bookingsCount = Number(service?.total_bookings || 0);
  const fullAddress = service?.address
    ? service?.location?.name
      ? `${service.address}, ${service.location.name}`
      : service.address
    : service?.location?.name || "Việt Nam";
  const amenities = Array.isArray(service?.amenities) ? service.amenities : [];
  const includes = Array.isArray(service?.includes) ? service.includes : [];
  const excludes = Array.isArray(service?.excludes) ? service.excludes : [];
  const roomTypes = Array.isArray(service?.room_types) ? service.room_types : [];
  const schedules = Array.isArray(service?.schedules) ? service.schedules : [];
  const availability = Array.isArray(service?.availability) ? service.availability : [];
  const reviews = Array.isArray(service?.reviews) ? service.reviews : [];
  const description = String(service?.description || "").trim();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + (activePromotion ? 156 : 124) },
        ]}
      >
        <ServiceDetailGallery
          media={service?.media}
          coverImage={service?.cover_image || service?.primary_image}
          serviceName={displayName}
          onBack={() => navigation.goBack()}
        />

        <View style={styles.contentWrap}>
          {/* Khối Thông tin tổng quan */}
          <View style={styles.sectionCard}>
            <View style={styles.categoryTag}>
              <AppText style={styles.categoryTagText}>{categoryLabel}</AppText>
            </View>

            <AppText style={styles.serviceTitle}>{displayName}</AppText>

            <View style={styles.ratingRow}>
              <View style={styles.scoreBox}>
                <Star size={12} color="#FFFFFF" fill="#FFFFFF" />
                <AppText style={styles.scoreBoxText}>
                  {ratingScore > 0 ? ratingScore.toFixed(1) : "Mới"}
                </AppText>
              </View>
              <AppText style={styles.verdictText}>{getRatingVerdict(ratingScore)}</AppText>
              <AppText style={styles.ratingMetaText}>
                {reviewsCount > 0 ? `(${reviewsCount} đánh giá)` : ""}
                {bookingsCount > 0 ? ` · ${bookingsCount} lượt đặt` : ""}
              </AppText>
            </View>

            <View style={styles.infoLine}>
              <MapPin size={15} color={colors.brandPrimary} />
              <AppText style={styles.infoLineText}>{fullAddress}</AppText>
            </View>

            {service?.provider?.business_name ? (
              <View style={styles.providerCard}>
                <View style={styles.providerLeft}>
                  <View style={styles.providerIcon}>
                    <Building2 size={18} color={colors.brandPrimary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.providerTitleRow}>
                      <AppText style={styles.providerName} numberOfLines={1}>
                        {service.provider.business_name}
                      </AppText>
                      <BadgeCheck size={15} color="#10B981" />
                    </View>
                    <AppText style={styles.providerSub}>
                      Đối tác đã xác minh KYC
                      {service.provider.phone ? ` · ${service.provider.phone}` : ""}
                    </AppText>
                  </View>
                </View>
                {service.provider.phone ? (
                  <View style={styles.phoneBadge}>
                    <Phone size={13} color={colors.brandPrimary} />
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>

          {/* Khối Ưu đãi Lễ hội đang áp dụng */}
          {activePromotion ? (
            <View style={styles.promoPolicyCard}>
              <Flame size={20} color="#E11D48" fill="#FFE4E6" />
              <View style={{ flex: 1, gap: 3 }}>
                <View style={styles.promoHeaderRow}>
                  <AppText style={styles.promoPolicyTitle}>{activePromotion.campaign_name}</AppText>
                  <View style={styles.promoPill}>
                    <AppText style={styles.promoPillText}>{activePromotion.badge_text}</AppText>
                  </View>
                </View>
                <AppText style={styles.promoPolicyDesc}>
                  Ưu đãi áp dụng trực tiếp cho dịch vụ này: giá chỉ còn{" "}
                  {formatCurrencyVnd(effectivePrice)} (giá gốc{" "}
                  {formatCurrencyVnd(baseEffectivePrice)}).
                </AppText>
                <AppText style={styles.promoPolicyDesc}>
                  *Lưu ý: Mức giảm trên là chính sách của hệ thống Social Travel Booking. Giá trị
                  thực tế còn phụ thuộc vào chính sách của Nhà cung cấp dịch vụ.
                </AppText>
              </View>
            </View>
          ) : null}

          {/* Tiện nghi & Dịch vụ Bao gồm / Không bao gồm */}
          {amenities.length > 0 || includes.length > 0 || excludes.length > 0 ? (
            <View style={styles.sectionCard}>
              <AppText style={styles.sectionTitle}>Tiện nghi dịch vụ</AppText>

              {amenities.length > 0 ? (
                <View style={styles.chipsWrap}>
                  {amenities.map((item, idx) => (
                    <View key={`${item}-${idx}`} style={styles.amenityChip}>
                      <AppText style={styles.amenityChipText}>{item}</AppText>
                    </View>
                  ))}
                </View>
              ) : null}

              {includes.length > 0 ? (
                <View style={styles.policyGroup}>
                  <AppText style={styles.policyGroupLabel}>Bao gồm</AppText>
                  {includes.map((inc, idx) => (
                    <View key={`inc-${idx}`} style={styles.policyRow}>
                      <CheckCircle2 size={15} color="#059669" />
                      <AppText style={styles.policyRowText}>{inc}</AppText>
                    </View>
                  ))}
                </View>
              ) : null}

              {excludes.length > 0 ? (
                <View style={styles.policyGroup}>
                  <AppText style={styles.policyGroupLabel}>Không bao gồm</AppText>
                  {excludes.map((exc, idx) => (
                    <View key={`exc-${idx}`} style={styles.policyRow}>
                      <XCircle size={15} color="#E11D48" />
                      <AppText style={styles.policyRowText}>{exc}</AppText>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Danh sách Loại phòng (cho Chỗ ở) */}
          {isAccommodation && roomTypes.length > 0 ? (
            <View style={styles.sectionCard}>
              <AppText style={styles.sectionTitle}>Chọn hạng phòng</AppText>
              <View style={styles.roomsList}>
                {roomTypes.map((room) => {
                  const selected = selectedRoom?.id === room.id;
                  return (
                    <Pressable
                      key={room.id}
                      onPress={() => setSelectedRoomId(room.id)}
                      style={[styles.roomCard, selected && styles.roomCardActive]}
                    >
                      <View style={styles.roomTopRow}>
                        <AppText style={styles.roomName}>{room.name}</AppText>
                        <AppText style={styles.roomPrice}>
                          {formatCurrencyVnd(room.base_price)}/đêm
                        </AppText>
                      </View>
                      <View style={styles.roomMetaRow}>
                        <Users size={13} color={colors.inkSubtle} />
                        <AppText style={styles.roomMetaText}>
                          Tối đa {room.capacity_adults || 2} người lớn
                          {room.capacity_children > 0 ? ` · ${room.capacity_children} trẻ em` : ""}
                          {room.inventory > 0 ? ` · Còn ${room.inventory} phòng` : ""}
                        </AppText>
                      </View>
                      {room.description ? (
                        <AppText style={styles.roomDesc} numberOfLines={2}>
                          {room.description}
                        </AppText>
                      ) : null}
                      <View style={styles.roomFooterRow}>
                        <AppText style={styles.roomSelectHint}>
                          {selected ? "Đang chọn hạng phòng này" : "Nhấn để chọn"}
                        </AppText>
                        <Pressable
                          onPress={() =>
                            navigation.navigate("RoomTypeDetail", {
                              room,
                              service,
                            })
                          }
                          hitSlop={8}
                        >
                          <AppText style={styles.roomDetailLink}>Xem chi tiết phòng ›</AppText>
                        </Pressable>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Lịch trình theo ngày (cho Tour / Giải trí) */}
          {schedules.length > 0 ? (
            <View style={styles.sectionCard}>
              <AppText style={styles.sectionTitle}>Lịch trình chi tiết</AppText>
              <View style={styles.timelineList}>
                {schedules.map((sch) => (
                  <View key={sch.id} style={styles.timelineItem}>
                    <View style={styles.dayBadge}>
                      <AppText style={styles.dayBadgeText}>Ngày {sch.day_number}</AppText>
                    </View>
                    <View style={styles.timelineBody}>
                      <AppText style={styles.timelineTitle}>{sch.title}</AppText>
                      {sch.description ? (
                        <AppText style={styles.timelineDesc}>{sch.description}</AppText>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Lịch trống & Giá theo ngày (chỉ hiển thị cho Giải trí/Tour và Vé tàu) */}
          {showAvailabilitySection && availability.length > 0 ? (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderInline}>
                <Calendar size={17} color={colors.brandPrimary} />
                <AppText style={styles.sectionTitle}>Lịch trống & Giá theo ngày</AppText>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.slotsRow}
              >
                {availability.map((slot) => {
                  const remaining = Math.max(0, (slot.total_slots || 0) - (slot.booked_slots || 0));
                  const selected = selectedDateId === slot.id;
                  const slotPrice = slot.price_override || service?.base_price;
                  return (
                    <Pressable
                      key={slot.id}
                      disabled={remaining === 0}
                      onPress={() => setSelectedDateId(selected ? null : slot.id)}
                      style={[
                        styles.slotCard,
                        selected && styles.slotCardActive,
                        remaining === 0 && styles.slotCardSoldOut,
                      ]}
                    >
                      <AppText style={[styles.slotDate, selected && styles.slotTextActive]}>
                        {formatSlotDate(slot.available_date)}
                      </AppText>
                      <AppText style={[styles.slotPrice, selected && styles.slotTextActive]}>
                        {formatCurrencyVnd(slotPrice)}
                      </AppText>
                      <AppText style={[styles.slotRemain, selected && styles.slotRemainActive]}>
                        {remaining > 0 ? `Còn ${remaining} chỗ` : "Hết chỗ"}
                      </AppText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {/* Mô tả chi tiết */}
          {description ? (
            <View style={styles.sectionCard}>
              <AppText style={styles.sectionTitle}>Giới thiệu chi tiết</AppText>
              <AppText style={styles.descText} numberOfLines={descExpanded ? undefined : 5}>
                {description}
              </AppText>
              {description.length > 160 ? (
                <Pressable onPress={() => setDescExpanded((v) => !v)}>
                  <AppText style={styles.expandLink}>
                    {descExpanded ? "Thu gọn" : "Xem thêm mô tả"}
                  </AppText>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {/* Chính sách dịch vụ từ Nhà cung cấp */}
          {Array.isArray(service?.policies) && service.policies.length > 0 ? (
            <View style={styles.sectionCard}>
              <AppText style={styles.sectionTitle}>Chính sách dịch vụ</AppText>
              <View style={styles.policiesList}>
                {service.policies.map((pol) => {
                  const catLabel =
                    pol.category === "payment"
                      ? "Thanh toán"
                      : pol.category === "cancellation"
                        ? "Hủy & Đổi lịch"
                        : pol.category === "checkin"
                          ? "Nhận & Trả chỗ"
                          : "Quy định";
                  return (
                    <View key={pol.id} style={styles.policyItemCard}>
                      <View style={styles.policyItemTop}>
                        <ShieldCheck size={15} color={colors.brandPrimary} />
                        <AppText style={styles.policyItemName}>{pol.name}</AppText>
                        <View style={styles.policyCatChip}>
                          <AppText style={styles.policyCatChipText}>{catLabel}</AppText>
                        </View>
                      </View>
                      {pol.description ? (
                        <AppText style={styles.policyItemDesc}>{pol.description}</AppText>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Đánh giá từ khách hàng */}
          <ServiceDetailReviews
            ratingAvg={ratingScore}
            reviewsCount={reviewsCount}
            reviews={reviews}
          />
        </View>
      </ScrollView>

      {/* Thanh đặt chỗ cố định phía dưới */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
        <View style={styles.bottomPriceCol}>
          <AppText style={styles.bottomPriceLabel}>
            {isAccommodation && selectedRoom ? selectedRoom.name : "Giá áp dụng"}
          </AppText>
          {activePromotion && baseEffectivePrice > effectivePrice ? (
            <AppText style={styles.bottomStrikePrice}>
              {formatCurrencyVnd(baseEffectivePrice)}
            </AppText>
          ) : null}
          <View style={styles.bottomPriceRow}>
            <AppText style={[styles.bottomPriceValue, activePromotion && { color: "#E11D48" }]}>
              {formatCurrencyVnd(effectivePrice)}
            </AppText>
            <AppText style={styles.bottomPriceUnit}>
              /{formatPriceUnit(service?.price_unit, service?.type)}
            </AppText>
          </View>
          {hasDepositPolicy ? (
            <AppText style={styles.bottomDepositHint}>
              Cọc trước 30%: {formatCurrencyVnd(Math.round(effectivePrice * 0.3))}
            </AppText>
          ) : null}
        </View>

        <Pressable
          style={({ pressed }) => [styles.bookBtn, pressed && { opacity: 0.9 }]}
          onPress={handleBookNow}
          accessibilityRole="button"
        >
          <AppText style={styles.bookBtnText}>Đặt chỗ ngay</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceBase,
  },
  scrollContent: {
    gap: 12,
  },
  contentWrap: {
    paddingHorizontal: spacing.md,
    gap: 12,
  },
  skeletonSafe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  skeletonTopBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  skeletonBackBtn: {
    width: touchTarget.minHeight,
    height: touchTarget.minHeight,
    justifyContent: "center",
  },
  skeletonBody: {
    padding: spacing.md,
    gap: 12,
  },
  errorSafe: {
    flex: 1,
    backgroundColor: colors.surfaceBase,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: 10,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  errorDesc: {
    fontSize: 14,
    color: colors.inkBody,
    textAlign: "center",
  },
  errorActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  retryBtn: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.lg,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  backOutlineBtn: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: "#FFFFFF",
  },
  backOutlineText: {
    color: colors.inkPrimary,
    fontWeight: "700",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: spacing.md,
    gap: 10,
  },
  categoryTag: {
    alignSelf: "flex-start",
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  categoryTagText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  serviceTitle: {
    fontSize: 20,
    lineHeight: 27,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  scoreBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scoreBoxText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  verdictText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  ratingMetaText: {
    fontSize: 12.5,
    color: colors.inkSubtle,
    flex: 1,
  },
  infoLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  infoLineText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.inkBody,
  },
  providerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    gap: 10,
  },
  providerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  providerIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },
  providerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  providerName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.inkPrimary,
    flexShrink: 1,
  },
  providerSub: {
    fontSize: 11.5,
    color: colors.inkSubtle,
    marginTop: 1,
  },
  phoneBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },
  escrowPolicyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 16,
    padding: spacing.md,
  },
  escrowPolicyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#065F46",
  },
  escrowPolicyDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    color: "#047857",
  },
  sectionHeaderInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  sectionTitle: {
    fontSize: 16.5,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  amenityChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.md,
  },
  amenityChipText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.inkBody,
  },
  policyGroup: {
    gap: 6,
    marginTop: 4,
  },
  policyGroupLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  policyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  policyRowText: {
    flex: 1,
    fontSize: 13,
    color: colors.inkBody,
    lineHeight: 19,
  },
  roomsList: {
    gap: 10,
  },
  roomCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    padding: 12,
    gap: 6,
  },
  roomCardActive: {
    borderColor: colors.brandPrimary,
    backgroundColor: "#F0F9FF",
  },
  roomTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  roomName: {
    fontSize: 14.5,
    fontWeight: "700",
    color: colors.inkPrimary,
    flex: 1,
  },
  roomPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  roomMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  roomMetaText: {
    fontSize: 12,
    color: colors.inkSubtle,
  },
  roomDesc: {
    fontSize: 12.5,
    color: colors.inkBody,
    lineHeight: 18,
  },
  roomFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  roomSelectHint: {
    fontSize: 11.5,
    fontWeight: "600",
    color: colors.inkSubtle,
  },
  roomDetailLink: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  timelineList: {
    gap: 12,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  dayBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  dayBadgeText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  timelineBody: {
    flex: 1,
    gap: 3,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  timelineDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkBody,
  },
  slotsRow: {
    gap: 8,
  },
  slotCard: {
    minWidth: 112,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
  },
  slotCardActive: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
  slotCardSoldOut: {
    opacity: 0.45,
  },
  slotDate: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  slotPrice: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  slotTextActive: {
    color: "#FFFFFF",
  },
  slotRemain: {
    fontSize: 11,
    color: colors.inkBody,
  },
  slotRemainActive: {
    fontSize: 11,
    color: "#FFFFFF",
  },
  descText: {
    fontSize: 13.5,
    lineHeight: 21,
    color: colors.inkBody,
  },
  expandLink: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  bottomPriceCol: {
    flex: 1,
  },
  bottomPriceLabel: {
    fontSize: 11.5,
    color: colors.inkSubtle,
  },
  bottomPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  bottomPriceValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  bottomPriceUnit: {
    fontSize: 12,
    color: colors.inkSubtle,
  },
  bottomDepositHint: {
    fontSize: 11,
    fontWeight: "600",
    color: "#059669",
    marginTop: 1,
  },
  bottomStrikePrice: {
    fontSize: 12,
    color: colors.inkSubtle,
    textDecorationLine: "line-through",
  },
  promoPolicyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
    borderRadius: 16,
    padding: spacing.md,
  },
  promoHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  promoPolicyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#9F1239",
    flex: 1,
  },
  promoPill: {
    backgroundColor: "#E11D48",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  promoPillText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  promoPolicyDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    color: "#BE123C",
  },
  policiesList: {
    gap: 8,
  },
  policyItemCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 10,
    gap: 4,
  },
  policyItemTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  policyItemName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.inkPrimary,
    flex: 1,
  },
  policyCatChip: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  policyCatChipText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  policyItemDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.inkBody,
  },
  bookBtn: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 22,
    minHeight: touchTarget.minHeight,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  bookBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
