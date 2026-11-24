import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertCircle, Eye, Search } from "lucide-react";
import ProviderLayout from "../layouts/ProviderLayout";
import Typography from "../../../components/ui/Typography";
import { Skeleton } from "../../../components/ui/Skeleton";
import { useDebouncedUrlSearch } from "../../../hooks/useDebouncedUrlSearch";
import { formatCurrencyVnd } from "../models/serviceFormModel";
import providerBookingApi from "../services/providerBookingApi";
import ProviderBookingDetailModal from "../components/ProviderBookingDetailModal";

const STATUS_TABS = [
  { id: "all", label: "Tất cả" },
  { id: "pending_payment", label: "Chờ thanh toán" },
  { id: "confirmed", label: "Đã xác nhận" },
  { id: "checked_in", label: "Đã check-in" },
  { id: "completed", label: "Hoàn thành" },
  { id: "cancelled", label: "Đã hủy" },
  { id: "refunded", label: "Đã hoàn tiền" },
];

const STATUS_BADGE_MAP = {
  pending_payment: { label: "Chờ thanh toán", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  confirmed: { label: "Đã xác nhận", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  checked_in: { label: "Đã check-in", cls: "bg-teal-50 text-teal-700 border-teal-200" },
  completed: { label: "Hoàn thành", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Đã hủy", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  refunded: { label: "Đã hoàn tiền", cls: "bg-violet-50 text-violet-700 border-violet-200" },
};

function formatDateVi(iso) {
  if (!iso) return "—";
  const parts = String(iso).slice(0, 10).split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(iso);
}

/**
 * Trang Quản lý Đơn đặt chỗ của Nhà cung cấp (/provider/bookings).
 */
export default function ProviderBookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "all";
  const [searchInput, setSearchInput, searchQuery] = useDebouncedUrlSearch(
    searchParams,
    setSearchParams,
  );

  const [bookings, setBookings] = useState([]);
  const [counts, setCounts] = useState({
    all: 0,
    pending_payment: 0,
    confirmed: 0,
    checked_in: 0,
    completed: 0,
    cancelled: 0,
    refunded: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [detailBooking, setDetailBooking] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const loadBookings = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await providerBookingApi.listBookings({
        status: statusFilter,
        q: searchQuery,
      });
      setBookings(Array.isArray(res?.data) ? res.data : []);
      if (res?.counts) setCounts(res.counts);
    } catch (err) {
      setErrorMsg(err?.message || "Không thể tải danh sách đơn đặt chỗ.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleStatusChange = (nextStatus) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("status", nextStatus);
      return next;
    });
  };

  const handleViewDetail = async (row) => {
    setDetailBooking(row);
    setIsLoadingDetail(true);
    try {
      const res = await providerBookingApi.getBookingDetail(row.id);
      if (res?.data) setDetailBooking(res.data);
    } catch (err) {
      setErrorMsg(err?.message || "Không thể tải chi tiết đơn đặt chỗ.");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  return (
    <ProviderLayout
      title="Đơn đặt chỗ của khách"
      subtitle="Theo dõi đơn đặt phòng, tour, lịch trình check-in và trạng thái thanh toán cọc."
    >
      <div className="space-y-5">
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Thanh lọc trạng thái & tìm kiếm */}
        <div className="bg-surface-elevated rounded-2xl border border-border-subtle p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_TABS.map((tab) => {
              const isActive = statusFilter === tab.id;
              const count = counts[tab.id] ?? 0;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleStatusChange(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? "bg-brand-primary text-white shadow-xs"
                      : "text-ink-body hover:bg-slate-100"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                      isActive ? "bg-white/25 text-white" : "bg-slate-100 text-ink-subtle"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-72">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm mã đơn, tên khách, SĐT..."
              className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-border-subtle bg-surface-base text-xs sm:text-sm text-ink-primary outline-hidden focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
            <Search className="w-4 h-4 text-ink-subtle absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Bảng danh sách đơn */}
        <div className="bg-surface-elevated rounded-2xl border border-border-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[860px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-border-subtle text-[11px] font-bold uppercase tracking-wider text-ink-subtle">
                  <th className="py-3 px-4 sm:px-6">Mã đơn</th>
                  <th className="py-3 px-4">Dịch vụ</th>
                  <th className="py-3 px-4">Khách hàng</th>
                  <th className="py-3 px-4">Lịch trình</th>
                  <th className="py-3 px-4">Thanh toán</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Thao tác</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border-subtle text-sm">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="py-4 px-4 sm:px-6">
                        <Skeleton className="h-5 w-28" rounded="rounded-md" />
                      </td>
                      <td className="py-4 px-4">
                        <Skeleton className="h-4 w-44 mb-1.5" rounded="rounded-md" />
                        <Skeleton className="h-3 w-24" rounded="rounded-md" />
                      </td>
                      <td className="py-4 px-4">
                        <Skeleton className="h-4 w-32 mb-1.5" rounded="rounded-md" />
                        <Skeleton className="h-3 w-24" rounded="rounded-md" />
                      </td>
                      <td className="py-4 px-4">
                        <Skeleton className="h-4 w-28" rounded="rounded-md" />
                      </td>
                      <td className="py-4 px-4">
                        <Skeleton className="h-4 w-24 mb-1.5" rounded="rounded-md" />
                        <Skeleton className="h-3 w-20" rounded="rounded-md" />
                      </td>
                      <td className="py-4 px-4">
                        <Skeleton className="h-6 w-24" rounded="rounded-full" />
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <Skeleton className="h-8 w-20 ml-auto" rounded="rounded-lg" />
                      </td>
                    </tr>
                  ))
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-ink-subtle">
                      <Typography variant="body" className="font-semibold text-ink-primary">
                        Chưa có đơn đặt chỗ nào
                      </Typography>
                      <Typography variant="caption" className="text-ink-subtle mt-1 block">
                        Các đơn đặt chỗ từ khách du lịch sẽ tự động xuất hiện tại đây.
                      </Typography>
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => {
                    const badge = STATUS_BADGE_MAP[b.status] || {
                      label: b.status,
                      cls: "bg-slate-100 text-slate-700 border-slate-200",
                    };
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-4 sm:px-6 font-mono font-bold text-xs text-ink-primary">
                          {b.booking_code}
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-semibold text-ink-primary line-clamp-1">
                            {b.service?.name || "—"}
                          </div>
                          {b.room_type?.name && (
                            <div className="text-xs text-brand-primary">{b.room_type.name}</div>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-medium text-ink-primary">{b.contact_name}</div>
                          <div className="text-xs text-ink-subtle">{b.contact_phone}</div>
                        </td>
                        <td className="py-4 px-4 text-xs text-ink-body">
                          <div>
                            {formatDateVi(b.start_date)}
                            {b.end_date && b.end_date !== b.start_date
                              ? ` → ${formatDateVi(b.end_date)}`
                              : ""}
                          </div>
                          <div className="text-ink-subtle">SL: {b.quantity || 1}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-bold text-ink-primary">
                            {formatCurrencyVnd(b.total_amount)}
                          </div>
                          <div className="text-xs text-brand-primary">
                            Cọc {b.deposit_rate}%: {formatCurrencyVnd(b.deposit_amount)}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.cls}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-4 px-4 sm:px-6 text-right">
                          <button
                            type="button"
                            onClick={() => handleViewDetail(b)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle bg-surface-base hover:bg-slate-100 text-xs font-semibold text-ink-primary cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Chi tiết</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ProviderBookingDetailModal
        booking={detailBooking}
        isLoadingDetail={isLoadingDetail}
        onClose={() => setDetailBooking(null)}
      />
    </ProviderLayout>
  );
}
