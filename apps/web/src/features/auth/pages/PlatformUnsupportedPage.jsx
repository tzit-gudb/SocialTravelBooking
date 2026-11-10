import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Typography from "../../../components/ui/Typography";
import AuthFooter from "../../../components/ui/AuthFooter";
import { useAuth } from "../../../hooks/useAuth";

/**
 * Trang thông báo Giới hạn Nền tảng (404 Role Guard) trên Web Portal:
 * - Mã lỗi 404 thuần, thiết kế tối giản, trực quan, không dùng icon cầu kỳ
 * - Nút "Quay lại" kích hoạt đăng xuất và trả về màn hình đăng nhập
 * - Tuân thủ quy chuẩn Single Responsibility & dưới 150 dòng code (< 150 lines)
 */
export default function PlatformUnsupportedPage() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const getRoleDisplayName = (r) => {
    switch (r) {
      case "tourist":
        return "Khách du lịch";
      case "provider":
        return "Nhà cung cấp dịch vụ";
      case "admin":
        return "Quản trị viên";
      default:
        return "vai trò này";
    }
  };

  const handleBackAndLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/auth", { replace: true });
    } catch {
      navigate("/auth", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const roleLabel = getRoleDisplayName(role);

  return (
    <div className="min-h-screen bg-surface-base flex flex-col justify-between selection:bg-brand-primary/10">
      {/* 1. Header tinh gọn với Logo thương hiệu */}
      <header className="w-full border-b border-border-subtle bg-surface-elevated/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <span className="font-logo font-bold text-xl sm:text-2xl text-brand-primary tracking-tight">
          Social Travel Booking
        </span>
      </header>

      {/* 2. Nội dung trung tâm: Thông báo 404 thuần tối giản */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-lg bg-surface-elevated border border-border-subtle rounded-2xl shadow-sm p-8 sm:p-12 text-center flex flex-col items-center">
          {/* Dòng mã 404 thuần, không lồng icon */}
          <span className="text-6xl sm:text-7xl font-black text-brand-primary font-heading tracking-tight mb-4 select-none">
            404
          </span>

          {/* Tiêu đề thông báo theo yêu cầu */}
          <Typography variant="h2" className="text-xl sm:text-2xl font-bold text-ink-primary mb-3">
            Nền tảng hiện chưa hỗ trợ cho {roleLabel}
          </Typography>

          {/* Mô tả giải thích tinh giản */}
          <Typography
            variant="body"
            className="text-ink-body text-sm sm:text-base leading-relaxed mb-8 max-w-md"
          >
            Cổng thông tin Web hiện tại chỉ dành cho <strong>Nhà cung cấp dịch vụ</strong> quản lý
            kinh doanh.
            <br className="hidden sm:inline" />
            Vui lòng đăng nhập tài khoản <strong>{user?.email || "của bạn"}</strong> trên ứng dụng
            di động Social Travel Booking để tiếp tục trải nghiệm.
          </Typography>

          {/* Nút Quay lại (hoạt động như nút Đăng xuất) */}
          <button
            type="button"
            onClick={handleBackAndLogout}
            disabled={isLoggingOut}
            className="w-full sm:w-auto min-w-[200px] h-11 px-8 rounded-xl bg-brand-primary hover:bg-brand-primary-hover active:scale-[0.99] text-white font-semibold text-sm sm:text-base shadow-sm transition-all flex items-center justify-center cursor-pointer disabled:opacity-60"
          >
            {isLoggingOut ? "Đang xử lý..." : "Quay lại"}
          </button>
        </div>
      </main>

      {/* 3. Footer đồng bộ */}
      <AuthFooter />
    </div>
  );
}
