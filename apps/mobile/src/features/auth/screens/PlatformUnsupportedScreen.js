import React, { useState } from "react";
import { StyleSheet, View, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppText from "../../../components/common/AppText";
import { colors, spacing, radius, touchTarget } from "../../../theme/tokens";
import { useAuth } from "../../../hooks/useAuth";

/**
 * Màn hình thông báo Giới hạn Nền tảng (404 Role Guard) trên Mobile:
 * - Dòng mã 404 thuần, thiết kế tối giản, không icon rườm rà
 * - Xuất hiện khi tài khoản Đăng nhập là Admin hoặc Provider (chỉ hỗ trợ trên Web)
 * - Nút "Quay lại" kích hoạt đăng xuất và trả về màn hình đăng nhập
 * - Tuân thủ quy chuẩn Single Responsibility & dưới 150 dòng code (< 150 lines)
 */
export default function PlatformUnsupportedScreen() {
  const { user, role, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const getRoleDisplayName = (r) => {
    if (r === "provider") return "Nhà cung cấp dịch vụ";
    if (r === "admin") return "Quản trị viên";
    return "vai trò này";
  };

  const handleBackAndLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      // Bỏ qua lỗi nếu có
    } finally {
      setIsLoggingOut(false);
    }
  };

  const roleLabel = getRoleDisplayName(role);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Bọc nội dung chính vào View để căn giữa */}
        <View style={styles.mainContent}>
          {/* 1. Logo */}
          <View style={styles.header}>
            <AppText isLogo style={styles.logoText}>
              Social Travel Booking
            </AppText>
          </View>

          {/* 2. Dòng 404 */}
          <AppText style={styles.number404}>404</AppText>

          {/* 3. Tiêu đề và Mô tả */}
          <AppText style={styles.title}>Nền tảng hiện chưa hỗ trợ cho {roleLabel}</AppText>
          <AppText style={styles.description}>
            Ứng dụng di động Social Travel Booking hiện tại chỉ dành cho{" "}
            <AppText style={styles.highlightText}>Khách du lịch</AppText>.{"\n\n"}
            Vui lòng sử dụng máy tính truy cập Cổng thông tin Quản lý trên trình duyệt Web để điều
            hành dịch vụ với tài khoản {user?.email || "của bạn"}.
          </AppText>

          {/* 4. Nút Quay lại */}
          <Pressable
            style={({ pressed }) => [
              styles.backBtn,
              pressed && styles.backBtnPressed,
              isLoggingOut && styles.backBtnDisabled,
            ]}
            onPress={handleBackAndLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <AppText style={styles.backBtnText}>Quay lại</AppText>
            )}
          </Pressable>
        </View>

        {/* 5. Bản quyền tự động nằm sát đáy */}
        <AppText style={styles.copyrightText}>© 2026 Social Travel Booking</AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surfaceElevated },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg + 4,
    paddingVertical: spacing.xl,
  },
  mainContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  header: { marginBottom: spacing.xl, alignItems: "center" },
  logoText: {
    fontSize: 26,
    lineHeight: 36,
    paddingTop: 4,
    color: colors.brandPrimary,
    fontWeight: "700",
  },
  number404: {
    fontSize: 72,
    lineHeight: 84,
    fontWeight: "900",
    color: colors.brandPrimary,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.inkPrimary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.inkBody,
    textAlign: "center",
    marginBottom: spacing.xl,
    maxWidth: 320,
  },
  highlightText: { fontWeight: "700", color: colors.inkPrimary },
  backBtn: {
    width: "100%",
    minHeight: touchTarget.minHeight,
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.brandPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  backBtnPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  backBtnDisabled: { opacity: 0.6 },
  backBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  copyrightText: {
    fontSize: 11,
    color: colors.inkSubtle,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});
