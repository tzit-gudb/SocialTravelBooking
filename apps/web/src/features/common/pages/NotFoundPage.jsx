import React from "react";
import { useNavigate } from "react-router-dom";
import Typography from "../../../components/ui/Typography";
import AuthFooter from "../../../components/ui/AuthFooter";
import { useAuth } from "../../../hooks/useAuth";

/**
 * Trang 404 - Thông báo trang không khả dụng hoặc không tồn tại:
 * - Tự động định tuyến về đúng bảng điều khiển theo vai trò người dùng (nếu đã đăng nhập)
 */
export default function NotFoundPage() {
  const navigate = useNavigate();
  const { isAuthenticated, role, user, getDashboardRouteByRole } = useAuth();

  const handleGoHome = () => {
    if (isAuthenticated) {
      navigate(getDashboardRouteByRole(role, user), { replace: true });
    } else {
      navigate("/auth", { replace: true });
    }
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      handleGoHome();
    }
  };

  return (
    <div className="min-h-screen bg-surface-base flex flex-col justify-between selection:bg-brand-primary/10">
      {/* 1. Header tinh gọn với Logo thương hiệu */}
      <header className="w-full border-b border-border-subtle bg-surface-elevated/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Typography
          variant="logo"
          as="span"
          className="text-xl sm:text-2xl text-brand-primary tracking-tight select-none cursor-pointer"
          onClick={handleGoHome}
        >
          Social Travel Booking
        </Typography>
      </header>

      {/* 2. Nội dung trung tâm: Khối 404 tinh gọn & rõ ràng */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-lg bg-surface-elevated border border-border-subtle rounded-2xl shadow-sm p-8 sm:p-12 text-center flex flex-col items-center">
          {/* Mã lỗi 404 thuần typographic, không dùng hình minh họa clipart thừa */}
          <span className="text-7xl sm:text-8xl font-black text-brand-primary tracking-tight mb-4 select-none">
            404
          </span>

          {/* Tiêu đề thông báo theo yêu cầu */}
          <Typography variant="h2" className="text-xl sm:text-2xl font-bold text-ink-primary mb-3">
            Trang này hiện không khả dụng hoặc không tồn tại
          </Typography>

          {/* Mô tả giải thích thân thiện với du khách và đối tác */}
          <Typography
            variant="body"
            className="text-ink-body text-sm sm:text-base leading-relaxed mb-8 max-w-md"
          >
            Đường dẫn bạn đang truy cập có thể đã bị thay đổi, bị gỡ bỏ hoặc tạm thời không thể hiển
            thị trên hệ thống. Vui lòng kiểm tra lại liên kết hoặc quay về khu vực làm việc chính.
          </Typography>

          {/* Các nút điều hướng rõ nghĩa, không icon rườm rà */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleGoHome}
              className="w-full sm:w-auto min-w-[170px] h-11 px-6 rounded-xl bg-brand-primary hover:bg-brand-hover active:scale-[0.99] text-white font-semibold text-sm sm:text-base shadow-sm transition-colors cursor-pointer"
            >
              {isAuthenticated ? "Về bảng điều khiển" : "Về trang đăng nhập"}
            </button>

            <button
              type="button"
              onClick={handleGoBack}
              className="w-full sm:w-auto min-w-[150px] h-11 px-6 rounded-xl border border-border-subtle bg-surface-elevated hover:bg-slate-50 text-ink-primary font-medium text-sm sm:text-base transition-colors cursor-pointer"
            >
              Quay lại trang trước
            </button>
          </div>
        </div>
      </main>

      {/* 3. Footer đồng bộ */}
      <AuthFooter />
    </div>
  );
}
