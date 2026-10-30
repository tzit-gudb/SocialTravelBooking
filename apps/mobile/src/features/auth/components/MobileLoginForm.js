import React from "react";
import { StyleSheet, View, TextInput, Pressable, ActivityIndicator } from "react-native";
import AppText from "../../../components/common/AppText";
import { colors, spacing, radius, touchTarget } from "../../../theme/tokens";
import MobileSocialAuthRow from "./MobileSocialAuthRow";

/**
 * Form Đăng nhập Mobile hoàn chỉnh:
 * - Email & Mật khẩu
 * - Cụm nút Social Login (Google, Apple, Facebook)
 * - Nút "Đăng nhập với tư cách khác?"
 * - Dòng Điều khoản pháp lý và Bản quyền ở dưới cùng
 */
export default function MobileLoginForm({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  fieldErrors = {},
  isSubmitting,
  onSubmit,
  onResetFeedback,
  onForgotPassword,
  onSwitchToRegister,
  onSwitchRole,
  onGoogleLogin,
  onAppleLogin,
  onFacebookLogin,
}) {
  return (
    <View style={styles.formContainer}>
      {/* Trường Email */}
      <View style={styles.inputGroup}>
        <AppText style={styles.label}>Email</AppText>
        <TextInput
          style={[styles.input, fieldErrors.email ? styles.inputError : null]}
          value={email}
          onChangeText={(val) => {
            setEmail(val);
            onResetFeedback?.();
          }}
          placeholder="tourist@example.com"
          placeholderTextColor={colors.inkSubtle}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {fieldErrors.email ? <AppText style={styles.errorText}>{fieldErrors.email}</AppText> : null}
      </View>

      {/* Trường Mật khẩu */}
      <View style={styles.inputGroup}>
        <View style={styles.labelRow}>
          <AppText style={styles.label}>Mật khẩu</AppText>
          <Pressable
            hitSlop={10}
            onPress={onForgotPassword}
            style={({ pressed }) => [pressed && styles.linkPressed]}
          >
            <AppText style={styles.forgotPasswordText}>Quên mật khẩu?</AppText>
          </Pressable>
        </View>

        <View style={styles.passwordInputWrapper}>
          <TextInput
            style={[
              styles.input,
              styles.passwordInput,
              fieldErrors.password ? styles.inputError : null,
            ]}
            value={password}
            onChangeText={(val) => {
              setPassword(val);
              onResetFeedback?.();
            }}
            placeholder="••••••••"
            placeholderTextColor={colors.inkSubtle}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <Pressable
            style={styles.eyeToggleBtn}
            hitSlop={12}
            onPress={() => setShowPassword(!showPassword)}
          >
            <AppText style={styles.eyeToggleText}>{showPassword ? "Ẩn" : "Hiện"}</AppText>
          </Pressable>
        </View>

        {fieldErrors.password ? (
          <AppText style={styles.errorText}>{fieldErrors.password}</AppText>
        ) : null}
      </View>

      {/* Nút Đăng nhập chính */}
      <Pressable
        style={({ pressed }) => [
          styles.submitBtn,
          pressed && styles.submitBtnPressed,
          isSubmitting && styles.submitBtnDisabled,
        ]}
        onPress={onSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <AppText style={styles.submitBtnText}>Đăng nhập</AppText>
        )}
      </Pressable>

      {/* Hàng nút Social Login: Google, Apple, Facebook */}
      <MobileSocialAuthRow
        onGooglePress={onGoogleLogin}
        onApplePress={onAppleLogin}
        onFacebookPress={onFacebookLogin}
        disabled={isSubmitting}
      />

      {/* Dòng liên kết Đăng ký */}
      <View style={styles.registerRow}>
        <AppText style={styles.footerPrompt}>Bạn chưa có tài khoản? </AppText>
        <Pressable
          hitSlop={8}
          onPress={onSwitchToRegister}
          style={({ pressed }) => [pressed && styles.linkPressed]}
        >
          <AppText style={styles.registerLink}>Đăng ký ngay</AppText>
        </Pressable>
      </View>

      {/* Nút "Đăng nhập với tư cách khác?" */}
      <View style={styles.switchRoleContainer}>
        <Pressable
          hitSlop={10}
          onPress={onSwitchRole}
          style={({ pressed }) => [styles.switchRoleBtn, pressed && styles.linkPressed]}
        >
          <AppText style={styles.switchRoleText}>Đăng nhập với tư cách khác?</AppText>
        </Pressable>
      </View>

      {/* Chân trang: Điều khoản & Bản quyền */}
      <View style={styles.legalSection}>
        <AppText style={styles.legalNoticeText}>
          Bằng việc đăng nhập hoặc tạo tài khoản, bạn đồng ý với{" "}
          <AppText style={styles.legalHighlight}>Điều khoản và điều kiện</AppText> cũng như{" "}
          <AppText style={styles.legalHighlight}>Chính sách bảo mật</AppText> của Social Travel
          Booking
        </AppText>

        <AppText style={styles.copyrightText}>© 2026 Social Travel Booking</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: spacing.base,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs + 2,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkPrimary,
    marginBottom: spacing.xs + 2,
  },
  input: {
    minHeight: touchTarget.minHeight,
    borderWidth: 1.2,
    borderColor: colors.borderSubtle,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.base,
    fontSize: 15,
    color: colors.inkPrimary,
    backgroundColor: colors.surfaceElevated,
  },
  passwordInputWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeToggleBtn: {
    position: "absolute",
    right: spacing.base,
    height: "100%",
    justifyContent: "center",
  },
  eyeToggleText: {
    fontSize: 13,
    color: colors.brandPrimary,
    fontWeight: "600",
  },
  inputError: {
    borderColor: colors.statusDanger,
    backgroundColor: "#FFF1F2",
  },
  errorText: {
    fontSize: 12,
    color: colors.statusDanger,
    marginTop: 4,
    marginLeft: 2,
  },
  forgotPasswordText: {
    fontSize: 12,
    color: colors.brandPrimary,
    fontWeight: "600",
  },
  submitBtn: {
    minHeight: 50,
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
    shadowColor: colors.brandPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  submitBtnDisabled: {
    opacity: 0.65,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  linkPressed: {
    opacity: 0.6,
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.lg,
  },
  footerPrompt: {
    fontSize: 14,
    color: colors.inkSubtle,
  },
  registerLink: {
    fontSize: 14,
    color: colors.brandPrimary,
    fontWeight: "700",
  },
  switchRoleContainer: {
    alignItems: "center",
    marginTop: spacing.sx,
  },
  switchRoleBtn: {
    paddingHorizontal: 12,
  },
  switchRoleText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkBody,
    textDecorationLine: "underline",
  },
  legalSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.base,
    alignItems: "center",
  },
  legalNoticeText: {
    fontSize: 11,
    color: colors.inkSubtle,
    textAlign: "center",
    lineHeight: 16,
    maxWidth: 320,
  },
  legalHighlight: {
    fontSize: 11,
    color: colors.brandPrimary,
    fontWeight: "600",
  },
  copyrightText: {
    fontSize: 11,
    color: colors.inkSubtle,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
