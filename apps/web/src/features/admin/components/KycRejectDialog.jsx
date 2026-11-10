import React, { useState } from "react";
import Typography from "../../../components/ui/Typography";

const QUICK_REASONS = [
  "Ảnh chụp giấy phép kinh doanh bị mờ, không rõ số đăng ký và con dấu.",
  "Thông tin người đại diện không trùng khớp với hồ sơ đăng ký.",
  "Loại hình đăng ký không phù hợp với giấy phép hoạt động đính kèm.",
  "Giấy phép kinh doanh đã hết hạn hiệu lực theo quy định pháp luật.",
];

/**
 * Hộp thoại Từ chối hồ sơ KYC kèm lý do gửi cho Provider (task14.md)
 */
export default function KycRejectDialog({ isOpen, onClose, onConfirm, providerName }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do từ chối hồ sơ.");
      return;
    }
    if (reason.trim().length < 10) {
      setError("Lý do từ chối phải có tối thiểu 10 ký tự để đối tác khắc phục.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim());
      setReason("");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectQuickReason = (text) => {
    setReason(text);
    setError("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-surface-elevated rounded-2xl shadow-2xl border border-border-subtle overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-subtle bg-slate-50 flex items-center justify-between">
          <Typography variant="h3" className="text-lg font-bold text-status-danger">
            Từ chối duyệt hồ sơ đối tác
          </Typography>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-subtle hover:text-ink-primary text-sm font-medium cursor-pointer"
          >
            Đóng
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-ink-body">
            Bạn đang từ chối hồ sơ của cơ sở:{" "}
            <strong className="text-ink-primary font-semibold">{providerName}</strong>. Vui lòng nêu
            rõ lý do để đối tác điều chỉnh và bổ sung lại hồ sơ.
          </p>

          <div>
            <label
              htmlFor="reject-reason-input"
              className="block text-xs font-semibold text-ink-primary mb-1.5"
            >
              Lý do từ chối <span className="text-status-danger">* (tối thiểu 10 ký tự)</span>
            </label>
            <textarea
              id="reject-reason-input"
              rows={4}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError("");
              }}
              placeholder="Ví dụ: Ảnh chụp giấy phép kinh doanh bị lóa sáng, không đọc được con dấu và người đại diện..."
              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors outline-hidden focus:ring-2 focus:ring-rose-500/20 resize-y ${
                error
                  ? "border-status-danger bg-rose-50/20"
                  : "border-border-subtle bg-surface-elevated focus:border-status-danger"
              }`}
            />
            {error && (
              <span className="text-xs text-status-danger mt-1 block font-medium">{error}</span>
            )}
          </div>

          {/* Gợi ý lý do nhanh */}
          <div>
            <span className="text-xs font-semibold text-ink-subtle block mb-1.5">
              Gợi ý lý do thường gặp:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REASONS.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectQuickReason(r)}
                  className="text-left text-xs bg-slate-100 hover:bg-slate-200 text-ink-body px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-border-subtle flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border-subtle bg-surface-elevated hover:bg-slate-50 text-sm font-medium text-ink-primary transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-status-danger hover:bg-rose-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 cursor-pointer shadow-sm"
            >
              {isSubmitting ? "Đang gửi..." : "Xác nhận từ chối"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
