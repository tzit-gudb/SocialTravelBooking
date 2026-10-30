import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Animated,
  Easing,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "../../../theme/tokens";
import { useAuth } from "../../../hooks/useAuth";
import MobileAuthHeader from "../components/MobileAuthHeader";
import MobileLoginForm from "../components/MobileLoginForm";
import MobileRegisterForm from "../components/MobileRegisterForm";
import AuthErrorBanner from "../components/AuthErrorBanner";
import { validateLoginInput, validateRegisterInput, USER_ROLES } from "../models/authModel";

/**
 * Screen Orchestrator: Màn hình Xác thực Mobile (Đăng nhập & Đăng ký)
 * - Điều phối chuyển đổi mượt mà giữa Đăng nhập và Đăng ký
 * - Slide-up entrance animation mượt mà khi màn hình hiển thị sau Splash
 * - Tuân thủ quy chuẩn Single Responsibility & dưới 150 dòng code (< 150 lines)
 */
export default function AuthScreen() {
  const { login, register, isSubmitting } = useAuth();

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const entranceTranslateY = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entranceOpacity, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(entranceTranslateY, {
        toValue: 0,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [entranceOpacity, entranceTranslateY]);

  const resetFeedback = () => {
    if (errorMessage) setErrorMessage("");
    if (Object.keys(fieldErrors).length > 0) setFieldErrors({});
  };

  const switchMode = (nextMode) => {
    resetFeedback();
    setMode(nextMode);
  };

  const handleLogin = async () => {
    resetFeedback();
    const { isValid, errors } = validateLoginInput(email, password);
    setFieldErrors(errors);
    if (!isValid) return;

    const result = await login(email.trim(), password);
    if (!result.success) {
      setErrorMessage(result.message || "Đăng nhập không thành công.");
      if (result.errors) setFieldErrors(result.errors);
    }
  };

  const handleRegister = async () => {
    resetFeedback();
    const { isValid, errors } = validateRegisterInput({
      email,
      password,
      passwordConfirm: confirmPassword,
    });
    setFieldErrors(errors);
    if (!isValid) return;

    const result = await register({
      name: email.split("@")[0] || "Du khách",
      email: email.trim(),
      password,
      password_confirmation: confirmPassword,
      role: USER_ROLES.TOURIST,
    });
    if (!result.success) {
      setErrorMessage(result.message || "Đăng ký không thành công.");
      if (result.errors) setFieldErrors(result.errors);
    }
  };

  const showUnsupportedNotice = () => {
    Alert.alert("Thông báo", "Phương thức đăng nhập này hiện chưa được hỗ trợ trên ứng dụng", [
      { text: "Đã hiểu" },
    ]);
  };

  const commonProps = {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    fieldErrors,
    isSubmitting,
    onResetFeedback: resetFeedback,
    onSwitchRole: showUnsupportedNotice,
    onGoogleLogin: showUnsupportedNotice,
    onAppleLogin: showUnsupportedNotice,
    onFacebookLogin: showUnsupportedNotice,
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.animatedContainer,
              { opacity: entranceOpacity, transform: [{ translateY: entranceTranslateY }] },
            ]}
          >
            <MobileAuthHeader mode={mode} />
            <AuthErrorBanner message={errorMessage} />
            {mode === "login" ? (
              <MobileLoginForm
                {...commonProps}
                onSubmit={handleLogin}
                onForgotPassword={() =>
                  Alert.alert("Quên mật khẩu?", "Tính năng gửi mã xác thực đang được hoàn thiện.")
                }
                onSwitchToRegister={() => switchMode("register")}
              />
            ) : (
              <MobileRegisterForm
                {...commonProps}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                onSubmit={handleRegister}
                onSwitchToLogin={() => switchMode("login")}
              />
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surfaceElevated },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg + 2,
    paddingVertical: spacing.xl,
  },
  animatedContainer: { width: "100%" },
});
