import React from "react";
import { Clock, CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";
import Typography from "../../../components/ui/Typography";

/**
 * Trạng thái hiển thị sau khi hoàn tất gửi hồ sơ (Bước 3: Chờ xác nhận)
 */
export default function OnboardingSuccessState({ formData, submissionInfo, onBackToAuth }) {
  const referenceCode = submissionInfo?.referenceCode || "STB-PRV-202688";
  const submittedAt = submissionInfo?.submittedAt || "Hôm nay";

  return (
    <div className="w-full max-w-xl mx-auto text-center py-4">
      {/* Icon trạng thái chờ duyệt */}
      <div className="relative inline-flex items-center justify-center mb-6">
        <div className="w-20 h-20 rounded-full bg-brand-light/70 text-brand-primary flex items-center justify-center shadow-lg shadow-brand-primary/10">
          <Clock className="w-10 h-10 animate-pulse" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-surface-elevated">
          <CheckCircle2 className="w-4 h-4" />
        </div>
      </div>

      {/* Tiêu đề & Thông điệp */}
      <Typography variant="h1" className="text-2xl sm:text-3xl font-bold mb-3 text-ink-primary">
        Hồ sơ đã được gửi thành công!
      </Typography>
      <p className="text-base text-ink-subtle max-w-lg mx-auto leading-relaxed mb-8">
        Hệ thống đã ghi nhận hồ sơ khởi tạo đối tác của bạn. Đội ngũ kiểm duyệt Social Travel
        Booking sẽ thẩm định thông tin và gửi thông báo kích hoạt qua email trong vòng{" "}
        <strong className="text-ink-primary font-semibold">24 giờ làm việc</strong>.
      </p>

      {/* Khối tóm tắt thông tin hồ sơ đã nộp */}
      <div className="bg-surface-muted/50 rounded-xl border border-border-subtle p-6 text-left mb-8 space-y-3.5">
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <span className="text-xs uppercase tracking-wider text-ink-subtle font-semibold">
            Mã hồ sơ thẩm định
          </span>
          <span className="font-mono text-xs font-bold text-brand-primary bg-brand-light px-2.5 py-1 rounded">
            {referenceCode}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-xs text-ink-subtle block mb-0.5">Tên đơn vị:</span>
            <span className="font-medium text-ink-primary truncate block">
              {formData.businessName || "Chưa cập nhật"}
            </span>
          </div>

          <div>
            <span className="text-xs text-ink-subtle block mb-0.5">Loại hình dịch vụ:</span>
            <span className="font-medium text-ink-primary truncate block">
              {formData.businessType || "Tour & Du lịch"}
            </span>
          </div>

          <div>
            <span className="text-xs text-ink-subtle block mb-0.5">Người đại diện:</span>
            <span className="font-medium text-ink-primary truncate block">
              {formData.representativeName || "Chưa cập nhật"}
            </span>
          </div>

          <div>
            <span className="text-xs text-ink-subtle block mb-0.5">Thời gian gửi:</span>
            <span className="font-medium text-ink-primary block">{submittedAt}</span>
          </div>
        </div>

        <div className="pt-3 border-t border-border-subtle flex items-center gap-2 text-xs text-amber-700 bg-amber-50/80 p-2.5 rounded-lg border border-amber-200">
          <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            Trạng thái: <strong>Đang chờ phê duyệt từ Ban quản trị</strong>
          </span>
        </div>
      </div>

      {/* Hành động tiếp theo */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={onBackToAuth}
          className="w-full py-3.5 px-6 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-base font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          <span>Quay về trang đăng nhập</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-xs text-ink-subtle pt-2">
          Cần hỗ trợ gấp? Vui lòng liên hệ hotline đối tác{" "}
          <strong className="text-ink-primary">1900 8892</strong> hoặc gửi email tới{" "}
          <strong className="text-ink-primary">partner@socialtravel.vn</strong>.
        </p>
      </div>
    </div>
  );
}
