import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Info,
  PawPrint,
  ShieldCheck,
  Tag,
  X,
} from "lucide-react-native";
import AppText from "../../../components/common/AppText";
import { usePendingBooking } from "../../../context/PendingBookingContext";
import { useSearchFilters } from "../../../context/SearchFilterContext";
import { useAuth } from "../../../hooks/useAuth";
import apiClient from "../../../lib/apiClient";
import { colors, radius, spacing } from "../../../theme/tokens";
import ExploreDatePickerModal, {
  formatCompactDateVi,
  formatFullDateVi,
} from "../../explore/components/ExploreDatePickerModal";
import { formatCurrencyVnd } from "../../explore/models/exploreModel";
import NumericStepper from "../components/NumericStepper";
import bookingService from "../services/bookingService";

function parseIsoToLocalDate(isoStr) {
  if (!isoStr) return null;
  const parts = String(isoStr).slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function toLocalIsoDate(dateObj) {
  if (!dateObj) return "";
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysLocal(baseDate, days) {
  const next = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Màn hình Thông tin đặt chỗ toàn màn hình (thay thế QuickBookingModal):
 * - Tự động điền sẵn bộ lọc từ Tìm kiếm (ngày đi/về, số lượng, người lớn, trẻ em).
 * - Chọn ngày bằng Lịch ExploreDatePickerModal với ràng buộc không xung đột ngày đi - ngày về.
 * - Nhập số lượng bằng NumericStepper (>= 1), Chỗ ở tách riêng Người lớn & Trẻ em.
 * - Hiển thị Chính sách thực thi (giờ nhận/trả phòng, quy tắc hoàn hủy, trẻ em, thú cưng).
 */
export default function BookingCheckoutScreen({ navigation, route }) {
  const { user, isAuthenticated } = useAuth();
  const { setPendingBooking } = usePendingBooking();
  const { searchFilters, updateSearchFilters } = useSearchFilters();

  const service = route?.params?.service || null;
  const selectedRoom = route?.params?.selectedRoom || null;
  const selectedSlot = route?.params?.selectedSlot || null;

  const isStay = service?.type === "hotel" || service?.type === "homestay";
  const isTrain =
    service?.type === "train" ||
    String(service?.category?.slug || "")
      .toLowerCase()
      .includes("tau") ||
    String(service?.category?.name || "")
      .toLowerCase()
      .includes("vé tàu");
  const isVehicle = service?.type === "vehicle" && !isTrain;
  const needsEndDate = isStay || isVehicle;

  const datePickerCategory = isStay
    ? "accommodation"
    : isVehicle
      ? "vehicle"
      : isTrain
        ? "train"
        : "entertainment";

  const initialDates = useMemo(() => {
    const today = startOfToday();
    const defaultStart = addDaysLocal(today, 1);

    const slotDate = parseIsoToLocalDate(selectedSlot?.available_date);
    const filterStart = parseIsoToLocalDate(searchFilters.startDate);
    let sDate = slotDate || (filterStart && filterStart >= today ? filterStart : defaultStart);

    const filterEnd = parseIsoToLocalDate(searchFilters.endDate);
    let eDate = null;
    if (needsEndDate) {
      if (isStay) {
        eDate = filterEnd && filterEnd > sDate ? filterEnd : addDaysLocal(sDate, 1);
      } else {
        eDate = filterEnd && filterEnd >= sDate ? filterEnd : sDate;
      }
    }

    return { startDate: sDate, endDate: eDate };
  }, [selectedSlot, searchFilters.startDate, searchFilters.endDate, needsEndDate, isStay]);

  const [startDate, setStartDate] = useState(initialDates.startDate);
  const [endDate, setEndDate] = useState(initialDates.endDate);
  const [dateModalOpen, setDateModalOpen] = useState(false);

  const [quantity, setQuantity] = useState(() => Math.max(1, searchFilters.quantity || 1));
  const [numAdults, setNumAdults] = useState(() => Math.max(1, searchFilters.numAdults || 2));
  const [numChildren, setNumChildren] = useState(() => Math.max(0, searchFilters.numChildren || 0));

  const [couponCode, setCouponCode] = useState("");
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [depositRate, setDepositRate] = useState(null);

  const resolvedUserPhone =
    user?.tourist_profile?.phone_number || user?.phone_number || user?.phone || "";
  const resolvedUserName = user?.name || user?.tourist_profile?.name || user?.display_name || "";

  const [contactName, setContactName] = useState(resolvedUserName);
  const [contactPhone, setContactPhone] = useState(resolvedUserPhone);
  const [contactEmail, setContactEmail] = useState(user?.email || "");
  const [specialRequests, setSpecialRequests] = useState("");

  useEffect(() => {
    if (!user) return;
    if (!contactName && resolvedUserName) setContactName(resolvedUserName);
    if (!contactPhone && resolvedUserPhone) setContactPhone(resolvedUserPhone);
    if (!contactEmail && user.email) setContactEmail(user.email);
  }, [user, resolvedUserName, resolvedUserPhone, contactName, contactPhone, contactEmail]);

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const previewEndpoint = isAuthenticated
    ? "/tourist/bookings/preview"
    : "/public/bookings/preview";
  const createEndpoint = isAuthenticated ? "/tourist/bookings" : "/public/bookings";

  const startIso = toLocalIsoDate(startDate);
  const endIso = needsEndDate ? toLocalIsoDate(endDate) : "";

  useEffect(() => {
    let mounted = true;
    bookingService
      .getAvailableCoupons(isAuthenticated)
      .then((list) => {
        if (mounted) setAvailableCoupons(list);
      })
      .catch(() => {
        if (mounted) setAvailableCoupons([]);
      });
    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!service?.id) return undefined;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewError("");
      try {
        const res = await apiClient.post(previewEndpoint, {
          service_id: service.id,
          room_type_id: selectedRoom?.id || undefined,
          start_date: startIso,
          end_date: needsEndDate ? endIso : undefined,
          quantity,
          deposit_rate: depositRate !== null ? depositRate : undefined,
          coupon_code: couponCode.trim() || undefined,
          metadata: {
            num_adults: isStay ? numAdults : quantity,
            num_children: isStay ? numChildren : 0,
            has_pets: Boolean(searchFilters.hasPets),
          },
        });
        if (!cancelled) {
          setPreview(res?.data || null);
          if (depositRate === null && res?.data?.deposit_rate !== undefined) {
            setDepositRate(res.data.deposit_rate);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setPreview(null);
          setPreviewError(err?.message || "Không thể tính giá cho lựa chọn này.");
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    service?.id,
    selectedRoom?.id,
    startIso,
    endIso,
    needsEndDate,
    quantity,
    numAdults,
    numChildren,
    isStay,
    depositRate,
    couponCode,
    previewEndpoint,
    searchFilters.hasPets,
  ]);

  const handleApplyDates = ({ startDate: nextStart, endDate: nextEnd }) => {
    const today = startOfToday();
    const safeStart = nextStart && nextStart >= today ? nextStart : addDaysLocal(today, 1);
    let safeEnd = null;

    if (needsEndDate) {
      if (isStay) {
        safeEnd = nextEnd && nextEnd > safeStart ? nextEnd : addDaysLocal(safeStart, 1);
      } else {
        safeEnd = nextEnd && nextEnd >= safeStart ? nextEnd : safeStart;
      }
    }

    setStartDate(safeStart);
    setEndDate(safeEnd);
    setDateModalOpen(false);

    updateSearchFilters({
      startDate: safeStart,
      endDate: safeEnd || "",
    });
  };

  const handleSubmit = async () => {
    if (!contactName.trim() || !contactPhone.trim() || !contactEmail.trim()) {
      Alert.alert(
        "Thiếu thông tin liên hệ",
        "Vui lòng nhập đầy đủ Họ tên, Số điện thoại và Email để nhận xác nhận đặt chỗ.",
      );
      return;
    }

    if (previewError || !preview) {
      Alert.alert("Chưa thể đặt chỗ", previewError || "Vui lòng kiểm tra lại ngày và số lượng.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post(createEndpoint, {
        service_id: service.id,
        room_type_id: selectedRoom?.id || undefined,
        start_date: startIso,
        end_date: needsEndDate ? endIso : undefined,
        quantity,
        deposit_rate: depositRate !== null ? depositRate : preview.deposit_rate,
        coupon_code: couponCode.trim() || undefined,
        contact_name: contactName.trim(),
        contact_phone: contactPhone.trim(),
        contact_email: contactEmail.trim(),
        metadata: {
          num_adults: isStay ? numAdults : quantity,
          num_children: isStay ? numChildren : 0,
          has_pets: Boolean(searchFilters.hasPets),
          special_requests: specialRequests.trim() || undefined,
        },
      });

      const created = res?.data;
      if (created) {
        if (created.status === "pending_payment") {
          await setPendingBooking({
            bookingId: created.id,
            bookingCode: created.booking_code,
            contactPhone: created.contact_phone || contactPhone.trim(),
            serviceName: service.name,
            depositAmount: created.deposit_amount,
            paymentExpiresAt: created.payment_expires_at,
          });
          navigation.replace("SepayPayment", {
            bookingId: created.id,
            bookingCode: created.booking_code,
            contactPhone: created.contact_phone || contactPhone.trim(),
            serviceName: service.name,
            depositAmount: created.deposit_amount,
            paymentExpiresAt: created.payment_expires_at,
          });
        } else {
          navigation.replace("BookingDetail", {
            bookingId: created.id,
            bookingCode: created.booking_code,
            contactPhone: created.contact_phone || contactPhone.trim(),
            initialBooking: created,
          });
        }
      } else {
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert("Đặt chỗ không thành công", err?.message || "Vui lòng thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  };

  const policyRules = preview?.policy_rules || service?.policy_rules || null;
  const servicePolicies = Array.isArray(service?.policies) ? service.policies : [];

  const structuredPolicyItems = useMemo(() => {
    const items = [];
    if (policyRules?.checkin_time || policyRules?.checkout_time) {
      items.push({
        key: "checkin_checkout",
        icon: "clock",
        color: colors.brandPrimary,
        title: isStay
          ? `Nhận phòng từ ${policyRules.checkin_time || "14:00"} – Trả phòng trước ${policyRules.checkout_time || "12:00"}`
          : `Giao & nhận xe: ${policyRules.checkin_time || "07:00"} – ${policyRules.checkout_time || "21:00"}`,
        desc: isStay
          ? "Phòng tự động giải phóng sau giờ trả phòng theo quy định."
          : "Hỗ trợ bàn giao phương tiện đúng khung giờ đăng ký.",
      });
    }
    if (policyRules?.cancellation?.label) {
      items.push({
        key: "cancellation",
        icon: "shield",
        color: policyRules.cancellation.refundable ? "#059669" : "#E11D48",
        title: policyRules.cancellation.label,
        desc: policyRules.cancellation.description || "",
      });
    }
    if (policyRules?.children_policy?.label) {
      items.push({
        key: "children",
        icon: "info",
        color: colors.brandPrimary,
        title: policyRules.children_policy.label,
        desc: policyRules.children_policy.description || "",
      });
    }
    if (policyRules?.allow_pets !== null && policyRules?.allow_pets !== undefined) {
      items.push({
        key: "pets",
        icon: "paw",
        color: policyRules.allow_pets ? colors.brandPrimary : colors.inkMuted,
        title: policyRules.allow_pets
          ? policyRules.pets_surcharge
            ? "Cho phép mang theo thú cưng (có phụ thu vệ sinh)"
            : "Cho phép mang theo thú cưng"
          : "Không mang theo thú cưng",
        desc: "",
      });
    }
    if (policyRules?.arrival_notice_minutes) {
      items.push({
        key: "arrival",
        icon: "clock",
        color: colors.brandPrimary,
        title: `Có mặt trước giờ khởi hành ${policyRules.arrival_notice_minutes} phút`,
        desc: "",
      });
    }
    if (policyRules?.security_deposit_required) {
      items.push({
        key: "security_deposit",
        icon: "shield",
        color: "#D97706",
        title: "Yêu cầu xuất trình CCCD & đặt cọc thế chân khi nhận xe",
        desc: "",
      });
    }
    if (policyRules?.driver_license_required) {
      items.push({
        key: "driver_license",
        icon: "shield",
        color: "#D97706",
        title: "Yêu cầu bằng lái xe hợp lệ còn hiệu lực",
        desc: "",
      });
    }

    // Bổ sung các chính sách khác của dịch vụ (VD: Đặt cọc 30%, Không hút thuốc, Check-in QR, CCCD...)
    const coveredRuleKeys = new Set([
      "checkin_checkout",
      "cancellation",
      "children_policy",
      "pet_policy",
      "arrival_notice",
      "security_deposit",
      "driver_license",
    ]);

    servicePolicies.forEach((pol) => {
      if (pol.rule_key && coveredRuleKeys.has(pol.rule_key) && items.length > 0) {
        return;
      }
      const alreadyExists = items.some(
        (it) => it.title.toLowerCase() === String(pol.name || "").toLowerCase(),
      );
      if (!alreadyExists && pol.name) {
        items.push({
          key: `pol-${pol.id || pol.name}`,
          icon: "shield",
          color: colors.brandPrimary,
          title: pol.name,
          desc: pol.description || "",
        });
      }
    });

    return items;
  }, [policyRules, servicePolicies, isStay]);
  const maxQuantity = preview?.available_quantity
    ? Math.max(quantity, Math.min(20, preview.available_quantity))
    : 20;
  const maxAdults =
    isStay && selectedRoom?.capacity_adults ? selectedRoom.capacity_adults * quantity : 30;
  const maxChildren =
    isStay && selectedRoom?.capacity_children ? selectedRoom.capacity_children * quantity : 20;

  const quantityLabel = isStay
    ? "Số phòng"
    : isVehicle
      ? "Số phương tiện"
      : isTrain
        ? "Số vé tàu"
        : "Số lượng vé / khách";

  const dateSummaryText = needsEndDate
    ? `${formatCompactDateVi(startDate)} → ${formatCompactDateVi(endDate)}`
    : formatFullDateVi(startDate);

  const allowedRates = Array.isArray(preview?.allowed_deposit_rates)
    ? preview.allowed_deposit_rates
    : [100];

  if (!service) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerBox}>
          <AppText style={styles.errorText}>Không tìm thấy thông tin dịch vụ.</AppText>
          <Pressable style={styles.backFallbackBtn} onPress={() => navigation.goBack()}>
            <AppText style={styles.backFallbackText}>Quay lại</AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.inkPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText style={styles.headerTitle}>Thông tin đặt chỗ</AppText>
          <AppText style={styles.headerSub} numberOfLines={1}>
            {service.name}
            {isStay && selectedRoom ? ` · ${selectedRoom.name}` : ""}
          </AppText>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!isAuthenticated ? (
            <View style={styles.guestNotice}>
              <Info size={16} color="#0369A1" />
              <AppText style={styles.guestNoticeText}>
                Bạn đang đặt với tư cách Khách (không cần đăng nhập). Điền đầy đủ Họ tên, SĐT và
                Email để tra cứu đơn & nhận vé.
              </AppText>
            </View>
          ) : null}

          {/* 1. Chọn ngày bằng Lịch */}
          <View style={styles.card}>
            <AppText style={styles.sectionTitle}>Thời gian sử dụng dịch vụ</AppText>
            <Pressable style={styles.datePickerBtn} onPress={() => setDateModalOpen(true)}>
              <View style={styles.dateIconWrap}>
                <Calendar size={18} color={colors.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={styles.dateTinyLabel}>
                  {isStay
                    ? "Ngày nhận phòng – Ngày trả phòng"
                    : isVehicle
                      ? "Ngày nhận xe – Ngày trả xe"
                      : "Ngày khởi hành / sử dụng"}
                </AppText>
                <AppText style={styles.dateValueText}>{dateSummaryText}</AppText>
                {preview?.duration_units ? (
                  <AppText style={styles.dateSubText}>
                    {preview.duration_units} {isStay ? "đêm" : isVehicle ? "ngày" : "lượt"}
                    {preview.available_quantity !== null && preview.available_quantity !== undefined
                      ? ` · Còn ${preview.available_quantity} trống trong khoảng ngày này`
                      : ""}
                  </AppText>
                ) : null}
              </View>
              <AppText style={styles.changeText}>Đổi</AppText>
            </Pressable>

            {policyRules?.checkin_time || policyRules?.checkout_time ? (
              <View style={styles.policyHighlightRow}>
                <Clock size={14} color={colors.brandPrimary} />
                <AppText style={styles.policyHighlightText}>
                  {isStay
                    ? `Nhận phòng từ ${policyRules.checkin_time || "14:00"} · Trả phòng trước ${policyRules.checkout_time || "12:00"}`
                    : `Khung giờ giao nhận: ${policyRules.checkin_time || "07:00"} – ${policyRules.checkout_time || "21:00"}`}
                </AppText>
              </View>
            ) : null}
          </View>

          {/* 2. Số lượng & Số khách (Stepper +/-) */}
          <View style={styles.card}>
            <AppText style={styles.sectionTitle}>Số lượng & Hành khách</AppText>

            <NumericStepper
              label={quantityLabel}
              subtitle={
                preview?.available_quantity != null
                  ? `Tối đa ${preview.available_quantity} có sẵn trong ngày đã chọn`
                  : "Tối thiểu 1"
              }
              value={quantity}
              min={1}
              max={maxQuantity}
              onChange={(val) => {
                setQuantity(val);
                updateSearchFilters({ quantity: val });
              }}
            />

            {isStay ? (
              <>
                <View style={styles.thinDivider} />
                <NumericStepper
                  label="Người lớn"
                  subtitle={
                    selectedRoom?.capacity_adults
                      ? `Tối đa ${selectedRoom.capacity_adults} người lớn/phòng`
                      : "Từ 12 tuổi trở lên"
                  }
                  value={numAdults}
                  min={1}
                  max={maxAdults}
                  onChange={(val) => {
                    setNumAdults(val);
                    updateSearchFilters({ numAdults: val });
                  }}
                />
                <View style={styles.thinDivider} />
                <NumericStepper
                  label="Trẻ em"
                  subtitle={
                    policyRules?.children_policy?.label ||
                    (selectedRoom?.capacity_children
                      ? `Tối đa ${selectedRoom.capacity_children} trẻ em/phòng`
                      : "Dưới 12 tuổi")
                  }
                  value={numChildren}
                  min={0}
                  max={maxChildren}
                  onChange={(val) => {
                    setNumChildren(val);
                    updateSearchFilters({ numChildren: val });
                  }}
                />
              </>
            ) : null}
          </View>

          {/* 3. Chính sách áp dụng thực tế */}
          {structuredPolicyItems.length > 0 ? (
            <View style={styles.card}>
              <AppText style={styles.sectionTitle}>Chính sách áp dụng</AppText>
              <View style={styles.policyList}>
                {structuredPolicyItems.map((item) => (
                  <View key={item.key} style={styles.policyItem}>
                    {item.icon === "clock" ? (
                      <Clock size={15} color={item.color} style={{ marginTop: 2 }} />
                    ) : item.icon === "paw" ? (
                      <PawPrint size={15} color={item.color} style={{ marginTop: 2 }} />
                    ) : item.icon === "info" ? (
                      <Info size={15} color={item.color} style={{ marginTop: 2 }} />
                    ) : (
                      <ShieldCheck size={15} color={item.color} style={{ marginTop: 2 }} />
                    )}
                    <View style={{ flex: 1 }}>
                      <AppText style={styles.policyItemText}>{item.title}</AppText>
                      {item.desc ? (
                        <AppText style={styles.policyItemDesc}>{item.desc}</AppText>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* 4. Tỷ lệ thanh toán trước & Mã ưu đãi */}
          <View style={styles.card}>
            <AppText style={styles.sectionTitle}>Hình thức thanh toán & Ưu đãi</AppText>

            {allowedRates.length > 1 ? (
              <View style={styles.rateRow}>
                {allowedRates.map((rate) => {
                  const selected = (depositRate ?? preview?.deposit_rate) === rate;
                  const label =
                    rate === 0
                      ? "Trả tại chỗ (0%)"
                      : rate === 30
                        ? "Đặt cọc 30%"
                        : "Trả toàn bộ 100%";
                  return (
                    <Pressable
                      key={rate}
                      style={[styles.rateChip, selected && styles.rateChipActive]}
                      onPress={() => setDepositRate(rate)}
                    >
                      <AppText style={[styles.rateChipText, selected && styles.rateChipTextActive]}>
                        {label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <View style={styles.couponBox}>
              <Tag size={16} color={colors.brandPrimary} />
              <TextInput
                value={couponCode}
                onChangeText={setCouponCode}
                placeholder="Nhập mã giảm giá (nếu có)"
                autoCapitalize="characters"
                style={styles.couponInput}
              />
              {couponCode.trim().length > 0 ? (
                <Pressable
                  onPress={() => setCouponCode("")}
                  hitSlop={8}
                  accessibilityLabel="Xóa mã giảm giá"
                >
                  <X size={16} color={colors.inkMuted} />
                </Pressable>
              ) : null}
            </View>

            {availableCoupons.length > 0 ? (
              <View style={styles.couponSection}>
                <AppText style={styles.couponHint}>
                  Mã giảm giá hiện có (chọn 1 mã cho mỗi đơn):
                </AppText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.couponListScroll}
                >
                  {availableCoupons.map((cp) => {
                    const normalizedSelected = couponCode.trim().toUpperCase();
                    const isSelected = normalizedSelected === String(cp.code || "").toUpperCase();
                    const orderBase = Number(
                      preview?.subtotal != null
                        ? preview.subtotal - Number(preview?.promotion_discount_amount || 0)
                        : 0,
                    );
                    const minOrder = Number(cp.min_order_amount || 0);
                    const isEligible = orderBase === 0 || minOrder <= orderBase;
                    const discountLabel =
                      cp.type === "percent" || cp.type === "percentage"
                        ? `Giảm ${cp.discount_value}%`
                        : `Giảm ${formatCurrencyVnd(cp.discount_value)}`;

                    return (
                      <Pressable
                        key={cp.id || cp.code}
                        style={[
                          styles.couponCard,
                          isSelected && styles.couponCardActive,
                          !isEligible && styles.couponCardDisabled,
                        ]}
                        disabled={!isEligible}
                        onPress={() => {
                          if (!isEligible) return;
                          setCouponCode(isSelected ? "" : cp.code);
                        }}
                      >
                        <View style={styles.couponCardTop}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                            <AppText
                              style={[
                                styles.couponCardCode,
                                isSelected && styles.couponCardCodeActive,
                              ]}
                            >
                              {cp.code}
                            </AppText>
                            {cp.visibility === "private" ? (
                              <View style={styles.privateBadge}>
                                <AppText style={styles.privateBadgeText}>Quà tặng</AppText>
                              </View>
                            ) : null}
                          </View>
                          {isSelected ? <Check size={14} color={colors.brandPrimary} /> : null}
                        </View>
                        <AppText style={styles.couponCardDiscount}>{discountLabel}</AppText>
                        <AppText style={styles.couponCardCond} numberOfLines={1}>
                          {minOrder > 0
                            ? isEligible
                              ? `Đơn từ ${formatCurrencyVnd(minOrder)}`
                              : `Cần đơn từ ${formatCurrencyVnd(minOrder)}`
                            : "Áp dụng mọi đơn"}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}
          </View>

          {/* 5. Thông tin liên hệ */}
          <View style={styles.card}>
            <AppText style={styles.sectionTitle}>Thông tin liên hệ nhận vé *</AppText>
            <TextInput
              value={contactName}
              onChangeText={setContactName}
              placeholder="Họ và tên *"
              style={styles.input}
            />
            <TextInput
              value={contactPhone}
              onChangeText={setContactPhone}
              placeholder="Số điện thoại *"
              keyboardType="phone-pad"
              style={styles.input}
            />
            <TextInput
              value={contactEmail}
              onChangeText={setContactEmail}
              placeholder="Email *"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
            <TextInput
              value={specialRequests}
              onChangeText={setSpecialRequests}
              placeholder="Yêu cầu đặc biệt (tùy chọn, VD: nhận phòng muộn...)"
              multiline
              numberOfLines={2}
              style={[styles.input, { minHeight: 68, textAlignVertical: "top", paddingTop: 10 }]}
            />
          </View>

          {/* 6. Tóm tắt giá */}
          <View style={styles.card}>
            <AppText style={styles.sectionTitle}>Chi tiết giá</AppText>
            {previewLoading ? (
              <View style={styles.previewLoadingRow}>
                <ActivityIndicator size="small" color={colors.brandPrimary} />
                <AppText style={styles.previewLoadingText}>
                  Đang kiểm tra lịch trống & tính giá...
                </AppText>
              </View>
            ) : previewError ? (
              <View style={styles.errorBanner}>
                <AppText style={styles.errorBannerText}>{previewError}</AppText>
              </View>
            ) : preview ? (
              <>
                <View style={styles.priceRow}>
                  <AppText style={styles.priceLabel}>
                    Tạm tính ({quantity} × {preview.duration_units}{" "}
                    {isStay ? "đêm" : isVehicle ? "ngày" : "lượt"})
                  </AppText>
                  <AppText style={styles.priceVal}>{formatCurrencyVnd(preview.subtotal)}</AppText>
                </View>

                {Number(preview.promotion_discount_amount) > 0 ? (
                  <View style={styles.priceRow}>
                    <AppText style={styles.priceLabel}>Ưu đãi chiến dịch</AppText>
                    <AppText style={styles.discountVal}>
                      -{formatCurrencyVnd(preview.promotion_discount_amount)}
                    </AppText>
                  </View>
                ) : null}

                {Number(preview.coupon_discount_amount) > 0 ? (
                  <View style={styles.priceRow}>
                    <AppText style={styles.priceLabel}>Mã giảm giá</AppText>
                    <AppText style={styles.discountVal}>
                      -{formatCurrencyVnd(preview.coupon_discount_amount)}
                    </AppText>
                  </View>
                ) : null}

                <View style={styles.thinDivider} />

                <View style={styles.priceRow}>
                  <AppText style={styles.totalLabel}>Tổng thanh toán</AppText>
                  <AppText style={styles.totalVal}>
                    {formatCurrencyVnd(preview.total_amount)}
                  </AppText>
                </View>

                <View style={styles.priceRow}>
                  <AppText style={styles.priceLabel}>
                    Thanh toán trước ({preview.deposit_rate}%)
                  </AppText>
                  <AppText style={styles.depositVal}>
                    {formatCurrencyVnd(preview.deposit_amount)}
                  </AppText>
                </View>

                {Number(preview.remaining_amount) > 0 ? (
                  <View style={styles.priceRow}>
                    <AppText style={styles.priceLabel}>Trả khi nhận dịch vụ</AppText>
                    <AppText style={styles.priceVal}>
                      {formatCurrencyVnd(preview.remaining_amount)}
                    </AppText>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.bottomBar}>
        <View style={{ flex: 1 }}>
          <AppText style={styles.bottomLabel}>
            {preview ? `Cần thanh toán (${preview.deposit_rate}%)` : "Đang tính..."}
          </AppText>
          <AppText style={styles.bottomAmount}>
            {preview ? formatCurrencyVnd(preview.deposit_amount) : "—"}
          </AppText>
        </View>

        <Pressable
          style={[
            styles.submitBtn,
            (submitting || previewLoading || !preview || Boolean(previewError)) && {
              opacity: 0.55,
            },
          ]}
          onPress={handleSubmit}
          disabled={submitting || previewLoading || !preview || Boolean(previewError)}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <AppText style={styles.submitBtnText}>Xác nhận đặt chỗ</AppText>
          )}
        </Pressable>
      </View>

      <ExploreDatePickerModal
        visible={dateModalOpen}
        activeCategory={datePickerCategory}
        startDate={startDate}
        endDate={endDate}
        durationOption={null}
        onApply={handleApplyDates}
        onClose={() => setDateModalOpen(false)}
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
    fontSize: 17,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  headerSub: {
    fontSize: 12.5,
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
    paddingBottom: 28,
  },
  guestNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F0F9FF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    padding: 12,
  },
  guestNoticeText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: "#0369A1",
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
    fontSize: 15,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  datePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    backgroundColor: "#F0F9FF",
  },
  dateIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  dateTinyLabel: {
    fontSize: 11.5,
    color: colors.inkMuted,
  },
  dateValueText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: colors.inkPrimary,
    marginTop: 2,
  },
  dateSubText: {
    fontSize: 12,
    color: "#0369A1",
    marginTop: 2,
  },
  changeText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  policyHighlightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  policyHighlightText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.inkBody,
  },
  thinDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },
  policyList: {
    gap: 8,
  },
  policyItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  policyItemText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkPrimary,
    lineHeight: 18,
  },
  policyItemDesc: {
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 17,
    marginTop: 2,
  },
  rateRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  rateChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
  },
  rateChipActive: {
    borderColor: colors.brandPrimary,
    backgroundColor: "#E0F2FE",
  },
  rateChipText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.inkBody,
  },
  rateChipTextActive: {
    color: colors.brandPrimary,
    fontWeight: "700",
  },
  couponBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: "#F8FAFC",
  },
  couponInput: {
    flex: 1,
    fontSize: 13.5,
    color: colors.inkPrimary,
  },
  couponSection: {
    gap: 8,
    marginTop: 2,
  },
  couponHint: {
    fontSize: 12,
    color: colors.inkMuted,
    fontWeight: "600",
  },
  couponListScroll: {
    gap: 10,
    paddingVertical: 2,
  },
  couponCard: {
    minWidth: 156,
    maxWidth: 190,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    gap: 3,
  },
  couponCardActive: {
    borderColor: colors.brandPrimary,
    backgroundColor: "#E0F2FE",
  },
  couponCardDisabled: {
    opacity: 0.5,
  },
  couponCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  couponCardCode: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  couponCardCodeActive: {
    color: colors.brandPrimary,
  },
  privateBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 9999,
  },
  privateBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#B45309",
  },
  couponCardDiscount: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#E11D48",
  },
  couponCardCond: {
    fontSize: 11.5,
    color: colors.inkMuted,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.inkPrimary,
    backgroundColor: "#F8FAFC",
  },
  previewLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  previewLoadingText: {
    fontSize: 13,
    color: colors.inkBody,
  },
  errorBanner: {
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
    borderRadius: 12,
    padding: 10,
  },
  errorBannerText: {
    fontSize: 13,
    color: "#BE123C",
    fontWeight: "600",
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
    color: "#E11D48",
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  bottomLabel: {
    fontSize: 11.5,
    color: colors.inkMuted,
  },
  bottomAmount: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  submitBtn: {
    minHeight: 48,
    paddingHorizontal: 22,
    borderRadius: radius.lg,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 15,
    color: colors.inkBody,
  },
  backFallbackBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.brandPrimary,
  },
  backFallbackText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
