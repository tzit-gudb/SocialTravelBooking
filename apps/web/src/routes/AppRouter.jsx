import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import AuthPage from "../features/auth/pages/AuthPage";
import PlatformUnsupportedPage from "../features/auth/pages/PlatformUnsupportedPage";
import ProviderOnboardingPage from "../features/provider/pages/ProviderOnboardingPage";
import AdminDashboardPage from "../features/admin/pages/AdminDashboardPage";
import ProviderDashboardPage from "../features/provider/pages/ProviderDashboardPage";
import NotFoundPage from "../features/common/pages/NotFoundPage";
import Typography from "../components/ui/Typography";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-surface-base flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-7 h-7 text-brand-primary animate-spin" />
      <Typography variant="body-sm" className="text-ink-subtle">
        Đang đồng bộ phiên đăng nhập...
      </Typography>
    </div>
  );
}

/**
 * Bảo vệ Route cho trang Onboarding của Provider:
 * - Nếu chưa đăng nhập -> Chuyển về trang đăng nhập (/auth).
 * - Nếu đã đăng nhập nhưng vai trò không phải provider -> Chuyển sang 404.
 * - Nếu Provider đã được phê duyệt chính thức (status: approved) -> Chuyển thẳng vào dashboard.
 */
function ProviderOnboardingRoute({ children }) {
  const { isAuthenticated, isLoading, user, role } = useAuth();

  if (isLoading) return <LoadingScreen />;

  // 1. Chặn khách chưa đăng nhập xem trang onboarding -> Quay về trang đăng nhập /auth
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // 2. Chặn người dùng có vai trò khác không phải provider
  if (role !== "provider") {
    return <Navigate to="/404" replace />;
  }

  // 3. Nếu hồ sơ đã được duyệt chính thức thì không cần vào lại onboarding
  if (user?.provider_profile?.status === "approved") {
    return <Navigate to="/provider/dashboard" replace />;
  }

  return children;
}

/**
 * Bảo vệ Route theo phân quyền (Role-based Guard):
 * - Nếu chưa đăng nhập -> Luôn chuyển về trang đăng nhập (/auth).
 * - Nếu đã đăng nhập nhưng không có quyền truy cập vai trò này -> Chuyển sang trang 404.
 */
function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, isLoading, user, role } = useAuth();

  if (isLoading) return <LoadingScreen />;

  // 1. Chưa đăng nhập -> Chuyển về trang đăng nhập /auth
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // 2. Đã đăng nhập nhưng vai trò không nằm trong danh sách được phép -> Chuyển sang 404
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/404" replace />;
  }

  // 3. Chặn Provider vào Dashboard vận hành nếu chưa hoàn thành onboarding hoặc chưa được duyệt KYC
  if (
    role === "provider" &&
    (!user?.provider_profile || user?.provider_profile?.status !== "approved")
  ) {
    return <Navigate to="/provider/onboarding" replace />;
  }

  return children;
}

/**
 * Tự động chuyển hướng khỏi trang /auth nếu đã đăng nhập
 */
function GuestRoute({ children }) {
  const { isAuthenticated, isLoading, user, role, getDashboardRouteByRole } = useAuth();

  if (isLoading) return <LoadingScreen />;

  if (isAuthenticated) {
    return <Navigate to={getDashboardRouteByRole(role, user)} replace />;
  }

  return children;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Trang chủ điều hướng về /auth hoặc bảng điều khiển */}
        <Route
          path="/"
          element={
            <GuestRoute>
              <Navigate to="/auth" replace />
            </GuestRoute>
          }
        />

        {/* Trang Đăng nhập / Đăng ký */}
        <Route
          path="/auth"
          element={
            <GuestRoute>
              <AuthPage />
            </GuestRoute>
          }
        />

        {/* Trang lỗi 404 chuyên biệt */}
        <Route path="/404" element={<NotFoundPage />} />

        {/* Trang thông báo giới hạn nền tảng cho vai trò chưa hỗ trợ trên Web (ví dụ: Tourist) */}
        <Route path="/unsupported" element={<PlatformUnsupportedPage />} />

        {/* Trang Khởi tạo / Thiết lập hồ sơ Nhà cung cấp dịch vụ (Onboarding) - Bảo vệ nghiêm ngặt */}
        <Route
          path="/onboarding"
          element={
            <ProviderOnboardingRoute>
              <ProviderOnboardingPage />
            </ProviderOnboardingRoute>
          }
        />
        <Route
          path="/provider/onboarding"
          element={
            <ProviderOnboardingRoute>
              <ProviderOnboardingPage />
            </ProviderOnboardingRoute>
          }
        />

        {/* Bảng điều khiển Quản trị viên (Admin) - Bảo vệ bằng ProtectedRoute */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Bảng điều khiển Nhà cung cấp (Provider) - Bảo vệ bằng ProtectedRoute */}
        <Route
          path="/provider/*"
          element={
            <ProtectedRoute allowedRoles={["provider", "admin"]}>
              <ProviderDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Điều hướng không gian Du khách sang trang Unsupported trên Web */}
        <Route path="/tourist/*" element={<Navigate to="/unsupported" replace />} />

        {/* Bất kỳ đường dẫn nào sai hoặc không tồn tại đều hiển thị trang 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
