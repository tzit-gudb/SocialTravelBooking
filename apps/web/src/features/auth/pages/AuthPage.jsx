import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Typography from "../../../components/ui/Typography";
import { useAuth } from "../../../hooks/useAuth";
import AuthBrandingPanel from "../components/AuthBrandingPanel";
import LoginForm from "../components/LoginForm";
import RegisterForm from "../components/RegisterForm";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import AuthFeedbackAlert from "../components/AuthFeedbackAlert";
import AuthFooter from "../../../components/ui/AuthFooter";

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register, loginWithGoogle, isSubmitting } = useAuth();

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const resetFeedback = () => {
    if (errorMessage) setErrorMessage("");
    if (Object.keys(fieldErrors).length > 0) setFieldErrors({});
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    resetFeedback();
  };

  const validate = () => {
    const errors = {};
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Vui lòng nhập địa chỉ email hợp lệ.";
    }
    if (!password || password.length < 8) {
      errors.password = "Mật khẩu tối thiểu 8 ký tự.";
    }
    if (mode === "register" && password !== passwordConfirmation) {
      errors.password_confirmation = "Mật khẩu xác nhận không khớp.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    resetFeedback();
    if (!validate()) return;

    if (mode === "login") {
      const result = await login(email.trim(), password);
      if (result.success) return navigate(result.redirectTo, { replace: true });
      setErrorMessage(result.message || "Đăng nhập không thành công.");
      if (result.errors) setFieldErrors(result.errors);
      return;
    }

    const accountName = email.split("@")[0] || "Đối tác";
    const result = await register({
      name: accountName,
      email: email.trim(),
      password,
      password_confirmation: passwordConfirmation,
      role: "provider",
      business_name: `${accountName} Travel`,
    });

    if (result.success) return navigate("/onboarding", { replace: true });
    setErrorMessage(result.message || "Đăng ký không thành công.");
    if (result.errors) setFieldErrors(result.errors);
  };

  const handleGoogleAuth = async () => {
    resetFeedback();
    const result = await loginWithGoogle("provider");
    if (result.success) return navigate(result.redirectTo, { replace: true });
    setErrorMessage(result.message || "Đăng nhập Google thất bại.");
  };

  return (
    <div className="min-h-screen w-full bg-surface-elevated flex flex-col justify-between">
      <div className="flex-1 flex flex-col lg:flex-row w-full">
        {/* Nửa bên trái: Nền trắng, căn giữa dọc, căn trái ngang, logo & tag cùng hàng */}
        <AuthBrandingPanel />

        {/* Nửa bên phải: Form đăng nhập/đăng ký kích thước cân đối */}
        <main className="w-full lg:w-1/2 flex items-center justify-center px-8 sm:px-14 lg:px-20 py-12 lg:py-16 overflow-y-auto">
          <div className="w-full max-w-[480px]">
            <div className="mb-8">
              <Typography variant="h1" className="text-3xl font-bold mb-2.5">
                {mode === "login" ? "Đăng nhập" : "Đăng ký"}
              </Typography>
            </div>

            <AuthFeedbackAlert message={errorMessage} />

            {mode === "login" ? (
              <LoginForm
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                fieldErrors={fieldErrors}
                isSubmitting={isSubmitting}
                onSubmit={handleSubmit}
                onResetFeedback={resetFeedback}
                onForgotPassword={() => setIsForgotPasswordOpen(true)}
                onGoogleAuth={handleGoogleAuth}
                onSwitchToRegister={() => switchMode("register")}
              />
            ) : (
              <RegisterForm
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                passwordConfirmation={passwordConfirmation}
                setPasswordConfirmation={setPasswordConfirmation}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                fieldErrors={fieldErrors}
                isSubmitting={isSubmitting}
                onSubmit={handleSubmit}
                onResetFeedback={resetFeedback}
                onSwitchToLogin={() => switchMode("login")}
              />
            )}
          </div>
        </main>
      </div>

      {/* Footer toàn màn hình dùng chung */}
      <AuthFooter />

      {/* Modal Quên mật khẩu */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        initialEmail={email}
      />
    </div>
  );
}
