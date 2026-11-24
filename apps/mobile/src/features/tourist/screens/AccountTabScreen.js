import React from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useIsFocused } from "@react-navigation/native";
import {
  Bug,
  ChevronRight,
  Edit3,
  Heart,
  HelpCircle,
  LogOut,
  Shield,
  Sliders,
  Tag,
  UserCircle2,
  Wallet,
} from "lucide-react-native";
import AppText from "../../../components/common/AppText";
import { colors, radius, spacing, touchTarget } from "../../../theme/tokens";
import { useAuth } from "../../../hooks/useAuth";

function MenuRow({ icon: IconComp, label, subtitle, onPress, isLast = false }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        !isLast && styles.menuRowBorder,
        pressed && styles.menuRowPressed,
      ]}
      accessibilityRole="button"
    >
      <View style={styles.menuIconWrap}>
        <IconComp size={19} color={colors.brandPrimary} />
      </View>
      <View style={styles.menuTextCol}>
        <AppText style={styles.menuLabel}>{label}</AppText>
        {subtitle ? <AppText style={styles.menuSub}>{subtitle}</AppText> : null}
      </View>
      <ChevronRight size={18} color={colors.inkSubtle} />
    </Pressable>
  );
}

/**
 * Tab "Cá nhân" (Màn hình Cài đặt & Tài khoản):
 * - Luôn hiển thị đầy đủ các mục Cài đặt, Tiện ích & Trợ giúp cho cả Khách và Thành viên.
 * - Khi đã đăng nhập: hiển thị thẻ hồ sơ, nút "Chỉnh sửa thông tin cá nhân" (mở ProfileScreen) và nút "Đăng xuất".
 * - Khi chưa đăng nhập: khuyến khích Đăng nhập / Đăng ký.
 */
export default function AccountTabScreen({ navigation }) {
  const isFocused = useIsFocused();
  const { isAuthenticated, user, logout } = useAuth();

  const promptLoginForFeature = (title) => {
    Alert.alert(
      title,
      "Đăng nhập để đồng bộ dữ liệu cá nhân và sử dụng trọn vẹn tính năng này trên mọi thiết bị.",
      [
        { text: "Để sau", style: "cancel" },
        {
          text: "Đăng nhập",
          onPress: () => navigation.navigate("Auth", { initialMode: "login" }),
        },
      ],
    );
  };

  const openInfoNotice = (title, message) => {
    Alert.alert(title, message, [{ text: "Đã hiểu" }]);
  };

  const handleLogoutPress = () => {
    Alert.alert("Đăng xuất", "Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này không?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  };

  const displayName = user?.name || user?.display_name || "Du khách";
  const displayEmail = user?.email || "";
  const avatarUrl = user?.avatar_url || null;
  const avatarInitial = displayName.charAt(0).toUpperCase() || "D";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {isFocused ? <StatusBar style="dark" /> : null}
      <View style={styles.topHeader}>
        <AppText style={styles.topHeaderTitle}>Cá nhân & Cài đặt</AppText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {isAuthenticated ? (
          <View style={styles.profileSummaryCard}>
            <View style={styles.profileTopRow}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <AppText style={styles.avatarInitial}>{avatarInitial}</AppText>
                </View>
              )}

              <View style={{ flex: 1 }}>
                <AppText style={styles.profileName} numberOfLines={1}>
                  {displayName}
                </AppText>
                {displayEmail ? (
                  <AppText style={styles.profileEmail} numberOfLines={1}>
                    {displayEmail}
                  </AppText>
                ) : null}
                <View style={styles.memberBadge}>
                  <AppText style={styles.memberBadgeText}>Khách du lịch</AppText>
                </View>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.editProfileBtn, pressed && { opacity: 0.9 }]}
              onPress={() => navigation.navigate("Profile")}
            >
              <Edit3 size={16} color={colors.brandPrimary} />
              <AppText style={styles.editProfileBtnText}>Chỉnh sửa thông tin cá nhân</AppText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.authInviteCard}>
            <View style={styles.inviteHeader}>
              <View style={styles.guestAvatar}>
                <UserCircle2 size={32} color={colors.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={styles.inviteTitle}>
                  Chào mừng bạn đến với Social Travel Booking
                </AppText>
                <AppText style={styles.inviteDesc}>
                  Đăng nhập hoặc đăng ký để đặt chỗ nhanh, tích lũy ưu đãi và lưu địa điểm yêu
                  thích.
                </AppText>
              </View>
            </View>

            <View style={styles.authButtonsRow}>
              <Pressable
                style={styles.loginBtn}
                onPress={() => navigation.navigate("Auth", { initialMode: "login" })}
              >
                <AppText style={styles.loginBtnText}>Đăng nhập</AppText>
              </Pressable>
              <Pressable
                style={styles.registerBtn}
                onPress={() => navigation.navigate("Auth", { initialMode: "register" })}
              >
                <AppText style={styles.registerBtnText}>Đăng ký</AppText>
              </Pressable>
            </View>
          </View>
        )}

        {/* Nhóm 1: Tiện ích & Ưu đãi */}
        <AppText style={styles.groupHeading}>Tiện ích & Ưu đãi</AppText>
        <View style={styles.menuCard}>
          <MenuRow
            icon={Wallet}
            label="Quản lý Ví"
            subtitle="Theo dõi số dư hoàn tiền và giao dịch cọc Escrow"
            onPress={() =>
              isAuthenticated
                ? navigation.navigate("BookingsTab")
                : promptLoginForFeature("Quản lý Ví")
            }
          />
          <MenuRow
            icon={Heart}
            label="Danh sách đã lưu"
            subtitle="Các chỗ ở, tour và điểm đến bạn yêu thích"
            onPress={() =>
              isAuthenticated
                ? openInfoNotice(
                    "Danh sách đã lưu",
                    "Bạn có thể lưu các dịch vụ yêu thích ngay từ màn hình chi tiết dịch vụ.",
                  )
                : promptLoginForFeature("Danh sách đã lưu")
            }
          />
          <MenuRow
            icon={Tag}
            label="Ưu đãi"
            subtitle="Mã giảm giá thành viên và khuyến mãi theo mùa"
            onPress={() =>
              isAuthenticated
                ? openInfoNotice(
                    "Ưu đãi thành viên",
                    "Các mã giảm giá công khai và quà tặng riêng của bạn sẽ tự động hiển thị tại màn hình Thông tin đặt chỗ.",
                  )
                : openInfoNotice(
                    "Ưu đãi thành viên",
                    "Đăng nhập tài khoản để nhận mã giảm giá độc quyền cho chuyến đi đầu tiên.",
                  )
            }
            isLast
          />
        </View>

        {/* Nhóm 2: Cài đặt */}
        <AppText style={styles.groupHeading}>Cài đặt</AppText>
        <View style={styles.menuCard}>
          <MenuRow
            icon={Sliders}
            label="Cài đặt thiết bị"
            subtitle="Ngôn ngữ (Tiếng Việt), tiền tệ (VNĐ) và thông báo"
            onPress={() =>
              openInfoNotice(
                "Cài đặt thiết bị",
                "Ứng dụng hiện đang sử dụng ngôn ngữ Tiếng Việt và đơn vị tiền tệ VNĐ.",
              )
            }
            isLast
          />
        </View>

        {/* Nhóm 3: Trợ giúp */}
        <AppText style={styles.groupHeading}>Trợ giúp</AppText>
        <View style={styles.menuCard}>
          <MenuRow
            icon={HelpCircle}
            label="Liên hệ trợ giúp"
            subtitle="Tổng đài hỗ trợ du khách 24/7 qua email & hotline"
            onPress={() =>
              openInfoNotice(
                "Liên hệ trợ giúp",
                "Đội ngũ CSKH luôn sẵn sàng hỗ trợ qua email support@socialtravelbooking.vn.",
              )
            }
          />
          <MenuRow
            icon={Shield}
            label="Trung tâm thông tin về bảo mật"
            subtitle="Chính sách bảo vệ dữ liệu và ký quỹ Escrow an toàn"
            onPress={() =>
              openInfoNotice(
                "Trung tâm thông tin về bảo mật",
                "Mọi giao dịch thanh toán và thông tin cá nhân của bạn đều được mã hóa chuẩn bảo mật.",
              )
            }
          />
          <MenuRow
            icon={Bug}
            label="Báo cáo lỗi ứng dụng"
            subtitle="Gửi phản hồi kỹ thuật giúp chúng tôi cải thiện ứng dụng"
            onPress={() =>
              openInfoNotice(
                "Báo cáo lỗi ứng dụng",
                "Cảm ơn bạn! Vui lòng gửi mô tả sự cố về địa chỉ support@socialtravelbooking.vn.",
              )
            }
            isLast
          />
        </View>

        {isAuthenticated ? (
          <Pressable
            style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.85 }]}
            onPress={handleLogoutPress}
            accessibilityRole="button"
          >
            <LogOut size={18} color="#E11D48" />
            <AppText style={styles.logoutBtnText}>Đăng xuất</AppText>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  topHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  topHeaderTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.inkPrimary,
    letterSpacing: -0.3,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 120,
    backgroundColor: colors.surfaceBase,
  },
  profileSummaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: spacing.md,
    gap: 14,
    marginBottom: spacing.md,
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E0F2FE",
  },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E0F2FE",
    borderWidth: 1.5,
    borderColor: "#BAE6FD",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  profileName: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  profileEmail: {
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: 2,
  },
  memberBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 6,
  },
  memberBadgeText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  editProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 44,
    borderRadius: radius.lg,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  editProfileBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  authInviteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: spacing.md + 2,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  inviteHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm + 4,
  },
  guestAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },
  inviteTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.inkPrimary,
    lineHeight: 22,
  },
  inviteDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkBody,
    marginTop: 4,
  },
  authButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  loginBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.lg,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  loginBtnText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  registerBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.lg,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    alignItems: "center",
    justifyContent: "center",
  },
  registerBtnText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  groupHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.inkSubtle,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: spacing.sm + 2,
    marginBottom: spacing.xs + 2,
    paddingHorizontal: 4,
  },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: touchTarget.minHeight + 10,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  menuRowPressed: {
    backgroundColor: "#F8FAFC",
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F0F9FF",
    alignItems: "center",
    justifyContent: "center",
  },
  menuTextCol: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14.5,
    fontWeight: "600",
    color: colors.inkPrimary,
  },
  menuSub: {
    fontSize: 12,
    color: colors.inkSubtle,
    marginTop: 2,
  },
  logoutBtn: {
    marginTop: spacing.md,
    minHeight: 48,
    borderRadius: radius.lg,
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoutBtnText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#E11D48",
  },
});
