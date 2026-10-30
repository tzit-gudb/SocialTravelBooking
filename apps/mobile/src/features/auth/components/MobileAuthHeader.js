import React from "react";
import { StyleSheet, View } from "react-native";
import AppText from "../../../components/common/AppText";
import { colors, spacing } from "../../../theme/tokens";

/**
 * Tiêu đề màn hình Đăng nhập & Đăng ký Mobile
 */
export default function MobileAuthHeader({ mode = "login" }) {
  const isRegister = mode === "register";

  return (
    <View style={styles.headerContainer}>
      <AppText style={styles.welcomeText}>
        {isRegister ? "Khởi tạo tài khoản cùng" : "Chào mừng đến với"}
      </AppText>

      <AppText isLogo style={styles.logoText}>
        Social Travel Booking
      </AppText>

      <AppText style={styles.subtitleText}>
        {isRegister
          ? "Đăng ký để bắt đầu hành trình khám phá của bạn"
          : "Đăng nhập để bắt đầu hành trình khám phá của bạn"}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    marginBottom: spacing.xl,
    alignItems: "center",
    textAlign: "center",
  },
  welcomeText: {
    fontSize: 14,
    color: colors.inkSubtle,
    fontWeight: "500",
    marginBottom: 4,
    textAlign: "center",
  },
  logoText: {
    fontSize: 27,
    lineHeight: 38,
    paddingTop: 6,
    color: colors.brandPrimary,
    fontWeight: "700",
    letterSpacing: -0.4,
    marginBottom: spacing.xs + 2,
    textAlign: "center",
  },
  subtitleText: {
    fontSize: 14,
    color: colors.inkBody,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
});
