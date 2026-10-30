import React, { useState } from "react";
import { StyleSheet, View, TextInput, Pressable, ActivityIndicator } from "react-native";
import AppText from "../../../components/common/AppText";
import { colors, spacing, radius, touchTarget } from "../../../theme/tokens";
import MobileSocialAuthRow from "./MobileSocialAuthRow";

/**
 * Form Đăng ký tài khoản Mobile đồng bộ phong cách với Form Đăng nhập:
 * - Email, Mật khẩu, Xác nhận mật khẩu
 * - Cụm nút Social Login (Google, Apple, Facebook)
 * - Nút "Đăng nhập với tư cách khác?"
 * - Dòng Điều khoản pháp lý và Bản quyền ở dưới cùng
 */
export default function MobileRegisterForm({
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  fieldErrors = {},
  isSubmitting,
  onSubmit,
  onResetFeedback,
  onSwitchToLogin,
  onSwitchRole,
  onGoogleLogin,
  onAppleLogin,
  onFacebookLogin,
}) {
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
        <AppText style={styles.label}>Mật khẩu</AppText>
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
            placeholder="Tối thiểu 8 ký tự"
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

      {/* Trường Xác nhận mật khẩu */}
      <View style={styles.inputGroup}>
        <AppText style={styles.label}>Xác nhận mật khẩu</AppText>
        <View style={styles.passwordInputWrapper}>
          <TextInput
            style={[
              styles.input,
              styles.passwordInput,
              fieldErrors.password_confirmation ? styles.inputError : null,
            ]}
            value={confirmPassword}
            onChangeText={(val) => {
              setConfirmPassword(val);
              onResetFeedback?.();
            }}
            placeholder="Nhập lại mật khẩu"
            placeholderTextColor={colors.inkSubtle}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
          />
          <Pressable
            style={styles.eyeToggleBtn}
            hitSlop={12}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <AppText style={styles.eyeToggleText}>{showConfirmPassword ? "Ẩn" : "Hiện"}</AppText>
          </Pressable>
        </View>
        {fieldErrors.password_confirmation ? (
          <AppText style={styles.errorText}>{fieldErrors.password_confirmation}</AppText>
        ) : null}
      </View>

      {/* Nút Đăng ký chính */}
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
          <AppText style={styles.submitBtnText}>Đăng ký</AppText>
        )}
      </Pressable>

      {/* Hàng nút Social Login: Google, Apple, Facebook */}
      <MobileSocialAuthRow
        onGooglePress={onGoogleLogin}
        onApplePress={onAppleLogin}
        onFacebookPress={onFacebookLogin}
        disabled={isSubmitting}
      />

      {/* Dòng liên kết chuyển sang Đăng nhập */}
      <View style={styles.registerRow}>
        <AppText style={styles.footerPrompt}>Bạn đã có tài khoản rồi? </AppText>
        <Pressable
          hitSlop={8}
          onPress={onSwitchToLogin}
          style={({ pressed }) => [pressed && styles.linkPressed]}
        >
          <AppText style={styles.registerLink}>Đăng nhập ngay</AppText>
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
    marginTop: spacing.xs,
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
