import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react-native";
import AppText from "../../../components/common/AppText";
import { usePendingBooking } from "../../../context/PendingBookingContext";
import { useAuth } from "../../../hooks/useAuth";
import { colors, radius, spacing } from "../../../theme/tokens";
import { formatCurrencyVnd } from "../../explore/models/exploreModel";
import CancelBookingModal from "../components/CancelBookingModal";
import { formatCountdown, getHoldRemainingSeconds } from "../models/bookingModel";
import bookingService from "../services/bookingService";

/**
 * Màn hình Thanh toán VietQR Sepay:
 * - Hiển thị mã QR động + thông tin chuyển khoản thủ công + đếm ngược giữ chỗ 10 phút.
 * - Tự động polling kiểm tra trạng thái thanh toán mỗi 4 giây.
 * - Nút Back hỏi xác nhận và đưa thẳng về Trang chủ (TouristMainTabs).
 * - Nút Hủy đơn mở bottom-sheet đính kèm lý do hủy.
 */
export default function SepayPaymentScreen({ navigation, route }) {
  const { isAuthenticated } = useAuth();
  const { setPendingBooking, clearPendingBooking } = usePendingBooking();

  const { bookingId, bookingCode, contactPhone, serviceName, depositAmount, paymentExpiresAt } =
    route?.params || {};

  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    getHoldRemainingSeconds(paymentExpiresAt),
  );
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [copiedField, setCopiedField] = useState("");
  const [downloadingQr, setDownloadingQr] = useState(false);

  const goHome = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: "TouristMainTabs" }],
    });
  }, [navigation]);

  const handleBackPress = useCallback(() => {
    if (isPaid) {
      goHome();
      return true;
    }

    Alert.alert(
      "Chưa hoàn tất thanh toán",
      "Bạn chưa thanh toán đơn hàng này. Đơn vẫn được giữ chỗ trong thời gian còn lại. Bạn có muốn trở về Trang chủ không?",
      [
        { text: "Ở lại thanh toán", style: "cancel" },
        {
          text: "Về trang chủ",
          style: "destructive",
          onPress: goHome,
        },
      ],
    );
    return true;
  }, [isPaid, goHome]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", handleBackPress);
    return () => sub.remove();
  }, [handleBackPress]);

  const loadQrPayment = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await bookingService.createSepayPayment({
        bookingId,
        bookingCode,
        contactPhone,
        isAuthenticated,
      });
      setQrData(data);
      if (data?.payment_expires_at) {
        setRemainingSeconds(getHoldRemainingSeconds(data.payment_expires_at));
        setPendingBooking({
          bookingId: data.booking_id || bookingId,
          bookingCode: data.booking_code || bookingCode,
          contactPhone: contactPhone || "",
          serviceName: serviceName || "Đơn đặt chỗ của bạn",
          depositAmount: data.amount ?? depositAmount ?? 0,
          paymentExpiresAt: data.payment_expires_at,
        });
      }
    } catch (err) {
      setError(err?.message || "Không thể khởi tạo mã QR thanh toán.");
    } finally {
      setLoading(false);
    }
  }, [
    bookingId,
    bookingCode,
    contactPhone,
    isAuthenticated,
    serviceName,
    depositAmount,
    setPendingBooking,
  ]);

  useEffect(() => {
    loadQrPayment();
  }, [loadQrPayment]);

  const expiresAt = qrData?.payment_expires_at || paymentExpiresAt;

  useEffect(() => {
    if (!expiresAt || isPaid) return undefined;

    const tick = () => {
      const secs = getHoldRemainingSeconds(expiresAt);
      setRemainingSeconds(secs);
      if (secs <= 0) {
        clearPendingBooking();
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, isPaid, clearPendingBooking]);

  const pollPaymentStatus = useCallback(
    async (manual = false) => {
      if (isPaid) return;
      if (manual) setChecking(true);

      try {
        const res = await bookingService.checkPaymentStatus({
          bookingId: qrData?.booking_id || bookingId,
          bookingCode: qrData?.booking_code || bookingCode,
          contactPhone,
          isAuthenticated,
        });

        if (res?.booking_status === "confirmed" || res?.payment_status === "paid") {
          setIsPaid(true);
          await clearPendingBooking();
          navigation.replace("PaymentSuccess", {
            bookingId: res.booking_id || bookingId,
            bookingCode: res.booking_code || bookingCode,
            contactPhone,
            serviceName: serviceName || "Dịch vụ du lịch",
            amount: res.amount ?? qrData?.amount ?? depositAmount,
          });
        } else if (res?.booking_status === "expired" || res?.booking_status === "cancelled") {
          await clearPendingBooking();
          setError("Đơn đặt chỗ đã hết hạn hoặc bị hủy.");
        } else if (manual) {
          Alert.alert(
            "Chưa ghi nhận giao dịch",
            "Hệ thống chưa nhận được thông báo chuyển khoản. Vui lòng chờ vài giây sau khi chuyển rồi thử lại.",
          );
        }
      } catch {
        if (manual) {
          Alert.alert("Lỗi kiểm tra", "Không thể kiểm tra trạng thái thanh toán lúc này.");
        }
      } finally {
        if (manual) setChecking(false);
      }
    },
    [
      isPaid,
      qrData?.booking_id,
      qrData?.booking_code,
      bookingId,
      bookingCode,
      contactPhone,
      isAuthenticated,
      clearPendingBooking,
      navigation,
      serviceName,
      qrData?.amount,
      depositAmount,
    ],
  );

  // Auto-polling mỗi 4 giây khi đang mở màn hình thanh toán
  useEffect(() => {
    if (loading || error || isPaid || remainingSeconds <= 0) return undefined;

    const interval = setInterval(() => {
      pollPaymentStatus(false);
    }, 4000);

    return () => clearInterval(interval);
  }, [loading, error, isPaid, remainingSeconds, pollPaymentStatus]);

  const handleCopyField = async (fieldKey, value) => {
    if (!value) return;
    try {
      await Clipboard.setStringAsync(String(value));
      setCopiedField(fieldKey);
      setTimeout(() => {
        setCopiedField((prev) => (prev === fieldKey ? "" : prev));
      }, 2000);
    } catch {
      Alert.alert("Không thể sao chép", "Vui lòng thử sao chép thủ công.");
    }
  };

  const handleDownloadQr = async () => {
    if (!qrData?.qr_url || downloadingQr) return;
    setDownloadingQr(true);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Cần quyền truy cập ảnh",
          "Vui lòng cấp quyền lưu ảnh để tải mã VietQR về thư viện.",
        );
        return;
      }

      const fileName = `sepay-qr-${qrData.transfer_content || Date.now()}.png`;
      const targetUri = `${FileSystem.cacheDirectory}${fileName}`;
      const downloaded = await FileSystem.downloadAsync(qrData.qr_url, targetUri);
      await MediaLibrary.saveToLibraryAsync(downloaded.uri);

      Alert.alert("Đã lưu ảnh QR", "Mã VietQR đã được lưu vào thư viện ảnh trên thiết bị.");
    } catch {
      Alert.alert("Không thể tải ảnh QR", "Vui lòng kiểm tra kết nối mạng và thử lại.");
    } finally {
      setDownloadingQr(false);
    }
  };

  const handleConfirmCancel = async (reason) => {
    setCancelling(true);
    try {
      if (isAuthenticated && (qrData?.booking_id || bookingId)) {
        await bookingService.cancelBooking(qrData?.booking_id || bookingId, reason);
      } else {
        await bookingService.cancelGuestBooking(
          qrData?.booking_code || bookingCode,
          contactPhone,
          reason,
        );
      }
      await clearPendingBooking();
      setCancelModalVisible(false);
      Alert.alert("Đã hủy đơn", "Đơn đặt chỗ của bạn đã được hủy thành công.", [
        { text: "Về trang chủ", onPress: goHome },
      ]);
    } catch (err) {
      Alert.alert("Không thể hủy đơn", err?.message || "Vui lòng thử lại sau.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable onPress={handleBackPress} style={styles.backBtn} accessibilityLabel="Quay lại">
          <ArrowLeft size={20} color={colors.inkPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText style={styles.headerTitle}>Thanh toán Sepay</AppText>
          <AppText style={styles.headerSub} numberOfLines={1}>
            Mã đơn: {qrData?.booking_code || bookingCode || "—"}
          </AppText>
        </View>
        {remainingSeconds > 0 && !isPaid ? (
          <View style={styles.timerBadge}>
            <Clock size={13} color="#B45309" />
            <AppText style={styles.timerText}>{formatCountdown(remainingSeconds)}</AppText>
          </View>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.brandPrimary} />
          <AppText style={styles.centerText}>Đang khởi tạo mã VietQR Sepay...</AppText>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <XCircle size={40} color="#E11D48" />
          <AppText style={styles.errorTitle}>Không thể thanh toán</AppText>
          <AppText style={styles.centerText}>{error}</AppText>
          <Pressable style={styles.primaryBtn} onPress={goHome}>
            <AppText style={styles.primaryBtnText}>Về trang chủ</AppText>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {isPaid ? (
              <View style={styles.successCard}>
                <CheckCircle2 size={42} color="#059669" />
                <AppText style={styles.successTitle}>Thanh toán đã được xác nhận!</AppText>
                <AppText style={styles.successDesc}>
                  Cảm ơn bạn đã thanh toán. Đơn đặt chỗ của bạn đã sẵn sàng.
                </AppText>
              </View>
            ) : (
              <>
                <View style={styles.qrCard}>
                  <AppText style={styles.qrTitle}>Quét mã VietQR bằng App Ngân hàng</AppText>
                  <AppText style={styles.qrAmount}>
                    {formatCurrencyVnd(qrData?.amount ?? depositAmount)}
                  </AppText>

                  <View style={styles.qrFrame}>
                    <Image
                      source={{ uri: qrData?.qr_url }}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                  </View>

                  <Pressable
                    style={[styles.downloadQrBtn, downloadingQr && { opacity: 0.7 }]}
                    onPress={handleDownloadQr}
                    disabled={downloadingQr}
                  >
                    {downloadingQr ? (
                      <ActivityIndicator size="small" color={colors.brandPrimary} />
                    ) : (
                      <>
                        <Download size={15} color={colors.brandPrimary} />
                        <AppText style={styles.downloadQrText}>Tải ảnh QR về máy</AppText>
                      </>
                    )}
                  </Pressable>
                </View>

                <View style={styles.infoCard}>
                  <View style={styles.infoHeader}>
                    <AppText style={styles.infoTitle}>Thông tin chuyển khoản thủ công</AppText>
                  </View>

                  <View style={styles.infoRow}>
                    <AppText style={styles.infoLabel}>Ngân hàng</AppText>
                    <AppText style={styles.infoVal}>{qrData?.bank_code}</AppText>
                  </View>

                  <View style={styles.infoRow}>
                    <AppText style={styles.infoLabel}>Số tài khoản</AppText>
                    <View style={styles.infoValueAction}>
                      <AppText style={styles.infoVal}>{qrData?.account_number}</AppText>
                      <Pressable
                        style={styles.inlineCopyBtn}
                        onPress={() => handleCopyField("account_number", qrData?.account_number)}
                        hitSlop={6}
                      >
                        {copiedField === "account_number" ? (
                          <Check size={13} color="#059669" />
                        ) : (
                          <Copy size={13} color={colors.brandPrimary} />
                        )}
                        <AppText
                          style={[
                            styles.inlineCopyText,
                            copiedField === "account_number" && { color: "#059669" },
                          ]}
                        >
                          {copiedField === "account_number" ? "Đã chép" : "Chép"}
                        </AppText>
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <AppText style={styles.infoLabel}>Chủ tài khoản</AppText>
                    <AppText style={styles.infoVal}>{qrData?.account_name}</AppText>
                  </View>

                  <View style={styles.infoRow}>
                    <AppText style={styles.infoLabel}>Số tiền chính xác</AppText>
                    <View style={styles.infoValueAction}>
                      <AppText style={[styles.infoVal, { color: "#E11D48" }]}>
                        {formatCurrencyVnd(qrData?.amount)}
                      </AppText>
                      <Pressable
                        style={styles.inlineCopyBtn}
                        onPress={() =>
                          handleCopyField("amount", String(Math.round(Number(qrData?.amount || 0))))
                        }
                        hitSlop={6}
                      >
                        {copiedField === "amount" ? (
                          <Check size={13} color="#059669" />
                        ) : (
                          <Copy size={13} color={colors.brandPrimary} />
                        )}
                        <AppText
                          style={[
                            styles.inlineCopyText,
                            copiedField === "amount" && { color: "#059669" },
                          ]}
                        >
                          {copiedField === "amount" ? "Đã chép" : "Chép"}
                        </AppText>
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <AppText style={styles.infoLabel}>Nội dung CK</AppText>
                    <View style={styles.infoValueAction}>
                      <AppText style={[styles.infoVal, { color: colors.brandPrimary }]}>
                        {qrData?.transfer_content}
                      </AppText>
                      <Pressable
                        style={styles.inlineCopyBtn}
                        onPress={() =>
                          handleCopyField("transfer_content", qrData?.transfer_content)
                        }
                        hitSlop={6}
                      >
                        {copiedField === "transfer_content" ? (
                          <Check size={13} color="#059669" />
                        ) : (
                          <Copy size={13} color={colors.brandPrimary} />
                        )}
                        <AppText
                          style={[
                            styles.inlineCopyText,
                            copiedField === "transfer_content" && { color: "#059669" },
                          ]}
                        >
                          {copiedField === "transfer_content" ? "Đã chép" : "Chép"}
                        </AppText>
                      </Pressable>
                    </View>
                  </View>
                </View>

                <View style={styles.escrowNote}>
                  <ShieldCheck size={16} color={colors.brandPrimary} />
                  <AppText style={styles.escrowNoteText}>
                    Giữ nguyên nội dung chuyển khoản{" "}
                    <AppText style={{ fontWeight: "700" }}>{qrData?.transfer_content}</AppText> để
                    hệ thống tự động xác nhận đơn ngay lập tức.
                  </AppText>
                </View>

                <View style={styles.noticeCard}>
                  <AppText style={styles.noticeTitle}>Lưu ý dành cho khách hàng</AppText>
                  <AppText style={styles.noticeItem}>
                    • Nếu bạn đã chuyển khoản thành công, vui lòng chờ trong vòng{" "}
                    <AppText style={{ fontWeight: "700" }}>10 – 30 giây</AppText> để hệ thống tự
                    động đối soát và xác nhận đơn hàng của bạn.
                  </AppText>
                  <AppText style={styles.noticeItem}>
                    • Bạn cũng có thể bấm nút{" "}
                    <AppText style={{ fontWeight: "700" }}>&quot;Tôi đã chuyển khoản&quot;</AppText>{" "}
                    bên dưới để kiểm tra trạng thái ngay lập tức.
                  </AppText>
                  <AppText style={styles.noticeItem}>
                    • Nếu quá 2 phút vẫn chưa thấy đơn chuyển sang Đã xác nhận, vui lòng giữ lại ảnh
                    chụp biên lai giao dịch và liên hệ bộ phận hỗ trợ.
                  </AppText>
                </View>
              </>
            )}
          </ScrollView>

          {!isPaid ? (
            <View style={styles.bottomBar}>
              <Pressable style={styles.cancelBtn} onPress={() => setCancelModalVisible(true)}>
                <AppText style={styles.cancelBtnText}>Hủy đơn hàng</AppText>
              </Pressable>

              <Pressable
                style={[styles.checkBtn, checking && { opacity: 0.7 }]}
                onPress={() => pollPaymentStatus(true)}
                disabled={checking}
              >
                {checking ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <RefreshCw size={16} color="#FFFFFF" />
                    <AppText style={styles.checkBtnText}>Tôi đã chuyển khoản</AppText>
                  </>
                )}
              </Pressable>
            </View>
          ) : null}
        </>
      )}

      <CancelBookingModal
        visible={cancelModalVisible}
        bookingCode={qrData?.booking_code || bookingCode}
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
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  timerText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#B45309",
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
    fontSize: 16.5,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  primaryBtn: {
    marginTop: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.brandPrimary,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  successCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: spacing.lg,
    alignItems: "center",
    gap: 10,
  },
  successTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#047857",
  },
  successDesc: {
    fontSize: 13.5,
    color: "#065F46",
    textAlign: "center",
  },
  qrCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: spacing.md,
    alignItems: "center",
    gap: 8,
  },
  qrTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  qrAmount: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  qrFrame: {
    width: 220,
    height: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  qrImage: {
    width: "100%",
    height: "100%",
  },
  downloadQrBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9999,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    marginTop: 4,
  },
  downloadQrText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: spacing.md,
    gap: 10,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  infoVal: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  infoValueAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inlineCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  inlineCopyText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  escrowNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0F9FF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    padding: 12,
  },
  escrowNoteText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: "#0369A1",
  },
  noticeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: spacing.md,
    gap: 6,
  },
  noticeTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.inkPrimary,
    marginBottom: 2,
  },
  noticeItem: {
    fontSize: 12.5,
    lineHeight: 18.5,
    color: colors.inkBody,
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
  cancelBtn: {
    paddingHorizontal: 16,
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#FECDD3",
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#BE123C",
  },
  checkBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.brandPrimary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  checkBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
