import React, { useState } from "react";
import { X, Mail, CheckCircle2, ArrowRight } from "lucide-react";
import Typography from "../../../components/ui/Typography";

/**
 * Modal xử lý Quên mật khẩu tối giản (Web Portal)
 */
export default function ForgotPasswordModal({ isOpen, onClose, initialEmail = "" }) {
  const [email, setEmail] = useState(initialEmail);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Vui lòng nhập địa chỉ email hợp lệ.");
      return;
    }
    setError("");
    setIsSent(true);
  };

  const handleClose = () => {
    setIsSent(false);
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-surface-elevated rounded-2xl border border-border-subtle shadow-2xl p-6">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-ink-subtle hover:text-ink-primary p-1 rounded-lg hover:bg-surface-base cursor-pointer transition-colors"
          aria-label="Đóng hộp thoại"
        >
          <X className="w-5 h-5" />
        </button>

        {isSent ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-status-success flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <Typography variant="h3" className="mb-2">
              Đã gửi yêu cầu khôi phục!
            </Typography>
            <Typography variant="body-sm" className="text-ink-subtle mb-6">
              Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu tới{" "}
              <strong className="text-ink-primary">{email}</strong>. Vui lòng kiểm tra hộp thư đến
              hoặc mục thư rác.
            </Typography>
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2.5 px-4 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Đã hiểu và quay lại
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-light text-brand-primary flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <Typography variant="h3">Quên mật khẩu?</Typography>
                <Typography variant="caption" className="text-ink-subtle">
                  Nhận liên kết khôi phục qua email của bạn
                </Typography>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="reset-email"
                  className="block text-[13px] font-semibold text-ink-primary mb-1.5"
                >
                  Địa chỉ email tài khoản
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nhacungcap@example.com"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border-subtle bg-surface-elevated text-sm outline-hidden focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-colors"
                />
                {error && (
                  <Typography variant="caption" className="text-status-danger mt-1 block">
                    {error}
                  </Typography>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm text-ink-body hover:bg-surface-base rounded-lg transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-primary hover:bg-brand-hover text-white text-sm font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Gửi liên kết</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
