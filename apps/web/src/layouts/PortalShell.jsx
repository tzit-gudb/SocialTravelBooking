import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Compass, LogOut } from "lucide-react";
import Typography from "../components/ui/Typography";
import { useAuth } from "../hooks/useAuth";

export default function PortalShell({
  portalTitle,
  portalBadge,
  navItems = [],
  activeTab,
  onSelectTab,
  children,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen bg-surface-base flex flex-col lg:flex-row">
      {/* Thanh điều hướng bên trái (Sidebar) */}
      <aside className="w-full lg:w-64 bg-surface-elevated border-b lg:border-b-0 lg:border-r border-border-subtle flex flex-col justify-between shrink-0">
        <div>
          {/* Thương hiệu */}
          <div className="px-6 py-5 border-b border-border-subtle flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-primary text-white flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <Typography variant="h3" className="truncate leading-tight">
                {portalTitle}
              </Typography>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-brand-light text-brand-hover text-[11px] font-semibold">
                {portalBadge}
              </span>
            </div>
          </div>

          {/* Danh mục điều hướng */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.path ? location.pathname === item.path : activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.path) {
                      navigate(item.path);
                    }
                    onSelectTab?.(item.id);
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-lg flex items-center justify-between text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-brand-light/60 text-brand-hover font-semibold"
                      : "text-ink-body hover:bg-surface-muted"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    {Icon && <Icon className="w-4 h-4" />}
                    <span>{item.label}</span>
                  </span>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-surface-elevated border border-border-subtle text-ink-primary font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Thông tin người dùng đang đăng nhập & Đăng xuất */}
        <div className="p-4 border-t border-border-subtle bg-surface-base/60">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-brand-primary/15 text-brand-primary flex items-center justify-center font-bold text-sm shrink-0">
              {(user?.name || "U").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <Typography variant="body-sm" className="font-semibold text-ink-primary truncate">
                {user?.name || "Người dùng"}
              </Typography>
              <Typography variant="caption" className="truncate block">
                {user?.email}
              </Typography>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2 px-3 rounded-lg border border-border-subtle bg-surface-elevated hover:bg-rose-50 hover:text-status-danger hover:border-rose-200 text-xs font-semibold text-ink-body flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất khỏi phiên</span>
          </button>
        </div>
      </aside>

      {/* Vùng nội dung chính */}
      <main className="flex-1 p-6 sm:p-8 lg:p-10 max-w-7xl w-full mx-auto overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
