import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  TicketPercent,
  ShieldAlert,
  Settings,
  LogOut,
  Compass,
  Menu,
  X,
} from "lucide-react";
import Typography from "../../../components/ui/Typography";
import { useAuth } from "../../../hooks/useAuth";
import adminKycService from "../services/adminKycService";

/**
 * Danh mục điều hướng chuẩn cho toàn bộ phân hệ Quản trị viên
 */
const ADMIN_NAV_LINKS = [
  {
    id: "overview",
    label: "Tổng quan vận hành",
    path: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "providers",
    label: "Kiểm duyệt Nhà cung cấp",
    path: "/admin/providers",
    icon: Building2,
    hasKycBadge: true,
  },
  {
    id: "users",
    label: "Quản lý tài khoản",
    path: "/admin/users",
    icon: Users,
  },
  {
    id: "coupons",
    label: "Mã ưu đãi toàn sàn",
    path: "/admin/coupons",
    icon: TicketPercent,
  },
  {
    id: "reports",
    label: "Báo cáo cộng đồng",
    path: "/admin/reports",
    icon: ShieldAlert,
    badge: "2",
  },
  {
    id: "settings",
    label: "Cấu hình hệ thống",
    path: "/admin/settings",
    icon: Settings,
  },
];

/**
 * Component Thanh điều hướng bên trái (Sidebar) dùng chung cho toàn bộ phân hệ Admin:
 * - Tự động đánh dấu active theo đường dẫn URL hiện tại
 * - Hiển thị badge số lượng hồ sơ KYC chờ duyệt theo thời gian thực
 * - Hỗ trợ Responsive Drawer trên thiết bị di động
 * - Tích hợp thông tin tài khoản Admin và nút Đăng xuất an toàn
 */
export default function AdminSidebar({ pendingCount: customPendingCount }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [pendingCount, setPendingCount] = useState(customPendingCount ?? 0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Tự động nạp số lượng hồ sơ KYC chờ duyệt nếu cha không truyền vào
  useEffect(() => {
    if (customPendingCount !== undefined) {
      setPendingCount(customPendingCount);
      return;
    }

    let isMounted = true;
    adminKycService
      .fetchKycProviders({ status: "pending" })
      .then((res) => {
        if (!isMounted) return;
        if (res?.meta?.pending_count !== undefined) {
          setPendingCount(res.meta.pending_count);
        }
      })
      .catch((err) => {
        console.warn("[AdminSidebar] Fetch pending KYC error:", err.message);
      });

    return () => {
      isMounted = false;
    };
  }, [customPendingCount]);

  // Đóng mobile menu khi chuyển trang
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/auth", { replace: true });
    }
  };

  const isLinkActive = (item) => {
    const current = location.pathname;
    if (item.id === "overview") {
      return current === "/admin" || current === "/admin/dashboard";
    }
    if (item.id === "providers") {
      return current.startsWith("/admin/providers") || current.startsWith("/admin/kyc");
    }
    return current.startsWith(item.path);
  };

  const renderNavContent = () => (
    <div className="flex flex-col h-full justify-between">
      <div>
        {/* 1. Header Thương hiệu & Vai trò */}
        <div className="px-6 py-5 border-b border-border-subtle flex items-center justify-between">
          <Link to="/admin/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-brand-primary text-white flex items-center justify-center shrink-0 shadow-xs group-hover:bg-brand-hover transition-colors">
              <Compass className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <Typography
                variant="h3"
                className="text-base font-bold text-ink-primary truncate leading-tight group-hover:text-brand-primary transition-colors"
              >
                Trung tâm Quản trị
              </Typography>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-brand-light text-brand-hover text-[11px] font-semibold">
                Quản trị viên (Admin)
              </span>
            </div>
          </Link>

          {/* Nút đóng trên mobile */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-ink-subtle hover:text-ink-primary hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Danh mục Menu điều hướng */}
        <nav className="p-3 space-y-1">
          <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-ink-subtle block mb-1">
            Điều hành hệ thống
          </span>

          {ADMIN_NAV_LINKS.map((item) => {
            const Icon = item.icon;
            const active = isLinkActive(item);
            const badgeCount = item.hasKycBadge ? pendingCount : item.badge;

            return (
              <Link
                key={item.id}
                to={item.path}
                className={`w-full px-3.5 py-2.5 rounded-xl flex items-center justify-between text-sm transition-all cursor-pointer ${
                  active
                    ? "bg-brand-light/70 text-brand-hover font-bold shadow-xs border border-brand-primary/20"
                    : "text-ink-body hover:bg-slate-100/80 hover:text-ink-primary font-medium"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      active ? "text-brand-primary" : "text-ink-subtle"
                    }`}
                  />
                  <span>{item.label}</span>
                </span>

                {/* Badge số lượng thông báo */}
                {Boolean(badgeCount && Number(badgeCount) > 0) && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold transition-colors ${
                      item.hasKycBadge
                        ? active
                          ? "bg-amber-500 text-white"
                          : "bg-amber-100 text-amber-800"
                        : "bg-surface-elevated border border-border-subtle text-ink-primary"
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* 3. Footer: Thông tin Admin & Đăng xuất */}
      <div className="p-4 border-t border-border-subtle bg-slate-50/70">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-brand-primary/15 text-brand-primary border border-brand-primary/20 flex items-center justify-center font-bold text-sm shrink-0">
            {(user?.name || "A").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <Typography variant="body-sm" className="font-semibold text-ink-primary truncate">
              {user?.name || "Quản trị viên"}
            </Typography>
            <Typography variant="caption" className="text-xs text-ink-subtle truncate block">
              {user?.email || "admin@socialtravel.vn"}
            </Typography>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full py-2 px-3 rounded-lg border border-border-subtle bg-surface-elevated hover:bg-rose-50 hover:text-status-danger hover:border-rose-200 text-xs font-semibold text-ink-body flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Đăng xuất khỏi phiên</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Nút Hamburger bật Sidebar trên Mobile */}
      <div className="lg:hidden w-full bg-surface-elevated border-b border-border-subtle px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand-primary text-white flex items-center justify-center">
            <Compass className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-ink-primary">Trung tâm Quản trị</span>
        </div>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-1.5 rounded-lg border border-border-subtle text-ink-primary hover:bg-slate-100"
          aria-label="Mở menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Overlay Mobile */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden animate-in fade-in"
        />
      )}

      {/* Sidebar Mobile Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-surface-elevated border-r border-border-subtle transition-transform duration-300 lg:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {renderNavContent()}
      </aside>

      {/* Sidebar Cố định trên Desktop */}
      <aside className="hidden lg:flex w-64 bg-surface-elevated border-r border-border-subtle flex-col shrink-0 min-h-screen sticky top-0 h-screen">
        {renderNavContent()}
      </aside>
    </>
  );
}
