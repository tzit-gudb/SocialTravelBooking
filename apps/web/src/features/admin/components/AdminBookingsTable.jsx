import React from "react";
import { Search } from "lucide-react";
import Typography from "../../../components/ui/Typography";
import { Skeleton } from "../../../components/ui/Skeleton";
import { formatCurrencyVnd } from "../../provider/models/serviceFormModel";

const STATUS_TABS = [
  { id: "all", label: "Tất cả" },
  { id: "pending_payment", label: "Chờ thanh toán" },
  { id: "confirmed", label: "Đã xác nhận" },
  { id: "checked_in", label: "Đã check-in" },
  { id: "completed", label: "Hoàn thành" },
  { id: "cancelled", label: "Đã hủy" },
];

const BOOKING_STATUS_BADGE = {
  pending_payment: {
    label: "Chờ thanh toán",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  confirmed: { label: "Đã xác nhận", className: "bg-sky-50 text-sky-700 border border-sky-200" },
  checked_in: {
    label: "Đã check-in",
    className: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  },
  completed: {
    label: "Hoàn thành",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  cancelled: { label: "Đã hủy", className: "bg-rose-50 text-rose-700 border border-rose-200" },
  refunded: {
    label: "Đã hoàn tiền",
    className: "bg-slate-100 text-ink-subtle border border-border-subtle",
  },
};

const PAYMENT_STATUS_LABELS = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  failed: "Thất bại",
  refunded: "Đã hoàn tiền",
};

function formatDateVi(iso) {
  if (!iso) return "--";
  const parts = String(iso).slice(0, 10).split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(iso);
}

/**
 * Bảng giám sát Đơn đặt chỗ & Đối soát — đồng bộ chuẩn UI Admin.
 */
export default function AdminBookingsTable({
  bookings = [],
  isLoading = false,
  statusFilter = "all",
  onStatusFilterChange,
  paymentFilter = "all",
  onPaymentFilterChange,
  searchQuery = "",
  onSearchChange,
  counts = { all: 0, pending_payment: 0, confirmed: 0, checked_in: 0, completed: 0, cancelled: 0 },
  onViewDetail,
}) {
  return (
    <div className="bg-surface-elevated border border-border-subtle rounded-xl shadow-xs overflow-hidden">
      {/* Thanh công cụ */}
      <div className="p-4 sm:p-5 border-b border-border-subtle flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0">
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.id;
            const tabCount = counts?.[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onStatusFilterChange?.(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  isActive
                    ? "bg-brand-primary text-white shadow-xs"
                    : "text-ink-body hover:bg-slate-100"
                }`}
              >
                <span>{tab.label}</span>
                {tabCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                      isActive ? "bg-white/25 text-white" : "bg-slate-100 text-ink-subtle"
                    }`}
                  >
                    {tabCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full xl:w-auto">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Tìm mã đơn, khách, dịch vụ..."
              className="w-full pl-9 pr-3.5 py-1.5 rounded-lg border border-border-subtle bg-surface-base text-xs sm:text-sm text-ink-primary outline-hidden focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-colors"
            />
            <Search className="w-4 h-4 text-ink-subtle absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <select
            value={paymentFilter}
            onChange={(e) => onPaymentFilterChange?.(e.target.value)}
            aria-label="Lọc theo trạng thái thanh toán"
            className="px-3 py-1.5 rounded-lg border border-border-subtle bg-surface-base text-xs sm:text-sm text-ink-primary outline-hidden focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-colors cursor-pointer"
          >
            <option value="all">Tất cả thanh toán</option>
            <option value="paid">Đã thanh toán</option>
            <option value="pending">Chờ thanh toán</option>
            <option value="failed">Thất bại</option>
            <option value="refunded">Đã hoàn tiền</option>
          </select>
        </div>
      </div>

      {/* Bảng dữ liệu */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-50/80 border-b border-border-subtle text-[11px] font-bold uppercase tracking-wider text-ink-subtle">
              <th className="py-3 px-4 sm:px-6">Mã đơn / Ngày sử dụng</th>
              <th className="py-3 px-4">Khách hàng</th>
              <th className="py-3 px-4">Dịch vụ / Nhà cung cấp dịch vụ</th>
              <th className="py-3 px-4">Tổng tiền & Thanh toán</th>
              <th className="py-3 px-4">Trạng thái đơn</th>
              <th className="py-3 px-4 sm:px-6 text-right">Thao tác</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border-subtle text-sm">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="py-4 px-4 sm:px-6">
                    <Skeleton className="h-4 w-28 mb-1.5" rounded="rounded-md" />
                    <Skeleton className="h-3 w-24" rounded="rounded-md" />
                  </td>
                  <td className="py-4 px-4">
                    <Skeleton className="h-4 w-32 mb-1.5" rounded="rounded-md" />
                    <Skeleton className="h-3 w-24" rounded="rounded-md" />
                  </td>
                  <td className="py-4 px-4">
                    <Skeleton className="h-4 w-44 mb-1.5" rounded="rounded-md" />
                    <Skeleton className="h-3 w-32" rounded="rounded-md" />
                  </td>
                  <td className="py-4 px-4">
                    <Skeleton className="h-4 w-24 mb-1.5" rounded="rounded-md" />
                    <Skeleton className="h-3 w-20" rounded="rounded-md" />
                  </td>
                  <td className="py-4 px-4">
                    <Skeleton className="h-6 w-24" rounded="rounded-full" />
                  </td>
                  <td className="py-4 px-4 sm:px-6 text-right">
                    <Skeleton className="h-8 w-24 ml-auto" rounded="rounded-lg" />
                  </td>
                </tr>
              ))
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-ink-subtle">
                  <div className="max-w-xs mx-auto space-y-1">
                    <Typography variant="body" className="font-semibold text-ink-primary">
                      Chưa có đơn đặt chỗ nào phù hợp
                    </Typography>
                    <Typography variant="caption" className="text-ink-subtle">
                      Thử thay đổi bộ lọc trạng thái hoặc tìm theo mã đặt chỗ khác.
                    </Typography>
                  </div>
                </td>
              </tr>
            ) : (
              bookings.map((b) => {
                const statusMeta = BOOKING_STATUS_BADGE[b.status] || BOOKING_STATUS_BADGE.confirmed;
                const payStatus = b.latest_payment?.status;
                const payLabel = payStatus
                  ? PAYMENT_STATUS_LABELS[payStatus] || payStatus
                  : "Chưa phát sinh";

                return (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-4 sm:px-6">
                      <span className="font-mono font-bold text-ink-primary block">
                        {b.booking_code}
                      </span>
                      <span className="text-xs text-ink-subtle block mt-0.5">
                        Sử dụng: {formatDateVi(b.start_date)}
                        {b.end_date && b.end_date !== b.start_date
                          ? ` → ${formatDateVi(b.end_date)}`
                          : ""}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-medium text-ink-primary block">{b.contact_name}</span>
                      <span className="text-xs font-mono text-ink-subtle">{b.contact_phone}</span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-medium text-ink-primary block line-clamp-1 max-w-xs">
                        {b.service?.name || "--"}
                      </span>
                      <span className="text-xs text-ink-subtle block">
                        {b.provider?.business_name || "--"}
                      </span>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-semibold text-ink-primary block">
                        {formatCurrencyVnd(b.total_amount)}
                      </span>
                      <span className="text-xs text-ink-subtle">{payLabel}</span>
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${statusMeta.className}`}
                      >
                        {statusMeta.label}
                      </span>
                    </td>

                    <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onViewDetail?.(b)}
                        className="px-3 py-1.5 rounded-lg border border-border-subtle bg-surface-elevated hover:bg-slate-100 text-ink-primary font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Đối soát
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && bookings.length > 0 && (
        <div className="px-5 py-3 border-t border-border-subtle bg-slate-50/60 flex items-center justify-between text-xs text-ink-subtle">
          <span>
            Hiển thị <strong>{bookings.length}</strong> đơn đặt chỗ
          </span>
          <span>Theo dõi dòng tiền thanh toán và giải ngân ký quỹ</span>
        </div>
      )}
    </div>
  );
}
