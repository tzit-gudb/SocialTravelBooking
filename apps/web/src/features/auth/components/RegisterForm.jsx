import React from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Typography from "../../../components/ui/Typography";

/**
 * Component biểu mẫu Đăng ký (Web Portal)
 * Các trường: Email, Mật khẩu, Xác nhận mật khẩu với kích thước đồng bộ lớn hơn.
 */
export default function RegisterForm({
  email,
  setEmail,
  password,
  setPassword,
  passwordConfirmation,
  setPasswordConfirmation,
  showPassword,
  setShowPassword,
  fieldErrors = {},
  isSubmitting,
  onSubmit,
  onResetFeedback,
  onSwitchToLogin,
}) {
  return (
    <div className="w-full">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {/* Email */}
        <div>
          <label
            htmlFor="register-email"
            className="block text-sm font-semibold text-ink-primary mb-2"
          >
            Email
          </label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              onResetFeedback?.();
            }}
            placeholder="provider@example.com"
            className={`w-full px-4 py-3 rounded-lg border text-base transition-colors outline-hidden focus:ring-2 focus:ring-brand-primary/20 ${
              fieldErrors.email
                ? "border-status-danger bg-rose-50/30"
                : "border-border-subtle bg-surface-elevated focus:border-brand-primary"
            }`}
          />
          {fieldErrors.email && (
            <Typography variant="caption" className="text-status-danger mt-1.5 block">
              {fieldErrors.email}
            </Typography>
          )}
        </div>

        {/* Mật khẩu */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="register-password"
              className="block text-sm font-semibold text-ink-primary"
            >
              Mật khẩu
            </label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              className="text-sm text-brand-primary hover:text-brand-hover hover:underline cursor-pointer inline-flex items-center gap-1"
            >
              {showPassword ? (
                <>
                  <EyeOff className="w-4 h-4" /> Ẩn
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" /> Hiển thị mật khẩu
                </>
              )}
            </button>
          </div>
          <div className="relative">
            <input
              id="register-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                onResetFeedback?.();
              }}
              placeholder="Tối thiểu 8 ký tự"
              className={`w-full px-4 py-3 rounded-lg border text-base transition-colors outline-hidden focus:ring-2 focus:ring-brand-primary/20 ${
                fieldErrors.password
                  ? "border-status-danger bg-rose-50/30"
                  : "border-border-subtle bg-surface-elevated focus:border-brand-primary"
              }`}
            />
          </div>
          {fieldErrors.password && (
            <Typography variant="caption" className="text-status-danger mt-1.5 block">
              {fieldErrors.password}
            </Typography>
          )}
        </div>

        {/* Xác nhận mật khẩu */}
        <div>
          <label
            htmlFor="register-password-confirm"
            className="block text-sm font-semibold text-ink-primary mb-2"
          >
            Xác nhận mật khẩu
          </label>
          <input
            id="register-password-confirm"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={passwordConfirmation}
            onChange={(e) => {
              setPasswordConfirmation(e.target.value);
              onResetFeedback?.();
            }}
            placeholder="Nhập lại mật khẩu"
            className={`w-full px-4 py-3 rounded-lg border text-base transition-colors outline-hidden focus:ring-2 focus:ring-brand-primary/20 ${
              fieldErrors.password_confirmation
                ? "border-status-danger bg-rose-50/30"
                : "border-border-subtle bg-surface-elevated focus:border-brand-primary"
            }`}
          />
          {fieldErrors.password_confirmation && (
            <Typography variant="caption" className="text-status-danger mt-1.5 block">
              {fieldErrors.password_confirmation}
            </Typography>
          )}
        </div>

        {/* Dòng điều khoản pháp lý */}
        <p className="text-xs sm:text-sm text-ink-subtle leading-relaxed pt-1">
          Bằng việc nhấn <span className="text-brand-primary font-semibold">Gửi</span>, bạn đồng ý
          với{" "}
          <a href="#" className="text-brand-primary font-semibold">
            Điều khoản dịch vụ
          </a>{" "}
          và{" "}
          <a href="#" className="text-brand-primary font-semibold">
            Chính sách bảo mật
          </a>{" "}
          của chúng tôi.
        </p>

        {/* Nút Gửi */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-3 py-3.5 px-5 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-base font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Đang gửi thông tin...</span>
            </>
          ) : (
            <span>Gửi</span>
          )}
        </button>
      </form>

      {/* Nút Tôi đã có tài khoản rồi */}
      <div className="mt-7 text-center text-sm sm:text-base text-ink-body">
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-brand-primary font-semibold hover:text-brand-hover hover:underline cursor-pointer"
        >
          Tôi đã có tài khoản rồi
        </button>
      </div>
    </div>
  );
}
