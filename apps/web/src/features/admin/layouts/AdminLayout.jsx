import React from "react";
import AdminSidebar from "../components/AdminSidebar";

/**
 * Layout dùng chung chuẩn cho toàn bộ các trang Quản trị viên (Admin)
 * Bao gồm thanh AdminSidebar bên trái và vùng làm việc nội dung chính bên phải.
 */
export default function AdminLayout({ children, pendingCount }) {
  return (
    <div className="min-h-screen bg-surface-base flex flex-col lg:flex-row">
      {/* Thanh điều hướng bên trái dùng chung */}
      <AdminSidebar pendingCount={pendingCount} />

      {/* Vùng nội dung chính của từng trang Admin */}
      <main className="flex-1 p-6 sm:p-8 lg:p-10 max-w-7xl w-full mx-auto overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
