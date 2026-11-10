import React from "react";
import { Search } from "lucide-react";
import Typography from "../../../components/ui/Typography";

const FILTER_TABS = [
  { id: "all", label: "Tất cả" },
  { id: "pending", label: "Chờ duyệt" },
  { id: "approved", label: "Đã duyệt" },
  { id: "rejected", label: "Bị từ chối" },
];

/**
 * Bảng danh sách thẩm định hồ sơ Nhà cung cấp (task14.md)
 */
export default function ProviderKycTable({
  providers = [],
  isLoading = false,
  statusFilter = "all",
  onStatusFilterChange,
  searchQuery = "",
  onSearchChange,
  onViewDetail,
  onApproveQuick,
  onRequestReject,
  pendingCount = 0,
}) {
  return (
    <div className="bg-surface-elevated border border-border-subtle rounded-xl shadow-xs overflow-hidden">
      {/* Thanh công cụ: Bộ lọc tabs & Ô tìm kiếm */}
      <div className="p-4 sm:p-5 border-b border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Tabs lọc theo trạng thái */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {FILTER_TABS.map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onStatusFilterChange(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  isActive
                    ? "bg-brand-primary text-white shadow-xs"
                    : "text-ink-body hover:bg-slate-100"
                }`}
              >
                <span>{tab.label}</span>
                {tab.id === "pending" && pendingCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? "bg-white/25 text-white" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Ô tìm kiếm đối tác */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo tên, người đại diện, SĐT..."
            className="w-full pl-9 pr-3.5 py-1.5 rounded-lg border border-border-subtle bg-surface-base text-xs sm:text-sm text-ink-primary outline-hidden focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-colors"
          />
          <Search className="w-4 h-4 text-ink-subtle absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Danh sách dữ liệu bảng */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-border-subtle text-[11px] font-bold uppercase tracking-wider text-ink-subtle">
              <th className="py-3 px-4 sm:px-6">Cơ sở / Doanh nghiệp</th>
              <th className="py-3 px-4">Người đại diện</th>
              <th className="py-3 px-4">Loại hình</th>
              <th className="py-3 px-4">Hotline</th>
              <th className="py-3 px-4">Ngày nộp</th>
              <th className="py-3 px-4">Trạng thái</th>
              <th className="py-3 px-4 sm:px-6 text-right">Thao tác</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border-subtle text-sm">
            {isLoading ? (
              /* Skeleton Loading State */
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-4 sm:px-6">
                    <div className="h-4 bg-slate-200 rounded w-40 mb-1.5" />
                    <div className="h-3 bg-slate-100 rounded w-24" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-slate-200 rounded w-28" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-slate-200 rounded w-24" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-slate-200 rounded w-24" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-slate-200 rounded w-20" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-6 bg-slate-200 rounded-full w-20" />
                  </td>
                  <td className="py-4 px-4 sm:px-6 text-right">
                    <div className="h-8 bg-slate-200 rounded-lg w-20 ml-auto" />
                  </td>
                </tr>
              ))
            ) : providers.length === 0 ? (
              /* Empty State */
              <tr>
                <td colSpan={7} className="py-12 text-center text-ink-subtle">
                  <div className="max-w-xs mx-auto space-y-1">
                    <Typography variant="body" className="font-semibold text-ink-primary">
                      Không tìm thấy hồ sơ đối tác nào
                    </Typography>
                    <Typography variant="caption" className="text-ink-subtle">
                      Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.
                    </Typography>
                  </div>
                </td>
              </tr>
            ) : (
              /* Dữ liệu thực */
              providers.map((item) => {
                const formattedDate = item.created_at
                  ? new Date(item.created_at).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : "--";

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Tên cơ sở */}
                    <td className="py-4 px-4 sm:px-6">
                      <span className="font-semibold text-ink-primary block text-sm sm:text-base">
                        {item.business_name}
                      </span>
                      <span className="text-xs text-ink-subtle block line-clamp-1 max-w-xs">
                        {item.address || "Chưa cập nhật địa chỉ"}
                      </span>
                    </td>

                    {/* Người đại diện */}
                    <td className="py-4 px-4 text-ink-primary font-medium">
                      {item.representative_name || "--"}
                    </td>

                    {/* Loại hình */}
                    <td className="py-4 px-4 text-ink-body">
                      <span className="bg-slate-100 text-ink-body px-2.5 py-0.5 rounded text-xs font-medium">
                        {item.business_type_name || "Dịch vụ"}
                      </span>
                    </td>

                    {/* Hotline */}
                    <td className="py-4 px-4 font-mono text-xs sm:text-sm text-ink-primary">
                      {item.phone || "--"}
                    </td>

                    {/* Ngày nộp */}
                    <td className="py-4 px-4 text-xs text-ink-subtle">{formattedDate}</td>

                    {/* Trạng thái */}
                    <td className="py-4 px-4">
                      {item.status === "pending" && (
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Chờ duyệt
                        </span>
                      )}
                      {item.status === "approved" && (
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Đã phê duyệt
                        </span>
                      )}
                      {item.status === "rejected" && (
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Bị từ chối
                        </span>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td className="py-4 px-4 sm:px-6 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onViewDetail(item)}
                        className="px-3 py-1.5 rounded-lg border border-border-subtle bg-surface-elevated hover:bg-slate-100 text-ink-primary font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Xem hồ sơ
                      </button>

                      {item.status === "pending" && (
                        <>
                          <button
                            type="button"
                            onClick={() => onApproveQuick(item.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Duyệt
                          </button>
                          <button
                            type="button"
                            onClick={() => onRequestReject(item)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-status-danger border border-rose-200 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Từ chối
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer bảng: Tổng số hồ sơ */}
      {!isLoading && providers.length > 0 && (
        <div className="px-5 py-3 border-t border-border-subtle bg-slate-50/60 flex items-center justify-between text-xs text-ink-subtle">
          <span>
            Hiển thị <strong>{providers.length}</strong> hồ sơ đối tác
          </span>
          <span>Hệ thống tự động đồng bộ thời gian thực</span>
        </div>
      )}
    </div>
  );
}
