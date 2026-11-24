import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { CalendarCheck2, Compass, QrCode, Search, ShieldCheck } from "lucide-react-native";
import AppText from "../../../components/common/AppText";
import Skeleton from "../../../components/common/Skeleton";
import { useAuth } from "../../../hooks/useAuth";
import { colors, radius, spacing } from "../../../theme/tokens";
import BookingCard from "../../booking/components/BookingCard";
import { BOOKING_STATUS_FILTERS } from "../../booking/models/bookingModel";
import bookingService from "../../booking/services/bookingService";

function BookingSkeletonList() {
  return (
    <View style={styles.listContent}>
      {[1, 2, 3].map((idx) => (
        <View key={idx} style={styles.skeletonCard}>
          <View style={styles.skeletonTopRow}>
            <Skeleton width={120} height={14} borderRadius={6} />
            <Skeleton width={88} height={22} borderRadius={999} />
          </View>
          <View style={styles.skeletonMainRow}>
            <Skeleton width={78} height={78} borderRadius={12} />
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton width="88%" height={16} borderRadius={6} />
              <Skeleton width="55%" height={13} borderRadius={6} />
              <Skeleton width="70%" height={13} borderRadius={6} />
            </View>
          </View>
          <View style={styles.skeletonFooter}>
            <Skeleton width={110} height={18} borderRadius={6} />
            <Skeleton width={76} height={28} borderRadius={999} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Tab "Đặt chỗ" — Lịch sử đặt chỗ của Du khách & Tra cứu đơn cho Khách vãng lai.
 */
export default function BookingsTabScreen({ navigation }) {
  const isFocused = useIsFocused();
  const { isAuthenticated, user } = useAuth();

  const [selectedStatus, setSelectedStatus] = useState("all");
  const [bookings, setBookings] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  // State cho Khách vãng lai tra cứu đơn
  const [lookupCode, setLookupCode] = useState("");
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);

  const abortControllerRef = useRef(null);
  const lastFetchedRef = useRef({ status: null, timestamp: 0 });

  const fetchBookings = useCallback(
    async ({ page = 1, append = false, isRefresh = false, force = false } = {}) => {
      if (!isAuthenticated) return;

      const now = Date.now();
      const isSameFreshStatus =
        !force &&
        !append &&
        !isRefresh &&
        lastFetchedRef.current.status === selectedStatus &&
        now - lastFetchedRef.current.timestamp < 15000;

      if (isSameFreshStatus) {
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (isRefresh) {
        setRefreshing(true);
      } else if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError("");

      try {
        const result = await bookingService.getBookings({
          status: selectedStatus,
          page,
          perPage: 15,
          signal: controller.signal,
        });
        setMeta(result.meta);
        setBookings((prev) => (append ? [...prev, ...result.items] : result.items));
        if (!append) {
          lastFetchedRef.current = { status: selectedStatus, timestamp: Date.now() };
        }
      } catch (err) {
        if (err?.name === "AbortError") {
          return;
        }
        setError(err?.message || "Không thể tải danh sách đơn đặt chỗ.");
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [isAuthenticated, selectedStatus],
  );

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        fetchBookings({ page: 1, append: false, isRefresh: false });
      }
      return () => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
      };
    }, [isAuthenticated, fetchBookings]),
  );

  const handleLoadMore = () => {
    if (loading || loadingMore || refreshing) return;
    if (meta.current_page >= meta.last_page) return;
    fetchBookings({ page: meta.current_page + 1, append: true });
  };

  const handleOpenBookingDetail = (booking) => {
    navigation.navigate("BookingDetail", {
      bookingId: booking.id,
      bookingCode: booking.booking_code,
      initialBooking: booking,
    });
  };

  const handleGuestLookup = async () => {
    const code = lookupCode.trim().toUpperCase();
    const phone = lookupPhone.trim();

    if (!code || !phone) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập đầy đủ Mã đơn và Số điện thoại đã đặt chỗ.");
      return;
    }

    setLookupLoading(true);
    try {
      const booking = await bookingService.lookupGuestBooking(code, phone);
      if (booking) {
        navigation.navigate("BookingDetail", {
          bookingCode: booking.booking_code,
          contactPhone: phone,
          initialBooking: booking,
        });
      }
    } catch (err) {
      Alert.alert("Không tìm thấy đơn", err?.message || "Vui lòng kiểm tra lại mã đơn và SĐT.");
    } finally {
      setLookupLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {isFocused ? <StatusBar style="dark" /> : null}
        <View style={styles.header}>
          <AppText style={styles.headerTitle}>Đặt chỗ</AppText>
          <AppText style={styles.headerSub}>
            Quản lý lịch trình, cọc Escrow và vé QR check-in
          </AppText>
        </View>

        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.guestCard}>
            <View style={styles.iconCircle}>
              <CalendarCheck2 size={28} color={colors.brandPrimary} />
            </View>
            <AppText style={styles.cardTitle}>Theo dõi mọi chuyến đi tại một nơi</AppText>
            <AppText style={styles.cardDesc}>
              Đăng nhập để xem lịch sử đặt phòng, tour đã giữ chỗ, mã QR check-in và trạng thái bảo
              vệ tiền cọc Escrow 30%.
            </AppText>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => navigation.navigate("Auth", { initialMode: "login" })}
            >
              <AppText style={styles.primaryBtnText}>Đăng nhập ngay</AppText>
            </Pressable>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate("Auth", { initialMode: "register" })}
            >
              <AppText style={styles.secondaryBtnText}>Tạo tài khoản mới</AppText>
            </Pressable>
          </View>

          <View style={styles.lookupCard}>
            <View style={styles.lookupHeader}>
              <Search size={18} color={colors.brandPrimary} />
              <AppText style={styles.lookupTitle}>Tra cứu đơn Khách vãng lai</AppText>
            </View>
            <AppText style={styles.lookupDesc}>
              Đã đặt chỗ không cần tài khoản? Nhập Mã đơn và SĐT để kiểm tra trạng thái giữ chỗ.
            </AppText>

            <TextInput
              value={lookupCode}
              onChangeText={setLookupCode}
              placeholder="Mã đơn (VD: STB-20261124-XXXX)"
              autoCapitalize="characters"
              style={styles.input}
            />
            <TextInput
              value={lookupPhone}
              onChangeText={setLookupPhone}
              placeholder="Số điện thoại đặt chỗ"
              keyboardType="phone-pad"
              style={styles.input}
            />

            <Pressable
              style={[styles.lookupBtn, lookupLoading && { opacity: 0.7 }]}
              onPress={handleGuestLookup}
              disabled={lookupLoading}
            >
              {lookupLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <AppText style={styles.primaryBtnText}>Tra cứu đơn ngay</AppText>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {isFocused ? <StatusBar style="dark" /> : null}
      <View style={styles.header}>
        <AppText style={styles.headerTitle}>Đặt chỗ</AppText>
        <AppText style={styles.headerSub}>
          Xin chào {user?.name || "Du khách"} · {meta.total} đơn đặt chỗ
        </AppText>
      </View>

      <View style={styles.filterBarWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {BOOKING_STATUS_FILTERS.map((filter) => {
            const isActive = selectedStatus === filter.id;
            return (
              <Pressable
                key={filter.id}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setSelectedStatus(filter.id)}
              >
                <AppText style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {filter.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.listContainer}>
        {loading && bookings.length === 0 ? (
          <BookingSkeletonList />
        ) : error && bookings.length === 0 ? (
          <View style={styles.centerState}>
            <AppText style={styles.cardTitle}>Không thể tải dữ liệu</AppText>
            <AppText style={styles.cardDesc}>{error}</AppText>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => fetchBookings({ page: 1, append: false })}
            >
              <AppText style={styles.primaryBtnText}>Thử lại</AppText>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <BookingCard booking={item} onPress={handleOpenBookingDetail} />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchBookings({ page: 1, append: false, isRefresh: true })}
                tintColor={colors.brandPrimary}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.35}
            ListEmptyComponent={
              <View style={styles.loggedInWrap}>
                <View style={styles.emptyBookingsCard}>
                  <View style={styles.iconCircle}>
                    <QrCode size={26} color={colors.brandPrimary} />
                  </View>
                  <AppText style={styles.cardTitle}>
                    {selectedStatus === "all"
                      ? "Chưa có đơn đặt chỗ nào"
                      : "Không có đơn ở trạng thái này"}
                  </AppText>
                  <AppText style={styles.cardDesc}>
                    Hãy khám phá hàng loạt chỗ ở, tour du lịch và dịch vụ di chuyển đặc sắc trên
                    toàn quốc.
                  </AppText>
                  <Pressable
                    style={styles.primaryBtn}
                    onPress={() => navigation.navigate("SearchTab")}
                  >
                    <Compass size={17} color="#FFFFFF" />
                    <AppText style={styles.primaryBtnText}>Khám phá dịch vụ ngay</AppText>
                  </Pressable>
                </View>

                <View style={styles.infoNote}>
                  <ShieldCheck size={18} color={colors.brandPrimary} />
                  <AppText style={styles.infoNoteText}>
                    Mọi đơn đặt chỗ đều được cấp mã QR check-in riêng và bảo vệ cọc Escrow tự động.
                  </AppText>
                </View>
              </View>
            }
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={colors.brandPrimary} />
                </View>
              ) : null
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  bodyScroll: {
    flex: 1,
    backgroundColor: colors.surfaceBase,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.inkPrimary,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12.5,
    color: colors.inkBody,
    marginTop: 2,
  },
  filterBarWrap: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  filterScroll: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  filterChipActive: {
    borderColor: colors.brandPrimary,
    backgroundColor: "#E0F2FE",
  },
  filterText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.inkBody,
  },
  filterTextActive: {
    color: colors.brandPrimary,
    fontWeight: "700",
  },
  listContainer: {
    flex: 1,
    backgroundColor: colors.surfaceBase,
  },
  listContent: {
    padding: spacing.md,
    gap: 12,
    paddingBottom: 120,
  },
  content: {
    padding: spacing.md,
    gap: 16,
    paddingBottom: 120,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: 10,
  },
  stateText: {
    fontSize: 13.5,
    color: colors.inkBody,
  },
  guestCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: spacing.lg,
    alignItems: "center",
    gap: 12,
  },
  lookupCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: spacing.md,
    gap: 10,
  },
  lookupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lookupTitle: {
    fontSize: 15.5,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  lookupDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.inkBody,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.inkPrimary,
    backgroundColor: "#F8FAFC",
  },
  lookupBtn: {
    minHeight: 46,
    borderRadius: radius.lg,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  loggedInWrap: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  emptyBookingsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: spacing.lg,
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.inkPrimary,
    textAlign: "center",
  },
  cardDesc: {
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.inkBody,
    textAlign: "center",
  },
  primaryBtn: {
    width: "100%",
    minHeight: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.brandPrimary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  primaryBtnText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondaryBtn: {
    width: "100%",
    minHeight: 46,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  infoNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F0F9FF",
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  infoNoteText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: "#0369A1",
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
  },
  skeletonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: spacing.md,
    gap: 12,
  },
  skeletonTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  skeletonMainRow: {
    flexDirection: "row",
    gap: 12,
  },
  skeletonFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
});
