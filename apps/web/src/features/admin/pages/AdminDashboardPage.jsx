import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Clock, ArrowRight } from "lucide-react";
import AdminLayout from "../layouts/AdminLayout";
import Typography from "../../../components/ui/Typography";
import { useAuth } from "../../../hooks/useAuth";
import adminKycService from "../services/adminKycService";

/**
 * Screen Orchestrator: Trang Tổng quan vận hành Admin (Route: /admin/dashboard)
 * Sử dụng AdminLayout và thanh AdminSidebar dùng chung.
 */
export default function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [pendingProviders, setPendingProviders] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    adminKycService.fetchKycProviders({ status: "pending" }).then((res) => {
      setPendingProviders((res.data || []).slice(0, 3));
      if (res.meta?.pending_count !== undefined) {
        setPendingCount(res.meta.pending_count);
      }
    });
  }, []);

  return (
    <AdminLayout pendingCount={pendingCount}>
      <div className="space-y-8">
        <div>
          <Typography variant="h1">Chào mừng trở lại, {user?.name || "Quản trị viên"}</Typography>
          <Typography variant="body-sm" className="text-ink-subtle mt-1">
            Giám sát hoạt động đặt dịch vụ, kiểm duyệt đối tác lữ hành và điều tiết sàn giao dịch.
          </Typography>
        </div>

        {/* Chỉ số vận hành */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-border-subtle rounded-xl bg-surface-elevated divide-y sm:divide-y-0 sm:divide-x divide-border-subtle">
          <div
            onClick={() => navigate("/admin/providers")}
            className="p-5 cursor-pointer hover:bg-slate-50/80 transition-colors group"
          >
            <Typography variant="caption" className="block mb-1 group-hover:text-brand-primary">
              Đối tác chờ duyệt
            </Typography>
            <Typography variant="h1" className="text-brand-primary">
              {String(pendingCount).padStart(2, "0")}
            </Typography>
            <Typography variant="caption" className="text-amber-600 mt-1 block">
              Nhấn để vào trang kiểm duyệt →
            </Typography>
          </div>

          <div className="p-5">
            <Typography variant="caption" className="block mb-1">
              Đơn đặt chỗ tuần này
            </Typography>
            <Typography variant="h1">128</Typography>
            <Typography variant="caption" className="text-status-success mt-1 block">
              94% đã đối soát SePay
            </Typography>
          </div>

          <div className="p-5">
            <Typography variant="caption" className="block mb-1">
              Bài viết trải nghiệm mới
            </Typography>
            <Typography variant="h1">342</Typography>
            <Typography variant="caption" className="mt-1 block">
              68 bài gắn liên kết Affiliate
            </Typography>
          </div>

          <div className="p-5">
            <Typography variant="caption" className="block mb-1">
              Báo cáo vi phạm cần xử lý
            </Typography>
            <Typography variant="h1" className="text-status-danger">
              02
            </Typography>
            <Typography variant="caption" className="mt-1 block">
              Thuộc phân hệ bình luận MXH
            </Typography>
          </div>
        </div>

        {/* Danh sách đối tác chờ phê duyệt tóm tắt */}
        <section className="bg-surface-elevated border border-border-subtle rounded-xl overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
            <div>
              <Typography variant="h3">Hồ sơ đối tác mới nộp gần đây</Typography>
              <Typography variant="caption">
                Thẩm định giấy phép kinh doanh trước khi cho phép mở bán dịch vụ
              </Typography>
            </div>

            <button
              type="button"
              onClick={() => navigate("/admin/providers")}
              className="text-xs font-semibold text-brand-primary hover:text-brand-hover flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Xem tất cả hồ sơ ({pendingCount})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-border-subtle">
            {pendingProviders.length === 0 ? (
              <div className="p-8 text-center text-ink-subtle text-sm">
                Hiện tại không có hồ sơ nào đang chờ duyệt.
              </div>
            ) : (
              pendingProviders.map((item) => (
                <div
                  key={item.id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div>
                    <Typography variant="body" className="font-semibold text-ink-primary">
                      {item.business_name}
                    </Typography>
                    <Typography variant="caption" className="block mt-0.5">
                      Đại diện: {item.representative_name || "--"} · Loại hình:{" "}
                      {item.business_type_name || "Dịch vụ"} · Hotline: {item.phone}
                    </Typography>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-medium text-amber-700">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Chờ duyệt</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate("/admin/providers")}
                      className="px-3 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Thẩm định</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
