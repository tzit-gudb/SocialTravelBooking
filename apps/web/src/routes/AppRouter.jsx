import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import AuthPage from "../features/auth/pages/AuthPage";
import PlatformUnsupportedPage from "../features/auth/pages/PlatformUnsupportedPage";
import ProviderOnboardingPage from "../features/provider/pages/ProviderOnboardingPage";
import AdminDashboardPage from "../features/admin/pages/AdminDashboardPage";
import ProviderDashboardPage from "../features/provider/pages/ProviderDashboardPage";
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
 * Bảo vệ Route theo phân quyền (Role-based Guard)
 */
function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, isLoading, role, getDashboardRouteByRole } = useAuth();

  if (isLoading) return <LoadingScreen />;

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={getDashboardRouteByRole(role)} replace />;
  }

  return children;
}

/**
 * Tự động chuyển hướng khỏi trang /auth nếu đã đăng nhập
 */
function GuestRoute({ children }) {
  const { isAuthenticated, isLoading, role, getDashboardRouteByRole } = useAuth();

  if (isLoading) return <LoadingScreen />;

  if (isAuthenticated) {
    return <Navigate to={getDashboardRouteByRole(role)} replace />;
  }

  return children;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Trang Đăng nhập / Đăng ký */}
        <Route
          path="/auth"
          element={
            <GuestRoute>
              <AuthPage />
            </GuestRoute>
          }
        />

        {/* Trang thông báo giới hạn nền tảng 404 cho vai trò chưa hỗ trợ trên Web (ví dụ: Tourist) */}
        <Route path="/unsupported" element={<PlatformUnsupportedPage />} />

        {/* Trang Khởi tạo / Thiết lập hồ sơ Nhà cung cấp dịch vụ (Onboarding) */}
        <Route path="/onboarding" element={<ProviderOnboardingPage />} />
        <Route path="/provider/onboarding" element={<ProviderOnboardingPage />} />

        {/* Bảng điều khiển Quản trị viên (Admin) */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Bảng điều khiển Nhà cung cấp (Provider) */}
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

        {/* Điều hướng mặc định */}
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
