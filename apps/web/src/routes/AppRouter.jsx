import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import AuthPage from "../features/auth/pages/AuthPage";
import PlatformUnsupportedPage from "../features/auth/pages/PlatformUnsupportedPage";
import ProviderOnboardingPage from "../features/provider/pages/ProviderOnboardingPage";
import AdminDashboardPage from "../features/admin/pages/AdminDashboardPage";
import AdminProviderKycPage from "../features/admin/pages/AdminProviderKycPage";
import AdminServiceModerationPage from "../features/admin/pages/AdminServiceModerationPage";
import AdminUsersPage from "../features/admin/pages/AdminUsersPage";
import AdminCouponsPage from "../features/admin/pages/AdminCouponsPage";
import AdminSettingsPage from "../features/admin/pages/AdminSettingsPage";
import AdminCampaignsPage from "../features/admin/pages/AdminCampaignsPage";
import AdminReportsPage from "../features/admin/pages/AdminReportsPage";
import AdminBookingsPage from "../features/admin/pages/AdminBookingsPage";
import ProviderDashboardPage from "../features/provider/pages/ProviderDashboardPage";
import ProviderBookingsPage from "../features/provider/pages/ProviderBookingsPage";
import ProviderProfilePage from "../features/provider/pages/ProviderProfilePage";
import ServiceManagementPage from "../features/provider/pages/ServiceManagementPage";
import ProviderCampaignsPage from "../features/provider/pages/ProviderCampaignsPage";
import ServiceAvailabilityPage from "../features/provider/pages/ServiceAvailabilityPage";
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
 * - Nếu đã đăng nhập nhưng vai trò không nằm trong danh sách được phép -> Chuyển sang trang 404.
 */
function ProtectedRoute({ allowedRoles, allowUnapprovedProvider = false, children }) {
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
    !allowUnapprovedProvider &&
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

        {/* Phân hệ Quản trị viên (Admin) - Tách route riêng biệt */}
        {/* 1. Route Tổng quan vận hành */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* 2. Route riêng biệt: Kiểm duyệt Nhà cung cấp (KYC) */}
        <Route
          path="/admin/providers"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminProviderKycPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/kyc"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminProviderKycPage />
            </ProtectedRoute>
          }
        />

        {/* 3. Kiểm duyệt Dịch vụ du lịch (Task #46) */}
        <Route
          path="/admin/services"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminServiceModerationPage />
            </ProtectedRoute>
          }
        />

        {/* 4. Quản lý Tài khoản Người dùng (Task #52) */}
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />

        {/* 5. Quản lý Mã ưu đãi toàn sàn & Tặng mã (Task #53) */}
        <Route
          path="/admin/coupons"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminCouponsPage />
            </ProtectedRoute>
          }
        />

        {/* 5b. Chương trình khuyến mãi ngày lễ (Task #67) */}
        <Route
          path="/admin/campaigns"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminCampaignsPage />
            </ProtectedRoute>
          }
        />

        {/* 6. Cấu hình Hệ thống: Điểm đến, Danh mục, Loại hình (Task #54) */}
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminSettingsPage />
            </ProtectedRoute>
          }
        />

        {/* 7. Kiểm duyệt Nội dung & Báo cáo Cộng đồng (Task #55) */}
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminReportsPage />
            </ProtectedRoute>
          }
        />

        {/* 8. Giám sát Đơn đặt chỗ & Đối soát Ví (Task #56) */}
        <Route
          path="/admin/bookings"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminBookingsPage />
            </ProtectedRoute>
          }
        />

        {/* Route mặc định cho /admin -> Chuyển về /admin/dashboard */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Navigate to="/admin/dashboard" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Navigate to="/admin/dashboard" replace />
            </ProtectedRoute>
          }
        />

        {/* Phân hệ Nhà cung cấp dịch vụ (Provider) */}
        {/* 1. Quản lý hồ sơ đối tác kinh doanh / cá nhân (task8) */}
        <Route
          path="/provider/profile"
          element={
            <ProtectedRoute allowedRoles={["provider", "admin"]} allowUnapprovedProvider={true}>
              <ProviderProfilePage />
            </ProtectedRoute>
          }
        />

        {/* 2. Quản lý Tour & Dịch vụ du lịch (task16) */}
        <Route
          path="/provider/services"
          element={
            <ProtectedRoute allowedRoles={["provider", "admin"]}>
              <ServiceManagementPage />
            </ProtectedRoute>
          }
        />

        {/* 2c. Tham gia Chương trình khuyến mãi ngày lễ (Task #68) */}
        <Route
          path="/provider/campaigns"
          element={
            <ProtectedRoute allowedRoles={["provider", "admin"]}>
              <ProviderCampaignsPage />
            </ProtectedRoute>
          }
        />

        {/* 2b. Cấu hình Lịch phục vụ & Bảng giá theo ngày (task17) */}
        <Route
          path="/provider/services/:id/availability"
          element={
            <ProtectedRoute allowedRoles={["provider", "admin"]}>
              <ServiceAvailabilityPage />
            </ProtectedRoute>
          }
        />

        {/* 3. Đơn đặt chỗ của khách (Provider) */}
        <Route
          path="/provider/bookings"
          element={
            <ProtectedRoute allowedRoles={["provider", "admin"]}>
              <ProviderBookingsPage />
            </ProtectedRoute>
          }
        />

        {/* 4. Bảng điều hành tổng quan */}
        <Route
          path="/provider/dashboard"
          element={
            <ProtectedRoute allowedRoles={["provider", "admin"]}>
              <ProviderDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Điều hướng mặc định cho /provider -> /provider/dashboard */}
        <Route
          path="/provider"
          element={
            <ProtectedRoute allowedRoles={["provider", "admin"]}>
              <Navigate to="/provider/dashboard" replace />
            </ProtectedRoute>
          }
        />

        {/* Fallback các route khác của provider về ProviderDashboardPage */}
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
